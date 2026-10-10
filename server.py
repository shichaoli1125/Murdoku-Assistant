#!/usr/bin/env python3
"""Murdoku server: static hosting + online shared progress (rooms) + SSE sync.

Zero third-party dependencies (Python 3 standard library only). This is the
production counterpart of server.cjs; the HTTP API and behaviour are identical:

    GET  /                     static files
    GET  /api/health           {"ok": true}
    GET  /api/state/<room>     current shared state JSON
    GET  /api/events/<room>    Server-Sent Events live stream
    POST /api/state/<room>     publish shared state {"v":..,"state":{..}}

Env / defaults: PORT=80 (or MDK_PORT), HOST=0.0.0.0, MDK_DATA_DIR=./data.
"""
import json
import os
import re
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT") or os.environ.get("MDK_PORT") or 80)
HOST = os.environ.get("HOST", "0.0.0.0")
DATA_DIR = os.path.abspath(os.environ.get("MDK_DATA_DIR") or os.path.join(ROOT, "data"))
os.makedirs(DATA_DIR, exist_ok=True)

TYPES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
    ".pdf": "application/pdf", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8",
}

EMPTY = {
    "placed": {}, "notes": {}, "cross": [], "marks": {}, "target": None,
    "done": [], "eliminated": [], "memo": "", "cellMemo": {},
}

ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,60}$")
CELL_RE = re.compile(r"^\d+$")


def is_obj(x):
    return isinstance(x, dict)


def sanitize(value):
    """Keep only shareable, expected-shape fields. Returns a new dict or None."""
    if not is_obj(value):
        return None

    def cell_keyed(m, kind):
        out = {}
        if is_obj(m):
            for k, v in m.items():
                key = str(k)
                if not CELL_RE.match(key):
                    continue
                if kind == "strArr" and isinstance(v, list):
                    vals = [x for x in v if isinstance(x, str)]
                    out[key] = list(dict.fromkeys(vals))[:64]
                elif kind == "str" and isinstance(v, str):
                    out[key] = v
        return out

    placed = {}
    if is_obj(value.get("placed")):
        for k, v in value["placed"].items():
            key = str(k)
            if not ID_RE.match(key) or key == "__proto__":
                continue
            if isinstance(v, int) and not isinstance(v, bool):
                placed[key] = v

    def str_list(name, limit):
        v = value.get(name)
        if not isinstance(v, list):
            return []
        return list(dict.fromkeys(x for x in v if isinstance(x, str)))[:limit]

    cross = [x for x in (value.get("cross") if isinstance(value.get("cross"), list) else [])
             if isinstance(x, int) and not isinstance(x, bool)]
    cross = list(dict.fromkeys(cross))[:4096]

    target = value.get("target")
    target = target if isinstance(target, int) and not isinstance(target, bool) else None

    memo = value.get("memo")
    memo = memo[:100000] if isinstance(memo, str) else ""

    return {
        "placed": placed,
        "notes": cell_keyed(value.get("notes"), "strArr"),
        "marks": cell_keyed(value.get("marks"), "str"),
        "cellMemo": cell_keyed(value.get("cellMemo"), "str"),
        "cross": cross,
        "done": str_list("done", 4096),
        "eliminated": str_list("eliminated", 1024),
        "target": target,
        "memo": memo,
    }


# ---- room store -----------------------------------------------------------
class Room:
    __slots__ = ("v", "state", "mtime")

    def __init__(self):
        self.v = 0
        self.state = json.loads(json.dumps(EMPTY))
        self.mtime = 0


ROOMS = {}
SUBS = {}
LOCK = threading.RLock()


def room_file(room_id):
    return os.path.join(DATA_DIR, urllib_quote(room_id) + ".json")


def urllib_quote(s):
    from urllib.parse import quote
    return quote(s, safe="")


def load_room(room_id):
    with LOCK:
        if room_id in ROOMS:
            return ROOMS[room_id]
        room = Room()
        try:
            with open(room_file(room_id), "r", encoding="utf-8") as f:
                raw = json.load(f)
            if isinstance(raw, dict):
                room.v = int(raw.get("v") or 0)
                clean = sanitize(raw.get("state"))
                if clean is not None:
                    room.state = clean
                room.mtime = int(raw.get("mtime") or 0)
        except (FileNotFoundError, ValueError, OSError):
            pass
        ROOMS[room_id] = room
        return room


def persist(room_id, room):
    room.mtime = int(time.time() * 1000)
    payload = json.dumps({"v": room.v, "state": room.state, "mtime": room.mtime})
    tmp = room_file(room_id) + ".tmp"

    def write():
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(payload)
            os.replace(tmp, room_file(room_id))
        except OSError as exc:
            print("persist failed:", exc, file=sys.stderr)

    threading.Thread(target=write, daemon=True).start()


def broadcast(room_id, room):
    with LOCK:
        clients = list(SUBS.get(room_id, ()))
    data = ("event:state\ndata:" +
            json.dumps({"v": room.v, "state": room.state, "mtime": room.mtime}) +
            "\n\n")
    dead = []
    for q in clients:
        if not q.put(data):
            dead.append(q)
    if dead:
        with LOCK:
            for q in dead:
                SUBS.get(room_id, set()).discard(q)


# ---- SSE per-client queue -------------------------------------------------
class Client:
    def __init__(self):
        self.cond = threading.Condition()
        self.queue = []
        self.closed = False

    def put(self, item):
        with self.cond:
            if self.closed:
                return False
            self.queue.append(item)
            self.cond.notify()
        return True

    def get(self, timeout=25):
        with self.cond:
            if not self.queue:
                self.cond.wait(timeout)
            if self.queue:
                return self.queue.pop(0)
            return None

    def close(self):
        with self.cond:
            self.closed = True
            self.cond.notify_all()


# ---- HTTP handler ---------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    server_version = "Murdoku/1.0"

    def log_message(self, fmt, *args):
        pass  # quiet

    def _json(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._route(read=False)

    def do_HEAD(self):
        self._route(read=True)

    def do_POST(self):
        from urllib.parse import urlparse, unquote
        parsed = urlparse(self.path)
        pname = unquote(parsed.path)

        m = re.match(r"^/api/state/([^/]+)$", pname)
        if not m:
            self._json(404, {"error": "not found"})
            return
        room_id = m.group(1)
        length = int(self.headers.get("Content-Length") or 0)
        if length > 2 * 1024 * 1024:
            self._json(413, {"error": "payload too large"})
            return
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._json(400, {"error": "bad json"})
            return
        clean = sanitize(payload.get("state") if isinstance(payload, dict) else None)
        if clean is None:
            self._json(400, {"error": "invalid state"})
            return
        base_v = payload.get("v")
        try:
            base_v = int(base_v)
        except (TypeError, ValueError):
            base_v = 0
        with LOCK:
            room = load_room(room_id)
            room.v += 1
            room.state = clean
            persist(room_id, room)
        broadcast(room_id, room)
        self._json(200, {"v": room.v, "state": room.state})

    def _route(self, read):
        from urllib.parse import urlparse, unquote
        parsed = urlparse(self.path)
        pname = unquote(parsed.path)

        if pname.startswith("/api/"):
            if pname == "/api/health":
                self._json(200, {"ok": True, "rooms": len(ROOMS)})
                return
            m_state = re.match(r"^/api/state/([^/]+)$", pname)
            m_events = re.match(r"^/api/events/([^/]+)$", pname)
            if m_state:
                room = load_room(m_state.group(1))
                self._json(200, {"v": room.v, "state": room.state, "mtime": room.mtime})
                return
            if m_events:
                self._sse(m_events.group(1))
                return
            self._json(404, {"error": "not found"})
            return

        # static
        rel = "/index.html" if pname == "/" else pname
        file_path = os.path.normpath(os.path.join(ROOT, rel.lstrip("/")))
        if not file_path.startswith(ROOT + os.sep) and file_path != ROOT:
            self.send_error(403, "Forbidden")
            return
        try:
            st = os.stat(file_path)
            if not os.path.isfile(file_path):
                raise OSError
        except OSError:
            self.send_error(404, "Not found")
            return
        ext = os.path.splitext(file_path)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", TYPES.get(ext, "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(st.st_size))
        self.end_headers()
        if read:
            return
        try:
            with open(file_path, "rb") as f:
                while True:
                    chunk = f.read(64 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _sse(self, room_id):
        room = load_room(room_id)
        client = Client()
        with LOCK:
            SUBS.setdefault(room_id, set()).add(client)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-store, no-transform")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            self.wfile.write(b"retry:2000\n\n")
            first = ("event:state\ndata:" +
                     json.dumps({"v": room.v, "state": room.state, "mtime": room.mtime}) +
                     "\n\n").encode("utf-8")
            self.wfile.write(first)
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            client.close()
            return
        last_ping = time.time()
        try:
            while True:
                item = client.get(25)
                if item is not None:
                    self.wfile.write(item.encode("utf-8"))
                    self.wfile.flush()
                else:
                    now = time.time()
                    if now - last_ping >= 25:
                        self.wfile.write(b":ping\n\n")
                        self.wfile.flush()
                        last_ping = now
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            client.close()
            with LOCK:
                SUBS.get(room_id, set()).discard(client)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Murdoku sync server listening on {HOST}:{PORT}")
    print(f"data dir: {DATA_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

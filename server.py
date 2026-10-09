#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Murdoku Assistant —— 多人联机后端（零第三方依赖，仅需 Python 3.6+）

职责：
  1. 托管静态页面（index.html / js / css），单端口即可访问；
  2. 保存每个案件的共享做题进度（落盘 JSON，重启不丢）；
  3. 提供实时同步：
       GET  /api/state/<caseId>          读取共享进度
       POST /api/state/<caseId>          提交完整进度（服务端自增版本并广播）
       GET  /api/events/<caseId>         SSE 长连接，接收他人更新推送

冲突策略：最后写入为准（last-write-wins）+ 实时广播，最终一致。
"""

import json
import os
import re
import threading
import time
import queue
import mimetypes
from http.server import BaseHTTPRequestHandler
from http.server import HTTPServer
from socketserver import ThreadingMixIn

# ---------- 基本配置 ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("MDK_DATA_DIR", os.path.join(BASE_DIR, "data"))
HOST = os.environ.get("MDK_HOST", "0.0.0.0")
PORT = int(os.environ.get("MDK_PORT", "80"))
CASE_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")

os.makedirs(DATA_DIR, exist_ok=True)

# ---------- 每个案件的状态、锁、SSE 订阅者 ----------
class CaseRoom:
    def __init__(self):
        self.lock = threading.Lock()
        self.version = 0
        self.cells = {}
        self.subscribers = []   # list of queue.Queue


ROOMS = {}
ROOMS_GUARD = threading.Lock()


def get_room(case_id):
    with ROOMS_GUARD:
        room = ROOMS.get(case_id)
        if room is None:
            room = CaseRoom()
            ROOMS[case_id] = room
            _load_from_disk(case_id, room)
        return room


def _state_path(case_id):
    return os.path.join(DATA_DIR, case_id + ".json")


def _load_from_disk(case_id, room):
    path = _state_path(case_id)
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        room.version = int(data.get("version", 0))
        room.cells = data.get("cells", {}) or {}
    except Exception:
        # 文件损坏不影响启动
        pass


def _save_to_disk(case_id, room):
    path = _state_path(case_id)
    tmp = path + ".tmp"
    payload = json.dumps(
        {"version": room.version, "cells": room.cells},
        ensure_ascii=False,
    )
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(payload)
    os.replace(tmp, path)


def _broadcast(room, event):
    dead = []
    for q in list(room.subscribers):
        try:
            q.put_nowait(event)
        except Exception:
            dead.append(q)
    for q in dead:
        try:
            room.subscribers.remove(q)
        except ValueError:
            pass


# ---------- 静态文件 ----------
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".map": "application/json; charset=utf-8",
}


def safe_static_path(url_path):
    # 去掉查询串
    url_path = url_path.split("?", 1)[0].split("#", 1)[0]
    if url_path == "" or url_path == "/":
        rel = "index.html"
    else:
        rel = url_path.lstrip("/")
    # 规范化并防止目录穿越
    target = os.path.normpath(os.path.join(BASE_DIR, rel))
    if target != BASE_DIR and not target.startswith(BASE_DIR + os.sep):
        return None
    return target


# ---------- HTTP Handler ----------
class Handler(BaseHTTPRequestHandler):
    server_version = "MurdokuSync/1.0"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        # 简洁日志（可按需打开）
        pass

    # ---- 工具 ----
    def _send_json(self, obj, status=200, extra_headers=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _match_api(self, prefix):
        p = self.path.split("?", 1)[0]
        tag = prefix
        if p.startswith(tag):
            case_id = p[len(tag):]
            if CASE_ID_RE.match(case_id or ""):
                return case_id
        return None

    # ---- 路由 ----
    def do_GET(self):
        case_id = self._match_api("/api/state/")
        if case_id is not None:
            return self._handle_get_state(case_id)

        case_id = self._match_api("/api/events/")
        if case_id is not None:
            return self._handle_sse(case_id)

        return self._handle_static()

    def do_POST(self):
        case_id = self._match_api("/api/state/")
        if case_id is None:
            self._send_json({"error": "not found"}, status=404)
            return
        return self._handle_post_state(case_id)

    # ---- API: 读取状态 ----
    def _handle_get_state(self, case_id):
        room = get_room(case_id)
        with room.lock:
            self._send_json({"version": room.version, "cells": room.cells})

    # ---- API: 提交状态 ----
    def _handle_post_state(self, case_id):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0 or length > 2_000_000:
            self._send_json({"error": "bad length"}, status=400)
            return
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
            cells = data.get("cells")
            if not isinstance(cells, dict):
                raise ValueError("cells must be an object")
            # 轻量校验：key 形如 "r,c"，值为对象
            clean = {}
            for k, v in cells.items():
                if not re.match(r"^\d{1,3},\d{1,3}$", str(k)):
                    continue
                if not isinstance(v, dict):
                    continue
                placed = v.get("placed")
                notes = v.get("notes", [])
                xflag = bool(v.get("x"))
                if placed is not None and not (isinstance(placed, str) and len(placed) <= 4):
                    placed = None
                if not isinstance(notes, list):
                    notes = []
                notes = [n for n in notes if isinstance(n, str) and len(n) <= 4][:9]
                clean[k] = {"placed": placed, "notes": notes, "x": xflag}
        except Exception:
            self._send_json({"error": "bad json"}, status=400)
            return

        room = get_room(case_id)
        with room.lock:
            room.version += 1
            room.cells = clean
            try:
                _save_to_disk(case_id, room)
            except Exception:
                pass
            event = {
                "type": "update",
                "version": room.version,
                "cells": room.cells,
            }
            _broadcast(room, event)
            self._send_json({"version": room.version, "cells": room.cells})

    # ---- SSE ----
    def _handle_sse(self, case_id):
        room = get_room(case_id)
        q = queue.Queue()
        with room.lock:
            snapshot = {"version": room.version, "cells": room.cells}
            room.subscribers.append(q)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        def write(payload):
            self.wfile.write(payload)
            self.wfile.flush()

        try:
            # 连接建立先推一次当前全量，避免漏掉
            write(("data: " + json.dumps(
                {"type": "snapshot", "version": snapshot["version"],
                 "cells": snapshot["cells"]}, ensure_ascii=False) + "\n\n").encode("utf-8"))

            while True:
                try:
                    event = q.get(timeout=15)
                except queue.Empty:
                    write(b": ping\n\n")
                    continue
                write(("data: " + json.dumps(event, ensure_ascii=False) + "\n\n").encode("utf-8"))
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            pass
        finally:
            with room.lock:
                try:
                    room.subscribers.remove(q)
                except ValueError:
                    pass

    # ---- 静态 ----
    def _handle_static(self):
        target = safe_static_path(self.path)
        if target and os.path.isfile(target):
            try:
                with open(target, "rb") as f:
                    body = f.read()
            except Exception:
                self._send_plain(500, b"read error")
                return
            ext = os.path.splitext(target)[1].lower()
            ctype = CONTENT_TYPES.get(ext) or mimetypes.guess_type(target)[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            # HTML 不缓存，静态资源可短缓存
            if ext == ".html":
                self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)
        else:
            # SPA 兜底：未知路径回首页
            idx = os.path.join(BASE_DIR, "index.html")
            if os.path.isfile(idx):
                with open(idx, "rb") as f:
                    body = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            else:
                self._send_plain(404, b"not found")

    def _send_plain(self, status, body):
        self.send_response(status)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print("Murdoku sync server listening on %s:%d" % (HOST, PORT), flush=True)
    print("data dir: %s" % DATA_DIR, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

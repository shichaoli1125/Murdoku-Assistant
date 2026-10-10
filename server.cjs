// Murdoku server: static hosting + online shared progress (rooms) + SSE live sync.
// Zero dependencies (Node built-ins only).
//
//   GET  /                              -> static files
//   GET  /api/state/:room               -> current shared state JSON
//   GET  /api/events/:room              -> Server-Sent Events live stream
//   POST /api/state/:room               -> publish shared state {v, state, client}
//   GET  /api/health                    -> { ok:true }
//
// Env: PORT (default 4173), HOST (default 0.0.0.0), MDK_DATA_DIR (default ./data).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const dataDir = path.resolve(process.env.MDK_DATA_DIR || path.join(root, 'data'));
fs.mkdirSync(dataDir, { recursive: true });

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};

// ---- room store -----------------------------------------------------------
// rooms: roomId -> { v, state, mtime }
const rooms = new Map();
// subs: roomId -> Set<res>
const subs = new Map();

const EMPTY = {
  placed: {}, notes: {}, cross: [], marks: {}, target: null,
  done: [], eliminated: [], memo: '', cellMemo: {},
};

function roomFile(id) {
  return path.join(dataDir, encodeURIComponent(id) + '.json');
}

function loadRoom(id) {
  if (rooms.has(id)) return rooms.get(id);
  let rec = { v: 0, state: structuredClone(EMPTY), mtime: 0 };
  try {
    const raw = JSON.parse(fs.readFileSync(roomFile(id), 'utf8'));
    if (raw && typeof raw === 'object') {
      rec = {
        v: Number(raw.v) || 0,
        state: sanitize(raw.state) || structuredClone(EMPTY),
        mtime: Number(raw.mtime) || 0,
      };
    }
  } catch { /* new room */ }
  rooms.set(id, rec);
  return rec;
}

function persist(id, rec) {
  rec.mtime = Date.now();
  const tmp = roomFile(id) + '.tmp';
  fs.writeFile(tmp, JSON.stringify(rec), err => {
    if (err) { console.error('write failed', err); return; }
    fs.rename(tmp, roomFile(id), e => { if (e) console.error('rename failed', e); });
  });
}

function broadcast(id, rec) {
  const set = subs.get(id);
  if (!set || !set.size) return;
  const data = `event:state\ndata:${JSON.stringify({ v: rec.v, state: rec.state, mtime: rec.mtime })}\n\n`;
  for (const res of set) { try { res.write(data); } catch { /* gone */ } }
}

// ---- state validation -----------------------------------------------------
function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

// Keep only the shareable, expected-shape fields. Returns a fresh object.
function sanitize(input) {
  if (!isObj(input)) return null;
  // Map keyed by cell index (notes / marks / cellMemo).
  const cellKeyed = (m, kind) => {
    const out = {};
    if (isObj(m)) for (const [k, v] of Object.entries(m)) {
      const key = String(k);
      if (!/^\d+$/.test(key)) continue;
      if (kind === 'strArr' && Array.isArray(v)) out[key] = [...new Set(v.filter(x => typeof x === 'string'))].slice(0, 64);
      else if (kind === 'str' && typeof v === 'string') out[key] = v;
    }
    return out;
  };
  // placed is keyed by person id (non-numeric string), value is a cell index.
  const placed = {};
  if (isObj(input.placed)) for (const [k, v] of Object.entries(input.placed)) {
    const key = String(k);
    if (!/^[A-Za-z0-9_-]{1,60}$/.test(key) || key === '__proto__') continue;
    if (typeof v === 'number' && Number.isInteger(v)) placed[key] = v;
  }
  const out = {
    placed,
    notes: cellKeyed(input.notes, 'strArr'),
    marks: cellKeyed(input.marks, 'str'),
    cellMemo: cellKeyed(input.cellMemo, 'str'),
    cross: Array.isArray(input.cross) ? [...new Set(input.cross.filter(x => Number.isInteger(x)))].slice(0, 4096) : [],
    done: Array.isArray(input.done) ? [...new Set(input.done.filter(x => typeof x === 'string'))].slice(0, 4096) : [],
    eliminated: Array.isArray(input.eliminated) ? [...new Set(input.eliminated.filter(x => typeof x === 'string'))].slice(0, 1024) : [],
    target: Number.isInteger(input.target) ? input.target : null,
    memo: typeof input.memo === 'string' ? input.memo.slice(0, 100000) : '',
  };
  return out;
}

// ---- helpers --------------------------------------------------------------
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---- server ---------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400); res.end('Invalid URL'); return; }
  const pname = decodeURIComponent(url.pathname);

  // API routes
  if (pname.startsWith('/api/')) {
    // GET /api/health
    if (pname === '/api/health') { sendJSON(res, 200, { ok: true, rooms: rooms.size }); return; }

    const stateMatch = pname.match(/^\/api\/state\/([^/]+)$/);
    const eventsMatch = pname.match(/^\/api\/events\/([^/]+)$/);

    // GET /api/state/:room
    if (stateMatch && req.method === 'GET') {
      const rec = loadRoom(stateMatch[1]);
      sendJSON(res, 200, { v: rec.v, state: rec.state, mtime: rec.mtime });
      return;
    }

    // POST /api/state/:room
    if (stateMatch && req.method === 'POST') {
      const id = stateMatch[1];
      let payload;
      try { payload = JSON.parse(await readBody(req)); }
      catch (e) { sendJSON(res, 400, { error: e.message || 'bad json' }); return; }
      const clean = sanitize(payload.state);
      if (!clean) { sendJSON(res, 400, { error: 'invalid state' }); return; }
      const rec = loadRoom(id);
      const baseV = Number(payload.v);
      // The publishing client sends its complete shareable snapshot; the server
      // adopts it as the canonical room state (last-write-wins). This lets
      // erasures/edits propagate, unlike a union merge. All connected clients
      // converge to the same board via the broadcast below.
      rec.v += 1;
      rec.state = clean;
      persist(id, rec);
      broadcast(id, rec);
      sendJSON(res, 200, { v: rec.v, state: rec.state, conflict: Number.isFinite(baseV) && baseV !== 0 && baseV < rec.v - 1 });
      return;
    }

    // GET /api/events/:room  (SSE)
    if (eventsMatch && req.method === 'GET') {
      const id = eventsMatch[1];
      const rec = loadRoom(id);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry:2000\n\n');
      res.write(`event:state\ndata:${JSON.stringify({ v: rec.v, state: rec.state, mtime: rec.mtime })}\n\n`);
      if (!subs.has(id)) subs.set(id, new Set());
      subs.get(id).add(res);
      const beat = setInterval(() => { try { res.write(':ping\n\n'); } catch { /* */ } }, 25000);
      req.on('close', () => { clearInterval(beat); subs.get(id)?.delete(res); });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end('{"error":"not found"}');
    return;
  }

  // Static files
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const file = path.resolve(root, '.' + (pname === '/' ? '/index.html' : pname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', err => {
  console.error(err.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Use a different PORT.` : err);
  process.exit(1);
});
server.listen(port, host, () => {
  console.log(`Murdoku server on http://${host}:${port}\nStatic root: ${root}\nShared data:   ${dataDir}`);
});

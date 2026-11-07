// server.js - 輕量本地 HTTP 伺服器 (Node.js 原生零依賴)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const sseClients = new Set();
const MAX_BROADCAST_BYTES = 64 * 1024;
// 同時連線的即時頻道上限，避免被大量連線拖垮
const MAX_SSE_CLIENTS = Number(process.env.MAX_SSE_CLIENTS) || 200;
// 每個來源的廣播頻率上限（令牌桶）：平時每秒最多 20 則，可短暫累積到 40 則（分身走動約每秒 8 則）
const BROADCAST_RATE_PER_SEC = 20;
const BROADCAST_BURST = 40;
// 部署在 Render 等反向代理後面時設 TRUST_PROXY=1，才用 X-Forwarded-For 辨識來源
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
// 伺服器端檔案與開發用資料夾，不對外提供
const BLOCKED_FILES = new Set(['server.js', 'package.json', 'package-lock.json', 'render.yaml']);
const BLOCKED_DIRS = new Set(['node_modules', 'tests', 'tools']);
const buckets = new Map();

function clientKey(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function allowBroadcast(key) {
  const now = Date.now();
  const b = buckets.get(key) || { tokens: BROADCAST_BURST, at: now };
  b.tokens = Math.min(BROADCAST_BURST, b.tokens + ((now - b.at) / 1000) * BROADCAST_RATE_PER_SEC);
  b.at = now;
  const ok = b.tokens >= 1;
  if (ok) b.tokens -= 1;
  buckets.set(key, b);
  return ok;
}

// 定期清掉閒置來源的計數，避免記憶體無限增加
setInterval(() => {
  const cutoff = Date.now() - 60000;
  buckets.forEach((b, k) => { if (b.at < cutoff) buckets.delete(k); });
}, 60000).unref();

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 0. 連線偵測：前端用來判斷有沒有伺服器（放在靜態空間時沒有，就改為單機模式）
  if (req.url === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end('{"ok":true}');
    return;
  }

  // 1. 即時連線 SSE 頻道 (供跨裝置/區域網路多人分身同頻)
  if (req.url === '/api/events') {
    if (sseClients.size >= MAX_SSE_CLIENTS) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=UTF-8', 'Retry-After': '30' });
      res.end('503 同時連線人數已滿');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 2. 廣播分身與科儀訊息 API
  if (req.url === '/api/broadcast' && req.method === 'POST') {
    if (!allowBroadcast(clientKey(req))) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
      res.end('{"ok":false,"error":"too many messages"}');
      req.resume();
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BROADCAST_BYTES) {
        // 告知對方這條連線要關閉，避免用戶端重複使用已切斷的連線
        res.writeHead(413, { 'Connection': 'close' });
        res.end();
        req.destroy();
      }
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      // 只轉發合法 JSON，並重新序列化：內容裡夾帶換行就無法偽造出額外的 SSE 事件
      let line;
      try {
        line = JSON.stringify(JSON.parse(body));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"ok":false,"error":"invalid json"}');
        return;
      }
      sseClients.forEach(client => {
        try {
          client.write(`data: ${line}\n\n`);
        } catch (e) {}
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }

  // 3. 靜態檔案：去掉 query、解碼，並限制只能讀專案資料夾內的檔案
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('400 錯誤的請求');
    return;
  }
  const filePath = path.resolve(__dirname, '.' + (urlPath === '/' ? '/index.html' : urlPath));
  const relPath = path.relative(__dirname, filePath);
  const segments = relPath.split(path.sep);
  const blocked = relPath.startsWith('..') || path.isAbsolute(relPath) ||
    segments.some(seg => seg.startsWith('.')) ||
    BLOCKED_FILES.has(relPath) || BLOCKED_DIRS.has(segments[0]);
  if (blocked) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('403 禁止存取');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 找不到檔案');
      } else {
        res.writeHead(500);
        res.end(`伺服器錯誤: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`✨ 虛擬神殿 本地伺服器已啟動: http://localhost:${PORT}`);
});


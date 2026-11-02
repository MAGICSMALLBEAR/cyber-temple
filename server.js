// server.js - 輕量本地 HTTP 伺服器 (Node.js 原生零依賴)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const sseClients = new Set();
const MAX_BROADCAST_BYTES = 64 * 1024;
// 伺服器端檔案，不對外提供
const BLOCKED_FILES = new Set(['server.js']);

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 1. 即時連線 SSE 頻道 (供跨裝置/區域網路多人分身同頻)
  if (req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 3000\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 2. 廣播分身與科儀訊息 API
  if (req.url === '/api/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BROADCAST_BYTES) {
        res.writeHead(413);
        res.end();
        req.destroy();
      }
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      sseClients.forEach(client => {
        try {
          client.write(`data: ${body}\n\n`);
        } catch (e) {}
      });
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
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
  const blocked = relPath.startsWith('..') || path.isAbsolute(relPath) ||
    relPath.split(path.sep).some(seg => seg.startsWith('.')) ||
    BLOCKED_FILES.has(relPath);
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


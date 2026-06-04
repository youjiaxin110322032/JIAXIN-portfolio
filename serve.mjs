import { createServer } from 'http';
import { readFile, writeFile, readdir } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /api/root → return project root directory (for client-side path normalization)
  if (req.method === 'GET' && req.url === '/api/root') {
    const rootFwd = __dirname.replace(/\\/g, '/').replace(/\/+$/, '');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ root: rootFwd }));
    return;
  }

  // GET /api/list-images?path=image/project1 → return image filenames in directory
  if (req.method === 'GET' && req.url.startsWith('/api/list-images')) {
    const qPath = new URL(req.url, 'http://localhost').searchParams.get('path') || '';
    // Strip leading slash and block path traversal
    const safePath = qPath.replace(/\.\./g, '').replace(/^\/+/, '');
    const dirPath = join(__dirname, safePath);
    try {
      const files = await readdir(dirPath);
      const IMG_EXTS = new Set(['.jpg','.jpeg','.png','.gif','.webp','.svg','.avif','.bmp']);
      const base = safePath.replace(/\/?$/, '/');
      const images = files
        .filter(f => IMG_EXTS.has(extname(f).toLowerCase()))
        .sort()
        .map(name => ({ name, path: base + name, url: '/' + base + name }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ images }));
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ images: [], error: 'directory not found' }));
    }
    return;
  }

  // POST /api/sync-data → write data to _data.json for code persistence
  if (req.method === 'POST' && req.url === '/api/sync-data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        JSON.parse(body); // validate JSON before writing
        await writeFile(join(__dirname, '_data.json'), body, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"error":"invalid JSON"}');
      }
    });
    return;
  }

  let url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = join(__dirname, url);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
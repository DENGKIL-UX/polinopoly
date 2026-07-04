import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NEXT_DIR = join(__dirname, '.next');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2' };

const server = createServer((req, res) => {
  try {
    let urlPath = req.url.split('?')[0];
    
    // Serve static files from .next/static
    if (urlPath.startsWith('/_next/static/')) {
      const filePath = join(NEXT_DIR, urlPath);
      if (existsSync(filePath)) {
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' });
        res.end(readFileSync(filePath));
        return;
      }
    }
    
    // Serve public files
    if (urlPath === '/logo.svg' || urlPath === '/robots.txt') {
      const filePath = join(__dirname, 'public', urlPath);
      if (existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'text/plain' });
        res.end(readFileSync(filePath));
        return;
      }
    }

    // API routes - return simple JSON
    if (urlPath.startsWith('/api/')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      if (urlPath === '/api/ai-decision') {
        res.end(JSON.stringify({ action: 'pass', quote: 'Mana ada masa...', reasoning: 'Fallback' }));
      } else {
        res.end(JSON.stringify({ status: 'ok' }));
      }
      return;
    }
    
    // All other routes - serve the SPA HTML
    const htmlPath = join(NEXT_DIR, 'server', 'app', 'index.html');
    if (existsSync(htmlPath)) {
      const html = readFileSync(htmlPath, 'utf-8');
      // Inject base tag for proper asset loading
      const modified = html.replace('<head>', '<head><base href="/">');
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' });
      res.end(modified);
    } else {
      res.writeHead(500);
      res.end('HTML not found');
    }
  } catch (e) {
    res.writeHead(500);
    res.end('Error: ' + e.message);
  }
});

server.listen(3099, '127.0.0.1', () => {
  console.log('🚀 Static server on http://localhost:3099');
});

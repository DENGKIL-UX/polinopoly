import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const PORT = 3000;
const NEXT_DIR = join(process.cwd(), '.next');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

// Read HTML once at startup
let htmlContent = '';
try {
  htmlContent = readFileSync(join(NEXT_DIR, 'server', 'app', 'index.html'), 'utf-8');
  console.log(`Read HTML: ${htmlContent.length} bytes`);
} catch (e) {
  console.error('Failed to read HTML:', e);
}

const server = Bun.serve({
  port: PORT,
  development: false,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/health') return new Response('OK');

    // Static assets - on demand
    if (path.startsWith('/_next/static/')) {
      const filePath = join(NEXT_DIR, path);
      if (existsSync(filePath)) {
        return new Response(readFileSync(filePath), {
          headers: { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' },
        });
      }
    }

    // SPA fallback
    return new Response(htmlContent, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
});

console.log(`🚀 Static server on http://localhost:${PORT}`);
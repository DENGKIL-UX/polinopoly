import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const NEXT_DIR = "/home/z/my-project/.next";
const PROJECT_DIR = "/home/z/my-project";

// Preload HTML
let html = "";
try { html = readFileSync(join(NEXT_DIR, "server", "app", "index.html"), "utf-8"); } catch {}

function serveStatic(res: ServerResponse, urlPath: string): boolean {
  // /_next/static/... -> .next/static/... (strip /_next prefix)
  let fsPath: string | null = null;
  if (urlPath.startsWith("/_next/")) {
    fsPath = join(NEXT_DIR, urlPath.substring(6)); // strip "/_next"
  }
  if (fsPath && existsSync(fsPath)) {
    const ct = MIME[extname(fsPath)] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.end(readFileSync(fsPath));
    return true;
  }
  return false;
}

function servePublic(res: ServerResponse, urlPath: string): boolean {
  const fp = join(PROJECT_DIR, "public", urlPath);
  if (existsSync(fp)) {
    res.writeHead(200, { "Content-Type": MIME[extname(fp)] || "text/plain" });
    res.end(readFileSync(fp));
    return true;
  }
  return false;
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  try {
    const urlPath = new URL(req.url || "/", `http://${req.headers.host || "x"}`).pathname;

    // Static assets
    if (urlPath.startsWith("/_next/") && serveStatic(res, urlPath)) return;

    // Public files
    if (servePublic(res, urlPath)) return;

    // API routes
    if (urlPath.startsWith("/api/")) {
      if (urlPath.includes("ai-decision")) {
        let body = "";
        req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        req.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          try {
            const data = JSON.parse(body);
            const name = data?.coalitionName || "";
            res.end(JSON.stringify({
              action: "pass",
              quote: `Ini semua politik la, ${name}... rakyat tahu!`,
              reasoning: "Fallback AI decision",
            }));
          } catch {
            res.end(JSON.stringify({ action: "pass", quote: "Politik!", reasoning: "FB" }));
          }
        });
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"status":"ok"}');
      }
      return;
    }

    // SPA fallback
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch {
    try { res.writeHead(500); res.end("Error"); } catch {}
  }
});

server.on("error", (e) => console.error("Server error:", e.message));
process.on("uncaughtException", () => {});

server.listen(3000, "0.0.0.0", () => {
  console.log("Game server ready on port 3000");
});

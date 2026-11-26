// Sert le build web pour les tests E2E avec les mêmes règles que
// docker/nginx.conf : `expo serve` ne résout pas les routes dynamiques
// (/chat/abc → chat/[id].html) et ne testerait donc pas ce qui tourne en prod.
//
// Usage : node e2e/support/serve.mjs <dossier du build> <port>

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), process.argv[2] ?? "dist");
const port = Number(process.argv[3] ?? 8095);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

// Même logique que les blocs `location` de nginx.conf.
const DYNAMIC = /^\/(chat|user|activity)\/[^/]+\/?$/;

const isFile = (path) => existsSync(path) && statSync(path).isFile();

function resolve(pathname) {
  const dynamic = pathname.match(DYNAMIC);
  if (dynamic) return join(ROOT, dynamic[1], "[id].html");

  const base = join(ROOT, normalize(pathname));
  if (!base.startsWith(ROOT)) return null;
  return [base, `${base}.html`, join(base, "index.html")].find(isFile) ?? null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  const file = resolve(decodeURIComponent(pathname));
  const found = file && isFile(file);
  const served = found ? file : join(ROOT, "+not-found.html");

  res.writeHead(found ? 200 : 404, {
    "Content-Type": TYPES[extname(served)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(served).pipe(res);
}).listen(port, () => console.log(`dist/ servi sur http://localhost:${port}`));

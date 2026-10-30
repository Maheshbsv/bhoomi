// Tiny static server for the exported site: maps /bhoomi/* to out/* the way GitHub Pages does.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../out", import.meta.url)));
const BASE = "/bhoomi";
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", // Next RSC payloads (__next.*.txt, index.txt)
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

/** Returns an absolute file path inside ROOT, or null. */
async function resolveFile(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname.slice(BASE.length));
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  const target = resolve(ROOT, "." + normalize("/" + rel));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null; // path traversal
  if (await isFile(target)) return target;
  const index = join(target, "index.html");
  if (await isFile(index)) return index;

  // Next exports prefetch payloads as flat names (__next.$d$locale.__PAGE__.txt). When the build runs
  // on Windows it writes them as __next.$d$locale/__PAGE__.txt instead (a backslash in the segment
  // path is never replaced by the dot). Linux, i.e. GitHub Actions, produces the flat names, so this
  // fallback is Windows-only; on Linux a missing payload stays a 404 and fails the e2e check.
  const name = basename(target);
  if (process.platform === "win32" && name.startsWith("__next.") && name.endsWith(".txt")) {
    const [first, ...rest] = name.slice("__next.".length, -".txt".length).split(".");
    if (rest.length > 0) {
      const alt = join(dirname(target), `__next.${first}`, ...rest) + ".txt";
      if (alt.startsWith(ROOT + sep) && (await isFile(alt))) return alt;
    }
  }
  return null;
}

async function send(res, status, file) {
  const body = await readFile(file);
  res.writeHead(status, {
    "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "content-length": body.length,
    "cache-control": "no-store",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (pathname === BASE) {
      res.writeHead(301, { location: BASE + "/" });
      res.end();
      return;
    }
    if (pathname.startsWith(BASE + "/")) {
      const file = await resolveFile(pathname);
      if (file) return await send(res, 200, file);
    }
    await send(res, 404, join(ROOT, "404.html"));
  } catch {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Server error");
  }
});

server.listen(PORT, () => console.log(`Serving out/ at http://localhost:${PORT}${BASE}/`));

import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 3000;
const distPath = join(__dirname, "dist");

function loadEnv() {
  const envPath = join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(body);
}

function sendFile(res, filepath) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  };

  res.writeHead(200, {
    "Content-Type": types[extname(filepath)] || "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
  });
  createReadStream(filepath).pipe(res);
}

async function handleDiscover(reqUrl, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: "TMDB_API_KEY is not configured" });

  try {
    const url = new URL("https://api.themoviedb.org/3/discover/movie");
    const input = new URL(reqUrl, "http://localhost");

    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("language", "tr-TR");
    url.searchParams.append("sort_by", input.searchParams.get("sort_by") || "popularity.desc");
    url.searchParams.append("include_adult", "false");
    url.searchParams.append("include_video", "false");
    url.searchParams.append("page", "1");

    for (const key of ["with_genres", "without_genres", "vote_count.gte", "vote_average.gte"]) {
      const value = input.searchParams.get(key);
      if (value) url.searchParams.append(key, value);
    }

    const response = await fetch(url);
    const data = await response.json();
    sendJson(res, response.ok ? 200 : response.status, data);
  } catch (error) {
    console.error("TMDB Proxy Error:", error);
    sendJson(res, 500, { error: "Failed to fetch from TMDB" });
  }
}

async function handleCredits(pathname, res) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: "TMDB_API_KEY is not configured" });

  try {
    const id = pathname.split("/")[3];
    const response = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`);
    const data = await response.json();
    sendJson(res, response.ok ? 200 : response.status, data);
  } catch (error) {
    sendJson(res, 500, { error: "Failed to fetch credits" });
  }
}

loadEnv();

createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", "http://localhost");

  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (reqUrl.pathname === "/api/movies/discover") return void handleDiscover(req.url || "", res);
  if (/^\/api\/movies\/[^/]+\/credits$/.test(reqUrl.pathname)) return void handleCredits(reqUrl.pathname, res);

  const requestedPath = normalize(reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname);
  const filepath = join(distPath, requestedPath);
  const safePath = filepath.startsWith(distPath) && existsSync(filepath) ? filepath : join(distPath, "index.html");
  sendFile(res, safePath);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

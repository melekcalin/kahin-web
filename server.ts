import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  // Proxy to TMDB
  app.get("/api/movies/discover", async (req, res) => {
    const { with_genres, without_genres, sort_by } = req.query;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }

    try {
      const url = new URL("https://api.themoviedb.org/3/discover/movie");
      url.searchParams.append("api_key", apiKey);
      url.searchParams.append("language", "tr-TR");
      url.searchParams.append("sort_by", (sort_by as string) || "popularity.desc");
      url.searchParams.append("include_adult", "false");
      url.searchParams.append("page", "1");
      
      if (with_genres) {
        url.searchParams.append("with_genres", with_genres as string);
      }
      if (without_genres) {
        url.searchParams.append("without_genres", without_genres as string);
      }

      const response = await fetch(url.toString());
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("TMDB Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch from TMDB" });
    }
  });

  app.get("/api/movies/:id/credits", async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "TMDB_API_KEY is not configured" });
    }

    try {
      const url = `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch credits" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

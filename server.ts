import express from "express";
import path from "path";
import dotenv from "dotenv";
import { getGeminiRecommendations } from "./src/lib/geminiClient";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON packages
  app.use(express.json());

  // --- API ROUTE: Get wellness coach recommendations from Gemini ---
  app.post("/api/recommendation", async (req, res) => {
    try {
      const { burnoutScore, category, topFactors, userTimezone, currentHour } = req.body;
      
      if (burnoutScore === undefined || !category || !topFactors) {
        return res.status(400).json({ error: "Missing required request parameters." });
      }

      const recommendations = await getGeminiRecommendations({
        burnoutScore: Number(burnoutScore),
        category: String(category) as "sehat" | "waspada" | "kritis",
        topFactors: Array.isArray(topFactors) ? topFactors : [String(topFactors)],
        userTimezone: String(userTimezone || "Asia/Jakarta"),
        currentHour: typeof currentHour === "number" ? currentHour : new Date().getHours(),
      });

      return res.json({ recommendations });
    } catch (error) {
      console.error("Express API error calculating recommendation:", error);
      return res.status(500).json({ error: "Gagal memproses rekomendasi dari asisten AI." });
    }
  });

  // --- API ROUTE: Health check ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // --- Vite dev server middleware / Production static files setup ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SehatKerja running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Fatal exception during SehatKerja server bootstrap:", error);
});

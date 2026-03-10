/**
 * ampos-super — SaaS Super-Admin Service
 *
 * Standalone Express.js service for managing tenants, subscriptions, and devices
 * across all organizations in the ampos platform.
 *
 * Runs on PORT (default: 3200), behind Caddy which handles TLS for
 * super.yourdomain.com.
 */

import express from "express";
import path    from "path";
import fs      from "fs";
import rateLimit from "express-rate-limit";
import { authRouter }    from "./routes/auth";
import { tenantsRouter } from "./routes/tenants";
import { requireSuperAdmin } from "./middleware/auth";

const app  = express();
const PORT = parseInt(process.env.PORT ?? "3200", 10);

// ── Middleware ────────────────────────────────────────────────────────────────
app.set("trust proxy", 1); // trust Caddy's X-Forwarded-For
app.use(express.json({ limit: "256kb" }));

// Global rate limit — stricter since this is a privileged surface
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max:      120,
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use(globalLimiter);

// ── CORS: only allow the super-admin front-end origin ─────────────────────────
app.use((req, res, next) => {
  const allowedOrigin = process.env.SUPER_ORIGIN ?? "*";
  res.setHeader("Access-Control-Allow-Origin",  allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRouter);

// All tenant routes require super-admin JWT
app.use("/tenants", requireSuperAdmin, tenantsRouter);

// Health check (unauthenticated — used by Caddy health checks)
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Super-admin UI (served at root so the browser gets an actual page)
const UI_PATH = path.join(__dirname, "../src/ui.html");
const uiHtml  = fs.existsSync(UI_PATH) ? fs.readFileSync(UI_PATH, "utf8") : null;
app.get("/", (_req, res) => {
  if (uiHtml) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(uiHtml);
  } else {
    res.json({ service: "ampos-super", status: "ok" });
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[super-admin]", err);
  res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[ampos-super] listening on :${PORT}`);
});

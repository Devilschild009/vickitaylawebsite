import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";

function corsMiddleware(app: Express) {
  const allowedOrigins = new Set(ENV.corsAllowedOrigins);
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (!origin) return next();
    if (allowedOrigins.has(origin)) {
      res.vary("Origin");
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-TRPC-Source");
      res.setHeader("Access-Control-Max-Age", "600");
      if (req.method === "OPTIONS") return res.status(204).end();
      return next();
    }
    if (req.method === "OPTIONS") return res.status(403).json({ error: "Origin is not allowed." });
    return next();
  });
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  corsMiddleware(app);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}

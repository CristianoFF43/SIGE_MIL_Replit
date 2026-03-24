import type { Request, Response } from "express";
import { createApp } from "../server/app.js";
import { cleanupTempCustomField } from "../server/cleanupTemp.js";

let appPromise: ReturnType<typeof createApp> | null = null;
let cleanupPromise: Promise<void> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}

async function runStartupCleanupOnce() {
  if (!cleanupPromise) {
    cleanupPromise = cleanupTempCustomField().catch((error) => {
      console.error("[VERCEL API] Startup cleanup failed:", error);
    });
  }
  await cleanupPromise;
}

export default async function handler(req: Request, res: Response) {
  await runStartupCleanupOnce();
  const { app } = await getApp();
  return app(req, res);
}


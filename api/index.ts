import { createApp } from './_lib/app.js';

// Vercel serverless function entry point
export default async function handler(req: any, res: any) {
  try {
    const { app } = await createApp();
    app(req, res);
  } catch (error: any) {
    console.error('[CRITICAL] Server Boot Error:', error);
    res.status(500).json({
      message: "Server Boot Error",
      error: error.message,
      stack: error.stack
    });
  }
}

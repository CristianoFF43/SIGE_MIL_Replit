import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  console.log('[DEBUG] Vercel Function Started');
  console.log('[DEBUG] CWD:', process.cwd());

  try {
    const rootFiles = fs.readdirSync(process.cwd());
    console.log('[DEBUG] Root files:', rootFiles);

    if (rootFiles.includes('server')) {
      console.log('[DEBUG] Server folder found. Contents:', fs.readdirSync(path.join(process.cwd(), 'server')));
    } else {
      console.log('[DEBUG] Server folder MISSING in CWD');
      // Try to look one level up
      try {
        const parentFiles = fs.readdirSync(path.join(process.cwd(), '..'));
        console.log('[DEBUG] Parent files:', parentFiles);
      } catch (e) {
        console.log('[DEBUG] Cannot read parent dir');
      }
    }
  } catch (e) {
    console.error('[DEBUG] FS Error:', e);
  }

  try {
    // Dynamic import to catch module not found errors
    const { createApp } = await import('../server/app');
    const { app } = await createApp();
    app(req, res);
  } catch (error: any) {
    console.error('[CRITICAL] Failed to import server/app:', error);
    res.status(500).json({
      message: "Server Boot Error",
      error: error.message,
      stack: error.stack,
      cwd: process.cwd(),
      hint: "Check Vercel logs for [DEBUG] entries"
    });
  }
}

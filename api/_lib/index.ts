import { createApp } from "./app";
import { log } from "./vite";

(async () => {
  const { server } = await createApp();

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.platform === 'win32' ? 'localhost' : '0.0.0.0';

  server.listen({
    port,
    host,
    reusePort: process.platform !== 'win32', // reusePort não funciona no Windows
  }, () => {
    log(`serving on ${host}:${port}`);
  });
})();

// Carrega variáveis de ambiente se ainda não foram carregadas
if (!process.env.DATABASE_URL) {
  try {
    const { config } = await import('dotenv');
    const { resolve } = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = resolve(__dirname, '..', '.env');

    config({ path: envPath });
  } catch (error) {
    // Silenciosamente ignora se dotenv não estiver disponível
  }
}

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

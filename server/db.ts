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

import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import pg from 'pg';
import ws from "ws";

const { Pool: PgPool } = pg;
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const databaseUrl = supabaseUrl || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

let pool: any;
let db: any;

if (supabaseUrl) {
  const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
  pool = new PgPool({ connectionString: databaseUrl });
  db = drizzlePg(pool, { schema });
} else {
  const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-serverless');
  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon({ client: pool, schema });
}

export { pool, db };

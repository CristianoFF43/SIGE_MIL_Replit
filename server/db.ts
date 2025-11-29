// Carrega variáveis de ambiente se ainda não foram carregadas
if (!process.env.DATABASE_URL) {
  try {
    const dotenv = await import('dotenv');
    const { resolve } = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = resolve(__dirname, '..', '.env');

    dotenv.config({ path: envPath });
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

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const isSupabase = databaseUrl.includes('supabase') || !!process.env.SUPABASE_DATABASE_URL;

let pool: any;
let db: any;

if (isSupabase) {
  const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
  pool = new PgPool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  db = drizzlePg(pool, { schema });
} else {
  const { drizzle: drizzleNeon } = await import('drizzle-orm/neon-serverless');
  pool = new NeonPool({ connectionString: databaseUrl });
  db = drizzleNeon({ client: pool, schema });
}

export { pool, db };

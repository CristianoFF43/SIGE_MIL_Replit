/**
 * Script de Recovery - Criar Usuário Administrador
 *
 * Este script cria um usuário administrador diretamente no banco de dados
 * para recuperar acesso ao sistema quando todos os usuários foram removidos.
 *
 * USO:
 * 1. Execute: npm run create-admin
 * 2. Copie o ID gerado
 * 3. Crie um usuário no Firebase com esse mesmo ID
 * 4. Faça login com esse usuário
 */

// Carrega variáveis de ambiente do arquivo .env
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '..', '.env');

console.log('Carregando .env de:', envPath);
const result = config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Arquivo .env não encontrado ou erro ao carregar:', result.error.message);
} else {
  console.log('✅ Arquivo .env carregado com sucesso');
}

import { db } from "./db.js";
import { users } from "../shared/schema.js";
import { DEFAULT_PERMISSIONS } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function createAdminUser() {
  try {
    console.log("=".repeat(60));
    console.log("SCRIPT DE RECOVERY - CRIAR USUÁRIO ADMINISTRADOR");
    console.log("=".repeat(60));
    console.log();

    // Verificar se já existe algum administrador
    const existingAdmins = await db.select()
      .from(users)
      .where(eq(users.role, "administrator"))
      .limit(1);

    if (existingAdmins.length > 0) {
      console.log("⚠️  ATENÇÃO: Já existe um usuário administrador!");
      console.log("Email:", existingAdmins[0].email);
      console.log();
      console.log("Se você perdeu acesso, use o Firebase Console para:");
      console.log("1. Resetar a senha deste usuário");
      console.log("2. Ou remover este usuário e executar o script novamente");
      console.log();
      process.exit(0);
    }

    // Gerar ID único para o usuário
    const userId = crypto.randomUUID();
    const adminEmail = "admin@sigemil.local";

    console.log("📝 Criando usuário administrador...");
    console.log();
    console.log("ID do usuário:", userId);
    console.log("Email:", adminEmail);
    console.log();

    // Criar usuário administrador
    await db.insert(users).values({
      id: userId,
      email: adminEmail,
      firstName: "Admin",
      lastName: "Sistema",
      role: "administrator",
      permissions: DEFAULT_PERMISSIONS.administrator,
    });

    console.log("✅ Usuário administrador criado com sucesso!");
    console.log();
    console.log("=".repeat(60));
    console.log("PRÓXIMOS PASSOS:");
    console.log("=".repeat(60));
    console.log();
    console.log("OPÇÃO A - Usar Firebase (Recomendado para Produção):");
    console.log("1. Acesse: https://console.firebase.google.com");
    console.log("2. Vá em Authentication > Users");
    console.log("3. Clique em 'Add user'");
    console.log("4. Use o email:", adminEmail);
    console.log("5. Defina uma senha segura");
    console.log("6. IMPORTANTE: Após criar, edite o UID do usuário para:", userId);
    console.log();
    console.log("OPÇÃO B - Usar Modo de Teste (Apenas Desenvolvimento):");
    console.log("1. Copie o arquivo .env.example para .env");
    console.log("2. Configure: TEST_AUTH_ENABLED=true");
    console.log("3. Configure: VITE_TEST_MODE=true");
    console.log("4. Reinicie o servidor");
    console.log("5. Use o botão 'Test Login' na tela de login");
    console.log("6. Digite o email:", adminEmail);
    console.log();
    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Erro ao criar usuário administrador:", error);
    process.exit(1);
  }

  process.exit(0);
}

createAdminUser();

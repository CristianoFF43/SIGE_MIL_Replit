# COEXMEMO

Arquivo de memoria do projeto. Ao final de cada sessao, registrar aqui as atividades realizadas para manter continuidade.

## Entradas

### 2025-12-22 16:01
- Criado o arquivo de memoria `COEXMEMO.md` a pedido do usuario.
- Contexto inicial: arquivo de memoria solicitado e nao existente anteriormente no repositorio.

### 2025-12-22 16:06
- Registrado que a ultima atualizacao foi a clonagem do repositorio do GitHub e, apos leitura do `package.json`, execucao do `npm install`.
- Varredura rapida do projeto e scripts: proximo comando sugerido `npm run dev` (apos configurar `.env` com variaveis obrigatorias).

### 2025-12-23 01:58
- Criado o arquivo `.env` a partir de `.env.example` em `SIGE_MIL_Replit/.env`.
- Pendencia: preencher variaveis obrigatorias (DATABASE_URL, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_API_KEY) antes de executar `npm run dev`.

### 2026-01-23 22:57
- Preenchido o `.env` com os valores fornecidos (DATABASE_URL, Firebase client email/private key, e chaves VITE do Firebase), alem de NODE_ENV e SESSION_SECRET.
- Pronto para executar `npm run dev`.

### 2026-01-23 23:07
- Executado `npm run dev`; servidor iniciado e escutando na porta 5000.

### 2026-01-23 23:19
- Reiniciado `npm run dev` com log em `SIGE_MIL_Replit/dev-server.log` e realizado health check: HTTP 200 na porta 5000.
- Logs apontam erro de banco durante cleanup/import inicial: "Tenant or user not found".

### 2026-01-23 23:29
- Executado `npm run db:push`; falhou com "Tenant or user not found" ao puxar schema do banco.

### 2026-01-23 23:37
- Reexecutado `npm run db:push`; concluiu com sucesso (sem mudanças detectadas).

### 2026-01-24 00:09
- Atualizado `DATABASE_URL` para conexao direta (host db.<project_ref>.supabase.co:5432) e reexecutado `npm run db:push`.
- Resultado: falha de autenticacao `password authentication failed for user "postgres"` (codigo 28P01).

### 2026-01-24 00:23
- Atualizado `DATABASE_URL` para Session Pooler (host aws-1-sa-east-1.pooler.supabase.com:5432).
- `npm run db:push` concluido com sucesso (sem mudancas detectadas).

### 2026-01-24 00:24
- Iniciado `npm run dev` com log em `SIGE_MIL_Replit/dev-server.log`; health check OK (HTTP 200).
- Cleanup/import inicial OK: sem duplicatas TEMP e importacao ignorada por ja existir dados.

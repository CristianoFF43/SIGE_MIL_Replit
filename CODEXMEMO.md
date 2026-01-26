# CODEXMEMO

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

### 2026-01-24 03:40
- Usuario promoveu conta a administrador via Supabase (SQL) e confirmou acesso ao app.
- Pendencias mencionadas: existem bugs a corrigir, sem acoes nesta sessao.

### 2026-01-25 01:11
- Ajustado comparacao nos dashboards para unir categorias e evitar colisao de labels nos graficos.
- Filtros TEMP: normalizacao de valores no front (relatorios) e suporte completo no backend (filterBuilder + export).
- Efetivo Militar: situacao agora mostra badge colorido mesmo em modo edicao (mobile).

### 2026-01-25 02:16
- Revisado comparacao nos dashboards para usar interseccao entre metricas via novo endpoint /api/stats/cross (cada metrica em um eixo/serie).
- Exportacao: filtros TEMP aplicados corretamente mesmo quando sao o unico filtro.

### 2026-01-25 03:06
- Corrigido refresh de token no client (apiRequest + queries) para evitar erro de exportacao quando o ID token expira.

### 2026-01-25 03:26
- Corrigido endpoint de exportacao PDF: faltava normalizar `temp` (ReferenceError causava 500).

### 2026-01-25 03:53
- Push de correcoes pendentes: refresh de token no client, comparacao interseccao nos dashboards, filtros TEMP e exportacao PDF.
- Usuario solicitou pausar; retomaremos depois.

### 2026-01-25 22:59
- Corrigido erro de build no Render: declaracao duplicada de `temp` em `server/routes.ts` (exportacao).

### 2026-01-26 00:55
- Corrigido exportacao PDF: declarado `temp` na rota `/api/export/pdf` para evitar ReferenceError.
- Importacao Excel: normalizacao robusta de cabecalhos (remove acentos/pontuacao), suporte a variacoes de SEÇ/FRAÇÃO e TEMP, e ignorar valores iguais ao cabecalho.
- TEMP agora normalizado na importacao para "SIM"/"NÃO".
- UI Efetivo: celulas vazias nao exibem mais o texto do cabecalho como placeholder.
- Cleanup no startup: migra SEÇ/FRAÇÃO e TEMP de `custom_fields` para colunas padrao, normaliza TEMP, e remove definicoes duplicadas de campos customizados.

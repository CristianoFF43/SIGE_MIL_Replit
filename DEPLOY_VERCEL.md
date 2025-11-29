# Guia de Deploy no Vercel (Atualizado)

Este guia contém o passo-a-passo para colocar o **SIGE-MIL** no ar usando a nova arquitetura serverless.

## 1. Preparação no Vercel

1.  Acesse o dashboard da [Vercel](https://vercel.com/dashboard).
2.  Se houver projetos antigos do SIGE-MIL que não estão funcionando, **apague-os** para evitar conflitos.
3.  Clique em **"Add New..."** -> **"Project"**.

## 2. Importando o Repositório

1.  Na lista de repositórios do GitHub, encontre o **`SIGE_MIL_Replit`**.
2.  Clique no botão **"Import"**.

## 3. Configuração do Projeto (IMPORTANTE)

Na tela de configuração ("Configure Project"):

### Framework Preset
*   Deixe como **Vite** (ou "Other" se preferir, o arquivo `vercel.json` vai gerenciar isso, mas Vite é o padrão seguro).

### Root Directory
*   Deixe como `./` (padrão).

### Build and Output Settings
*   **Build Command**: `npm run build:vercel` (Se não estiver assim, ative o "Override" e digite isso).
*   **Output Directory**: `dist/public` (Se não estiver assim, ative o "Override" e digite isso).
*   **Install Command**: `npm install` (Padrão).

### Environment Variables (CRÍTICO 🚨)
Você **PRECISA** adicionar as variáveis de ambiente aqui, pois o arquivo `.env` não é enviado para o GitHub por segurança.

Clique em **Environment Variables** e adicione uma por uma:

| Nome (Key) | Valor (Value) |
| :--- | :--- |
| `DATABASE_URL` | A URL de conexão do seu banco (Neon ou Supabase). Ex: `postgres://user:pass@host/db...` |
| `VITE_FIREBASE_PROJECT_ID` | O ID do seu projeto Firebase |
| `VITE_FIREBASE_APP_ID` | O App ID do Firebase |
| `VITE_FIREBASE_API_KEY` | A API Key do Firebase |
| `SESSION_SECRET` | Uma senha longa e aleatória para criptografar sessões (invente uma) |
| `NODE_ENV` | `production` |

> **Dica:** Se você tiver o arquivo `.env` local salvo em algum lugar, pode copiar o conteúdo e colar na opção de "Paste .env" da Vercel para adicionar tudo de uma vez.

## 4. Finalizando

1.  Clique em **"Deploy"**.
2.  Aguarde o processo de build.
    *   A Vercel vai instalar as dependências.
    *   Vai rodar o comando de build.
    *   Vai configurar as funções serverless (`api/index.ts`).
3.  Se tudo der certo, você verá a tela de "Congratulations!".

## 5. Testando

*   Acesse a URL gerada (ex: `sige-mil-replit.vercel.app`).
*   Tente fazer login.
*   Verifique se os dados carregam.

---

### Solução de Problemas Comuns

*   **Erro 500 / "Internal Server Error"**: Geralmente é `DATABASE_URL` errada ou faltando. Verifique as variáveis de ambiente.
*   **Tela Branca**: Pode ser erro nas variáveis do Firebase (`VITE_...`). Verifique se estão corretas.
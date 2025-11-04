# Configuração do Firebase Authentication

## Problemas Corrigidos ✅

1. **Removidos alerts de debug** que bloqueavam a execução
2. **Atualizados códigos de erro** do Firebase Auth (versão mais recente)
3. **Adicionada validação de email** antes de enviar ao Firebase
4. **Melhorado tratamento de erros** com mensagens em português

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Firebase Client (Frontend)
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_APP_ID=seu_app_id

# Firebase Admin (Backend) - Opcional mas recomendado
FIREBASE_PROJECT_ID=seu_project_id
FIREBASE_CLIENT_EMAIL=seu_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Modo de Teste (Opcional)
TEST_AUTH_ENABLED=false
VITE_TEST_MODE=false
```

## Como Obter as Credenciais Firebase

### 1. Criar/Acessar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou selecione o existente
3. Anote o **Project ID**

### 2. Configurar Autenticação

1. No menu lateral, clique em **Authentication**
2. Clique em **Get Started** (se for a primeira vez)
3. Na aba **Sign-in method**, habilite:
   - ✅ **Email/Password** (Enable)
   - ✅ **Google** (Enable e configure o email de suporte)

### 3. Obter Credenciais do Cliente (Frontend)

1. No menu lateral, clique no ícone de **engrenagem ⚙️** → **Project settings**
2. Role até **Your apps** → selecione/crie um **Web app**
3. Copie as credenciais:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

### 4. Obter Service Account (Backend) - Opcional

1. Em **Project settings** → **Service accounts**
2. Clique em **Generate new private key**
3. Baixe o arquivo JSON
4. Extraia as credenciais:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (mantenha as quebras de linha `\n`)

### 5. Configurar Domínios Autorizados

1. Em **Authentication** → **Settings** → **Authorized domains**
2. Adicione os domínios onde sua aplicação vai rodar:
   - `localhost` (já vem por padrão)
   - Seu domínio de produção (ex: `meusite.com`)
   - Se usar Replit: `*.replit.dev`

## Testando a Autenticação

### Login com Email/Senha

1. Abra a aplicação
2. Vá para a aba **"Criar Conta"**
3. Insira um email válido e senha (mínimo 6 caracteres)
4. Confirme a senha
5. Clique em **"Criar Conta"**
6. Se bem-sucedido, você será redirecionado para o dashboard

### Login com Google

1. Clique na aba **"Google"**
2. Clique em **"Entrar com Google"**
3. Selecione sua conta Google
4. Se bem-sucedido, você será redirecionado para o dashboard

## Problemas Comuns e Soluções

### ❌ "Domínio não autorizado"

**Solução:** Adicione o domínio atual em **Authentication → Settings → Authorized domains**

### ❌ "Cadastro por email não está habilitado"

**Solução:** Habilite **Email/Password** em **Authentication → Sign-in method**

### ❌ "Email ou senha incorretos"

**Causas possíveis:**
- Email não cadastrado (use a aba "Criar Conta" primeiro)
- Senha incorreta
- Conta desativada no Firebase Console

### ❌ "Muitas tentativas"

**Solução:** Aguarde alguns minutos antes de tentar novamente. O Firebase bloqueia temporariamente após várias tentativas falhadas.

### ❌ Popup bloqueado (Google Sign-In)

**Solução:** Permita popups para o site no seu navegador

## Logs de Debug

Para verificar problemas, abra o **Console do Navegador** (F12) e procure por:

```
[FIREBASE] ...
[LOGIN] ...
[AUTH] ...
```

Todos os erros de autenticação são logados com detalhes.

## Códigos de Erro Tratados

- `auth/invalid-credential` - Email ou senha incorretos
- `auth/user-not-found` - Usuário não encontrado (versão antiga)
- `auth/wrong-password` - Senha incorreta (versão antiga)
- `auth/invalid-email` - Email com formato inválido
- `auth/email-already-in-use` - Email já cadastrado
- `auth/weak-password` - Senha muito fraca
- `auth/user-disabled` - Conta desativada
- `auth/too-many-requests` - Muitas tentativas
- `auth/network-request-failed` - Erro de conexão
- `auth/operation-not-allowed` - Método de autenticação não habilitado
- `auth/popup-blocked` - Popup bloqueado pelo navegador
- `auth/popup-closed-by-user` - Usuário fechou o popup
- `auth/unauthorized-domain` - Domínio não autorizado

## Verificação Rápida

Execute este checklist para garantir que tudo está configurado:

- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Email/Password habilitado no Firebase Console
- [ ] Google Sign-In habilitado no Firebase Console
- [ ] Domínio atual adicionado aos domínios autorizados
- [ ] Aplicação reiniciada após configurar `.env`
- [ ] Console do navegador aberto para ver logs

## Próximos Passos

Após a autenticação estar funcionando:

1. O primeiro usuário pode se auto-promover a Administrador usando o endpoint `/api/bootstrap/admin`
2. Administradores podem gerenciar outros usuários na aba "Usuários"
3. Configurar permissões granulares por usuário

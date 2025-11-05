# 🔑 Onde Encontrar as Credenciais - Guia Completo

## 📋 O que você precisa configurar

Você precisa de **2 conjuntos de credenciais**:

1. **Banco de Dados** (PostgreSQL/Neon)
2. **Firebase Authentication**

---

## 🗄️ PARTE 1: Banco de Dados (DATABASE_URL)

### Opção A: Você já tem um banco no Neon

Se você já usava o projeto no Replit, provavelmente já tem um banco configurado.

#### Passo 1: Acessar o Neon Dashboard

1. Acesse: **https://console.neon.tech**
2. Faça login com sua conta
3. Você verá seus projetos

#### Passo 2: Localizar o Projeto

- Procure por um projeto com nome parecido com "SIGE_MIL" ou relacionado ao 7º BIS
- Clique no projeto

#### Passo 3: Copiar a Connection String

1. No dashboard do projeto, clique em **"Connection Details"** ou **"Connection String"**
2. Certifique-se de que está selecionado **"Pooled connection"**
3. Copie a string completa, que parece com:
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

#### Passo 4: Verificar se o banco tem dados

- Vá na aba **"Tables"** ou **"SQL Editor"**
- Você deve ver tabelas como: `military_personnel`, `users`, `custom_field_definitions`
- Se vir essas tabelas, **ESTE É O BANCO CERTO!** ✅

---

### Opção B: Criar um novo banco no Neon (se não tiver)

⚠️ **ATENÇÃO:** Se você criar um banco novo, vai PERDER todos os dados anteriores!

#### Se você NÃO encontrou banco existente:

1. Acesse: **https://neon.tech**
2. Clique em **"Sign up"** (ou faça login)
3. Clique em **"Create a project"**
4. Dê um nome: `SIGE-MIL-7BIS`
5. Escolha a região: **US East (Ohio)** (mais próxima)
6. Clique em **"Create Project"**
7. Na tela seguinte, copie a **Connection String**

---

### Opção C: Procurar no Replit (se o projeto estava lá)

Se o projeto estava rodando no Replit:

1. Acesse: **https://replit.com**
2. Abra o projeto SIGE_MIL
3. Clique em **"Tools"** (no menu lateral esquerdo)
4. Clique em **"Secrets"** (ícone de cadeado 🔒)
5. Procure por `DATABASE_URL`
6. Clique no ícone de olho 👁️ para revelar o valor
7. **COPIE ESSE VALOR!** É essa a credencial que você precisa

---

## 🔥 PARTE 2: Firebase Authentication

### Passo 1: Acessar o Firebase Console

1. Acesse: **https://console.firebase.google.com**
2. Faça login com sua conta Google
3. Você verá uma lista de projetos

### Passo 2: Identificar o Projeto Correto

- Procure por um projeto relacionado ao SIGE_MIL ou 7º BIS
- O nome pode ser algo como:
  - `sige-mil`
  - `7bis-sige`
  - `sigemil-7bis`
  - Ou similar

**💡 DICA:** Se você criou o projeto no Replit, o nome do projeto Firebase provavelmente é o mesmo!

### Passo 3: Obter as Credenciais

#### 3.1: Clicar no projeto

#### 3.2: Clicar no ícone de engrenagem ⚙️ (Configurações do Projeto)

#### 3.3: Rolar até "Seus apps"

- Você verá uma seção chamada **"Seus apps"** ou **"Your apps"**
- Procure por um app Web (ícone `</>`):
  - Pode ter nome como "SIGE MIL Web App"

#### 3.4: Copiar as credenciais

Você verá um código de configuração parecido com:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**Você precisa de apenas 3 valores:**

1. **apiKey** → Esse é o `VITE_FIREBASE_API_KEY`
2. **projectId** → Esse é o `VITE_FIREBASE_PROJECT_ID`
3. **appId** → Esse é o `VITE_FIREBASE_APP_ID`

---

### Opção alternativa: Procurar no Replit

Se o projeto estava no Replit:

1. Acesse: **https://replit.com**
2. Abra o projeto SIGE_MIL
3. Vá em **Tools > Secrets**
4. Procure por:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
5. Copie esses valores

---

## ✅ Resumo: O que copiar

Após seguir os passos acima, você terá:

### Do Neon (ou Replit Secrets):
```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

### Do Firebase Console (ou Replit Secrets):
```
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 📝 Criar o arquivo .env

Depois de copiar todas as credenciais:

1. **Abra o terminal no diretório do projeto**

2. **Copie o arquivo de exemplo:**
   ```bash
   copy .env.example .env
   ```

3. **Edite o arquivo .env** (pode usar Notepad, VS Code, ou qualquer editor)

4. **Cole os valores:**

```env
# ==================================
# BANCO DE DADOS
# ==================================
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# ==================================
# FIREBASE
# ==================================
VITE_FIREBASE_PROJECT_ID="seu-projeto-id"
VITE_FIREBASE_APP_ID="1:123456789012:web:abcdef1234567890"
VITE_FIREBASE_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# ==================================
# MODO DE TESTE (Para recovery)
# ==================================
TEST_AUTH_ENABLED=true
VITE_TEST_MODE=true
TEST_AUTH_SECRET=test-secret-123
```

5. **Salve o arquivo**

---

## 🔍 Verificar se está correto

Execute no terminal:

```bash
npm run create-admin
```

**Se der erro de DATABASE_URL:**
- A credencial do banco está incorreta
- Verifique se copiou a string completa (começa com `postgresql://`)

**Se der erro de Firebase:**
- As credenciais do Firebase estão incorretas
- Verifique se copiou os 3 valores corretos

**Se funcionar:**
- ✅ Você verá uma mensagem de sucesso!
- ✅ Um usuário admin foi criado
- ✅ Siga as instruções mostradas na tela

---

## 🆘 Ainda com dúvidas?

### Cenário 1: "Não sei se tenho banco de dados"
- Se o projeto rodava no Replit antes, você TEM banco
- Acesse o Replit e vá em Tools > Secrets
- Copie o DATABASE_URL de lá

### Cenário 2: "Não sei qual projeto Firebase é o correto"
- Acesse o Replit e vá em Tools > Secrets
- Copie VITE_FIREBASE_PROJECT_ID
- Use esse ID para encontrar o projeto no Firebase Console

### Cenário 3: "Não tenho acesso ao Replit"
- Você precisará criar um novo banco no Neon
- ⚠️ Isso significa PERDER os dados anteriores
- É melhor tentar recuperar acesso ao Replit primeiro

---

## 📞 Checklist Final

Antes de prosseguir, confirme:

- [ ] Encontrei o projeto no Neon.tech (ou criei um novo)
- [ ] Copiei a DATABASE_URL completa
- [ ] Encontrei o projeto no Firebase Console
- [ ] Copiei as 3 credenciais do Firebase (API Key, Project ID, App ID)
- [ ] Criei o arquivo .env
- [ ] Colei todos os valores no .env
- [ ] Salvei o arquivo .env
- [ ] Executei `npm run create-admin` com sucesso

---

**Próximo passo:** Após configurar o .env, execute `npm run create-admin` e siga as instruções para recuperar o acesso!

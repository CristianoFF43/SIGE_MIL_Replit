# Guia de Deploy - SIGE-MIL

Este guia apresenta as **melhores opções de deploy** do projeto SIGE-MIL para produção profissional.

---

## 📋 Pré-requisitos (para todas as opções)

### 1. Variáveis de Ambiente Necessárias

Você precisará configurar estas variáveis de ambiente:

#### Obrigatórias:
```bash
# Banco de Dados PostgreSQL (Neon Serverless)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Firebase Authentication
VITE_FIREBASE_PROJECT_ID="seu-projeto-id"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

#### Opcionais:
```bash
PORT="5000"                    # Porta do servidor (padrão: 5000)
NODE_ENV="production"          # Ambiente
SESSION_SECRET="seu-secret"    # Para sessões (gerar aleatório)
```

### 2. Serviços Externos Necessários

- **Neon Database** (PostgreSQL serverless): https://neon.tech
- **Firebase** (Autenticação): https://console.firebase.google.com

### 3. Preparar Repositório Git

```bash
cd "D:\NEGÓCIOS\AUTOMAÇÃO\CLOUD CODE_CURSOR\SIGE_MIL_Replit-main\SIGE_MIL_Replit-main"

# Inicializar Git (se ainda não estiver)
git init

# Verificar .gitignore
cat .gitignore
# Deve conter:
# node_modules
# dist
# .env
# *.log

# Commit inicial
git add .
git commit -m "Preparar para deploy - versão 1.0.0"

# Criar repositório no GitHub
# 1. Vá em github.com → New Repository
# 2. Nome: SIGE-MIL
# 3. Deixe vazio (não adicione README)
# 4. Create Repository

# Conectar e fazer push
git remote add origin https://github.com/seu-usuario/SIGE-MIL.git
git branch -M main
git push -u origin main
```

---

## 🚀 OPÇÃO 1: Deploy no Render (RECOMENDADO)

**✅ Recomendado para:** Produção, melhor custo-benefício

**✅ Vantagens:**
- Plano gratuito generoso (750h/mês)
- Deploy automático via Git
- SSL automático (HTTPS)
- Domínio personalizado gratuito
- PostgreSQL integrado
- Logs e monitoramento
- Fácil de configurar

**⚠️ Limitações:**
- Plano gratuito "dorme" após 15min de inatividade
- Cold start de ~30-60s na primeira requisição
- 512MB RAM no plano gratuito

**💰 Custo:**
- Gratuito: Ideal para início
- Starter ($7/mês): Sem cold start, sempre ligado
- Professional ($25/mês): Mais recursos

### Passo a Passo:

#### 1. Criar Conta no Render
```
1. Acesse: https://render.com
2. Clique em "Get Started" ou "Sign Up"
3. Faça login com GitHub (recomendado)
4. Autorize o Render a acessar seus repositórios
```

#### 2. Criar PostgreSQL Database
```
1. Dashboard → "New +" → "PostgreSQL"
2. Configurações:
   - Name: sige-mil-db
   - Database: sige_mil
   - User: sige_admin (ou deixe automático)
   - Region: Ohio (US East) ou mais próxima
   - PostgreSQL Version: 16
   - Plan: Free
3. Clique em "Create Database"
4. Aguarde ~2 minutos (criação do database)
5. Na página do database:
   - Vá em "Info"
   - Copie "External Database URL"
   - Formato: postgresql://user:pass@host/db
6. GUARDE ESSA URL! Você vai precisar no passo 4
```

#### 3. Criar Web Service
```
1. Dashboard → "New +" → "Web Service"
2. Clique em "Connect a repository"
3. Conecte seu GitHub (se ainda não conectou)
4. Selecione o repositório "SIGE-MIL"
5. Clique em "Connect"
```

#### 4. Configurar Web Service
```
Configurações básicas:
- Name: sige-mil
- Region: Ohio (mesma do banco)
- Branch: main
- Root Directory: (deixe em branco)
- Runtime: Node
- Build Command: npm install && npm run build
- Start Command: npm start

Plan:
- Free (para testar)
- Ou Starter ($7/mês) se quiser sem cold start

Environment Variables (IMPORTANTE!):
Clique em "Advanced" → "Add Environment Variable"
Adicione uma por uma:

1. DATABASE_URL
   Value: (cole a URL do passo 2)

2. VITE_FIREBASE_PROJECT_ID
   Value: seu-projeto-firebase

3. VITE_FIREBASE_APP_ID
   Value: 1:123456789:web:abcdef

4. VITE_FIREBASE_API_KEY
   Value: AIzaSy...

5. NODE_ENV
   Value: production

6. SESSION_SECRET
   Value: (gere uma string aleatória)
   # Gerar no terminal: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 5. Criar Web Service
```
1. Clique em "Create Web Service"
2. Render vai:
   - Clonar repositório
   - Instalar dependências (npm install)
   - Fazer build (npm run build)
   - Iniciar servidor (npm start)
3. Aguarde 5-7 minutos
4. Você verá logs em tempo real
5. Quando aparecer "Your service is live 🎉"
6. Anote a URL: https://sige-mil.onrender.com
```

#### 6. Aplicar Schema do Banco de Dados
```
Opção A - Via Shell do Render:
1. No dashboard → Clique no seu serviço
2. No canto superior direito → "Shell"
3. Aguarde terminal carregar
4. Execute: npm run db:push
5. Deve ver: "✓ Pushing schema to database"

Opção B - Via CLI local (se tiver Render CLI):
1. No terminal local: render login
2. render deploy
3. render run npm run db:push
```

#### 7. Configurar Domínio Personalizado (Opcional)
```
1. No dashboard do seu serviço → "Settings"
2. Seção "Custom Domain"
3. Clique em "Add Custom Domain"
4. Digite: sige-mil.seu-dominio.com
5. Render mostrará registros DNS para configurar
6. No seu provedor de domínio (Registro.br, GoDaddy, etc):
   - Adicione registro CNAME
   - Nome: sige-mil
   - Valor: sige-mil.onrender.com
7. Aguarde propagação DNS (5min-24h)
8. SSL será configurado automaticamente
```

#### 8. Monitoramento e Logs
```
1. Dashboard → Seu serviço → "Logs"
2. Logs em tempo real
3. Filtre por erro: digite "error" na busca
4. Para alertas: Settings → "Notifications"
```

---

## 🏢 OPÇÃO 2: Deploy no Railway

**✅ Recomendado para:** Produção profissional, escalabilidade

**✅ Vantagens:**
- Interface moderna e intuitiva
- Deploy automático via Git
- PostgreSQL integrado (provisionamento em segundos)
- Sem cold starts
- Monitoramento e métricas built-in
- Logs excelentes
- Variáveis compartilhadas entre serviços
- Rollback com 1 clique

**⚠️ Limitações:**
- Não tem plano 100% gratuito
- Requer cartão de crédito

**💰 Custo:**
- $5 grátis/mês (trial)
- Depois: ~$5-15/mês (pay-as-you-go)
- Cálculo: $0.000463/GB-hora (RAM) + $0.000231/vCPU-hora

### Passo a Passo:

#### 1. Criar Conta no Railway
```
1. Acesse: https://railway.app
2. Clique em "Start a New Project"
3. Faça login com GitHub
4. Autorize o Railway
5. Adicione cartão de crédito (necessário, mas tem $5 grátis)
```

#### 2. Criar Novo Projeto
```
1. Dashboard → "New Project"
2. Selecione "Deploy from GitHub repo"
3. Clique em "Configure GitHub App"
4. Selecione seu repositório: SIGE-MIL
5. Clique em "Deploy Now"
6. Railway detecta automaticamente que é Node.js
```

#### 3. Adicionar PostgreSQL
```
1. No seu projeto, clique em "+ New"
2. Selecione "Database" → "Add PostgreSQL"
3. Railway cria em ~10 segundos
4. PostgreSQL aparece como novo serviço no dashboard
5. A variável DATABASE_URL é criada automaticamente
```

#### 4. Configurar Variáveis de Ambiente
```
1. Clique no serviço do seu app (SIGE-MIL)
2. Vá na aba "Variables"
3. Você verá que DATABASE_URL já está lá (referência ao PostgreSQL)
4. Clique em "New Variable" e adicione:

   VITE_FIREBASE_PROJECT_ID = seu-projeto-firebase
   VITE_FIREBASE_APP_ID = 1:123456789:web:abcdef
   VITE_FIREBASE_API_KEY = AIzaSy...
   NODE_ENV = production
   SESSION_SECRET = (string aleatória de 32+ caracteres)
   PORT = 5000

5. DATABASE_URL já está configurada automaticamente como:
   ${{Postgres.DATABASE_URL}}
   (referência dinâmica ao serviço PostgreSQL)
```

#### 5. Configurar Build
```
1. Ainda no serviço do app → Aba "Settings"
2. Seção "Build"
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Watch Paths: /server/** /client/** /shared/**
3. Seção "Deploy"
   - Restart Policy: Always (recomendado)
4. Clique em "Save"
```

#### 6. Deploy
```
Railway vai automaticamente:
1. Detectar mudança nas configurações
2. Iniciar novo deploy
3. Clonar repositório
4. Instalar dependências
5. Fazer build
6. Iniciar aplicação
7. Logs aparecem em tempo real

Aguarde 3-5 minutos
```

#### 7. Aplicar Schema do Banco
```
Opção A - Adicionar Run Command no Deploy:
1. Settings → seção "Deploy"
2. "Custom Start Command": npm run db:push && npm start
3. Save
4. Próximo deploy executará db:push automaticamente

Opção B - Via Railway CLI:
1. Instale CLI: npm install -g @railway/cli
2. No terminal do projeto: railway login
3. railway link (selecione seu projeto)
4. railway run npm run db:push

Opção C - Via Variável de Ambiente:
1. Conecte localmente com a DATABASE_URL do Railway
2. Execute: npm run db:push
```

#### 8. Obter URL e Configurar Domínio
```
URL Padrão:
1. Aba "Settings" → Seção "Domains"
2. Clique em "Generate Domain"
3. Railway gera: https://sige-mil-production.up.railway.app
4. Clique para testar

Domínio Personalizado:
1. Na mesma seção "Domains"
2. Clique em "Custom Domain"
3. Digite: sige-mil.seu-dominio.com
4. Railway mostra registros DNS:
   - CNAME: sige-mil → sige-mil-production.up.railway.app
5. Configure no seu provedor de DNS
6. SSL automático em ~5 minutos
```

#### 9. Monitoramento
```
1. Aba "Metrics" do serviço:
   - CPU usage
   - Memory usage
   - Network traffic
   - Request count
2. Aba "Deployments":
   - Histórico de deploys
   - Rollback com 1 clique
3. Aba "Logs":
   - Logs em tempo real
   - Filtros por nível (error, warn, info)
```

---

## 🌐 OPÇÃO 3: Vercel (Frontend) + Render/Railway (Backend)

**✅ Recomendado para:** Máxima performance no frontend, backend separado

**✅ Vantagens:**
- Frontend na edge (CDN global da Vercel)
- Latência ultra-baixa
- Deploy instantâneo
- Preview automático de PRs
- Backend independente e escalável

**⚠️ Considerações:**
- Requer separar frontend/backend
- Configuração CORS necessária
- Mais complexo que outras opções

### Arquitetura:
```
Frontend (Vercel)    →    Backend (Render/Railway)    →    Database (Neon)
React + Vite               Express API                     PostgreSQL
CDN Global                                                  Serverless
```

### Passo a Passo:

#### 1. Preparar Projeto (separar frontend/backend)
```bash
# Criar branch específica para deploy
git checkout -b deploy-vercel

# Criar arquivo de configuração do Vercel
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://seu-backend.onrender.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

git add vercel.json
git commit -m "Add Vercel configuration"
git push origin deploy-vercel
```

#### 2. Deploy do Backend (Render ou Railway)
```
Siga OPÇÃO 1 ou OPÇÃO 2 acima para deployar apenas o backend
```

#### 3. Deploy do Frontend (Vercel)
```
1. Acesse: https://vercel.com
2. Login com GitHub
3. "New Project"
4. Import repositório SIGE-MIL
5. Configurações:
   - Framework Preset: Vite
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: dist
   - Install Command: npm install
6. Environment Variables:
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_APP_ID
   VITE_FIREBASE_API_KEY
   VITE_API_URL=https://seu-backend.onrender.com
7. Deploy
```

#### 4. Configurar CORS no Backend
```javascript
// server/index.ts
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sige-mil.vercel.app',
    'https://seu-dominio.com'
  ],
  credentials: true
}));
```

---

## 💻 OPÇÃO 4: VPS Tradicional (DigitalOcean, AWS, etc)

**✅ Recomendado para:** Controle total, requisitos específicos

**✅ Vantagens:**
- Controle completo do servidor
- Sem limitações de plataforma
- Previsibilidade de custos
- Pode hospedar múltiplos apps

**⚠️ Considerações:**
- Requer conhecimento de Linux
- Você gerencia tudo (segurança, updates, etc)
- Mais trabalho de manutenção

**💰 Custo:**
- DigitalOcean Droplet: $6/mês (1GB RAM)
- AWS Lightsail: $5/mês (1GB RAM)
- Contabo: €5/mês (4GB RAM)

### Passo a Passo (Ubuntu 22.04):

#### 1. Criar Servidor
```
DigitalOcean:
1. Console → Droplets → Create
2. Ubuntu 22.04 LTS
3. Regular Intel (Shared CPU)
4. $6/mês (1GB RAM, 25GB SSD)
5. Adicione SSH key ou senha
6. Create Droplet
7. Anote o IP: 123.456.789.10
```

#### 2. Configurar Servidor
```bash
# SSH no servidor
ssh root@123.456.789.10

# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Instalar Nginx
apt install -y nginx

# Instalar PM2 (gerenciador de processos)
npm install -g pm2

# Criar usuário para app
adduser sige
usermod -aG sudo sige
su - sige
```

#### 3. Configurar PostgreSQL
```bash
# Como root
sudo -u postgres psql

# No psql:
CREATE DATABASE sige_mil;
CREATE USER sige_admin WITH PASSWORD 'senha-forte-aqui';
GRANT ALL PRIVILEGES ON DATABASE sige_mil TO sige_admin;
\q

# Habilitar conexões locais
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Adicione: local all sige_admin md5

sudo systemctl restart postgresql
```

#### 4. Fazer Deploy da Aplicação
```bash
# Como usuário sige
cd /home/sige
git clone https://github.com/seu-usuario/SIGE-MIL.git
cd SIGE-MIL

# Instalar dependências
npm install

# Criar arquivo .env
nano .env
# Copie variáveis do .env.example e preencha

# Build
npm run build

# Aplicar schema
npm run db:push

# Iniciar com PM2
pm2 start npm --name "sige-mil" -- start
pm2 save
pm2 startup
```

#### 5. Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/sige-mil

# Conteúdo:
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Ativar site
sudo ln -s /etc/nginx/sites-available/sige-mil /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Configurar SSL (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
# Siga instruções na tela
# Certbot configura SSL automaticamente
```

#### 7. Configurar Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🗄️ Configuração do Banco de Dados Neon

**Recomendado para todas as opções acima (exceto VPS com PostgreSQL local)**

### 1. Criar Conta e Database
```
1. Acesse: https://neon.tech
2. Clique em "Sign Up"
3. Faça login com GitHub (recomendado)
4. "Create your first project"
5. Configurações:
   - Project name: sige-mil
   - PostgreSQL version: 16
   - Region: US East (Ohio) ou mais próxima
   - Compute size: Shared (free)
6. Create Project
```

### 2. Obter Connection String
```
1. Dashboard → Seu projeto "sige-mil"
2. Sidebar → "Dashboard"
3. Seção "Connection Details"
4. Copie "Connection string"
5. Formato: postgresql://user:pass@host/db?sslmode=require
6. IMPORTANTE: Inclua "?sslmode=require" no final
```

### 3. Configurar na Aplicação
```bash
# Adicione nas variáveis de ambiente da plataforma:
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### 4. Aplicar Schema
```bash
# Via plataforma (Render/Railway):
npm run db:push

# Ou localmente:
DATABASE_URL="sua-connection-string" npm run db:push
```

### 5. Monitoramento
```
1. Dashboard Neon → Seu projeto
2. Aba "Monitoring":
   - Connection count
   - Data stored
   - Data transfer
3. Aba "Tables":
   - Ver tabelas criadas
   - Executar queries SQL
```

---

## 🔥 Configuração do Firebase

### 1. Criar Projeto Firebase
```
1. Acesse: https://console.firebase.google.com
2. Clique em "Adicionar projeto" / "Add project"
3. Nome do projeto: SIGE-MIL
4. Desabilite Google Analytics (opcional, não necessário)
5. Criar projeto
6. Aguarde ~30 segundos
```

### 2. Ativar Authentication
```
1. No console do projeto → "Authentication"
2. Clique em "Começar" / "Get started"
3. Aba "Sign-in method"
4. Ative os provedores:

   Google:
   - Clique em "Google"
   - Ative o botão
   - Project support email: seu-email@gmail.com
   - Salvar

   Email/Password (opcional):
   - Clique em "Email/Password"
   - Ative o botão "Email/Password"
   - Salvar
```

### 3. Obter Credenciais Web
```
1. Configurações do projeto (ícone engrenagem) → "Configurações do projeto"
2. Role até "Seus apps"
3. Clique no ícone "</>" (Web)
4. Registrar app:
   - Apelido do app: SIGE-MIL Web
   - NÃO marque "Firebase Hosting"
   - Registrar app
5. Copie as credenciais:
   const firebaseConfig = {
     apiKey: "AIzaSy...",          → VITE_FIREBASE_API_KEY
     authDomain: "...",
     projectId: "sige-mil-xxx",    → VITE_FIREBASE_PROJECT_ID
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "1:123..."             → VITE_FIREBASE_APP_ID
   };
6. Clique em "Continuar no console"
```

### 4. Configurar Domínios Autorizados
```
1. Authentication → Settings → Authorized domains
2. Por padrão já tem:
   - localhost
   - seu-projeto.firebaseapp.com
3. Adicione SEU domínio de deploy:

   Render:
   - sige-mil.onrender.com

   Railway:
   - sige-mil-production.up.railway.app

   Vercel:
   - sige-mil.vercel.app

   Domínio personalizado:
   - sige-mil.seu-dominio.com

4. Clique em "Add domain" para cada um
5. IMPORTANTE: Não adicione "https://", só o domínio
```

### 5. Criar Service Account (Backend)
```
1. Configurações do projeto → "Service accounts"
2. Linguagem: Node.js
3. Clique em "Gerar nova chave privada"
4. Confirme → Download do arquivo JSON
5. GUARDE COM SEGURANÇA (tem credenciais sensíveis)

Para usar:
Opção A - Upload como variável de ambiente:
FIREBASE_SERVICE_ACCOUNT_JSON=(cole conteúdo do arquivo)

Opção B - No VPS:
1. Coloque arquivo em /home/sige/SIGE-MIL/firebase-key.json
2. Adicione no .env: GOOGLE_APPLICATION_CREDENTIALS="/home/sige/SIGE-MIL/firebase-key.json"
```

### 6. Testar Configuração
```
1. Acesse seu app deployado
2. Clique em "Entrar com Google"
3. Selecione sua conta Google
4. Deve redirecionar de volta para o app
5. Verifique em Firebase Console:
   - Authentication → Users
   - Seu usuário deve aparecer
```

---

## 🧪 Testando o Deploy

### 1. Checklist de Verificação

```
✅ App carrega (sem erro 500/502/503)
✅ Tela de login aparece
✅ Logo aparece corretamente
✅ Login com Google funciona
✅ Redirecionamento pós-login funciona
✅ Dashboard carrega com dados
✅ Tabela de militares carrega (mesmo vazia)
✅ Botões e menus funcionam
```

### 2. Teste de Importação
```
1. Faça login como administrador
2. Vá em "Administração"
3. Seção "Importar Dados"
4. Faça upload de arquivo Excel de teste
5. Verifique logs no console da plataforma
6. Confirme importação bem-sucedida
7. Vá em "Efetivo"
8. Dados devem aparecer na tabela
```

### 3. Teste de Funcionalidades
```
✅ Filtros funcionam
✅ Edição inline funciona (se manager/admin)
✅ Busca funciona
✅ Exportação funciona
✅ Campos customizados aparecem
✅ Cards de companhias mostram contagens corretas
✅ Gráficos renderizam
```

### 4. Verificar Logs
```
Render:
- Dashboard → Seu serviço → Logs
- Filtre por "error" ou "warn"

Railway:
- Dashboard → Seu serviço → Logs tab
- Use filtros de nível

VPS:
- SSH no servidor
- pm2 logs sige-mil
- tail -f /var/log/nginx/error.log
```

---

## 🔧 Troubleshooting

### ❌ "DATABASE_URL not found"
```bash
Causa: Variável de ambiente não configurada

Solução Render:
1. Dashboard → Serviço → Environment
2. Verifique se DATABASE_URL existe
3. Se não, adicione com valor do PostgreSQL

Solução Railway:
1. Variables tab
2. Verifique ${{Postgres.DATABASE_URL}}
3. Ou adicione manualmente

Solução VPS:
1. cat .env
2. Verifique se DATABASE_URL está presente
3. Recarregue: pm2 restart sige-mil
```

### ❌ "Firebase configuration not found"
```bash
Causa: Variáveis VITE_* não configuradas

Verificar:
1. VITE_FIREBASE_PROJECT_ID
2. VITE_FIREBASE_APP_ID
3. VITE_FIREBASE_API_KEY

IMPORTANTE: Devem ter prefixo "VITE_"!
Sem prefixo, Vite não as expõe no frontend.
```

### ❌ "Port already in use"
```bash
Causa: Porta 5000 já está em uso

Solução:
1. Adicione variável: PORT=3000
2. Ou: PORT=8080
3. Restart do serviço
```

### ❌ App não conecta ao banco
```bash
Causa: Connection string incorreta

Verificações:
1. Deve incluir ?sslmode=require no final
2. Formato: postgresql://user:pass@host/db?sslmode=require
3. Teste localmente:
   DATABASE_URL="sua-string" npm run db:push
4. Se erro "certificate", adicione: ?sslmode=require
```

### ❌ "Domain not authorized" no Firebase
```bash
Causa: Domínio não está em Authorized domains

Solução:
1. Firebase Console → Authentication → Settings
2. Authorized domains → Add domain
3. Adicione: seu-dominio.onrender.com (sem https://)
4. Aguarde 1-2 minutos
5. Teste novamente
```

### ❌ Cold start lento (Render free tier)
```bash
Causa: Render hiberna apps inativos (15 min)

Soluções:
1. Upgrade para Starter ($7/mês) - sem hibernação
2. Ou use serviço de ping:
   - cron-job.org
   - UptimeRobot.com (gratuito)
   - Ping a cada 5 minutos: GET https://seu-app.onrender.com
```

### ❌ Build falha
```bash
Erro comum: "Cannot find module"

Solução:
1. Verifique package.json
2. Limpe cache: npm ci
3. No Render: Settings → "Clear build cache"
4. No Railway: Redeploy
5. Verifique logs de build

Erro: "Out of memory"
Solução (Render):
- Free tier: 512MB RAM
- Upgrade para Starter: 1GB RAM
```

### ❌ Variáveis VITE_* não funcionam
```bash
Causa: Vite embute variáveis em tempo de BUILD

Solução:
1. Todas variáveis VITE_* devem estar presentes no BUILD
2. Não basta adicionar depois
3. Render/Railway: Adicione ANTES de "Create Service"
4. Se adicionou depois:
   - Render: Manual Deploy
   - Railway: Redeploy
5. Variáveis sem VITE_ não são acessíveis no frontend
```

---

## 📊 Comparação das Opções

| Característica | Render | Railway | Vercel+Backend | VPS |
|----------------|--------|---------|----------------|-----|
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Custo Inicial** | Grátis | $5/mês* | Grátis+ | $5-6/mês |
| **Escalabilidade** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Uptime (free)** | ⭐⭐⭐ | N/A | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cold Start** | Sim (15min) | Não | Frontend:Não<br>Backend:Depende | Não |
| **SSL** | ✅ Auto | ✅ Auto | ✅ Auto | Manual |
| **Logs** | ✅ Bom | ✅ Excelente | ✅ Excelente | Manual |
| **DB Integrado** | Separado | ✅ | Não | ✅ |
| **Git Deploy** | ✅ | ✅ | ✅ | Manual |
| **Domínio Custom** | ✅ Grátis | ✅ Grátis | ✅ Grátis | ✅ |
| **Controle** | Médio | Médio | Médio | Total |

\* Railway: $5 grátis initial, depois pay-as-you-go
\+ Vercel: Grátis frontend, backend depende da escolha

---

## 🎯 Recomendação Final

### **Para Produção Inicial (Baixo custo):**
→ **Use Render (Opção 1)**
- Plano gratuito funcional
- Upgrade fácil quando precisar ($7/mês)
- Melhor relação custo/benefício
- Setup em 15-20 minutos

### **Para Produção Profissional:**
→ **Use Railway (Opção 2)**
- Sem cold starts
- Melhor performance
- Excelente DX (developer experience)
- Métricas e monitoramento
- ~$10-15/mês

### **Para Máxima Performance:**
→ **Use Vercel + Railway (Opção 3)**
- Frontend na edge (ultra rápido)
- Backend escalável independente
- Melhor para aplicações globais
- ~$15-25/mês

### **Para Controle Total:**
→ **Use VPS (Opção 4)**
- DigitalOcean ou Contabo
- Você gerencia tudo
- Mais trabalho, mais controle
- $5-6/mês

---

## 📝 Checklist Pós-Deploy

- [ ] ✅ Banco de dados criado e schema aplicado
- [ ] ✅ Firebase configurado e domínios autorizados
- [ ] ✅ Todas variáveis de ambiente configuradas
- [ ] ✅ Build passa sem erros
- [ ] ✅ App carrega sem erros
- [ ] ✅ Login funciona (Google Sign-In)
- [ ] ✅ Dashboard renderiza
- [ ] ✅ Importação de dados funciona
- [ ] ✅ Tabela renderiza dados corretamente
- [ ] ✅ Filtros funcionam
- [ ] ✅ Exportação funciona
- [ ] ✅ Logo aparece corretamente (48x48px)
- [ ] ✅ Campos customizados são criados automaticamente
- [ ] ✅ Edição inline funciona
- [ ] ✅ Domínio personalizado configurado (opcional)
- [ ] ✅ SSL ativo (HTTPS)
- [ ] ✅ Monitoramento configurado

---

## 🆘 Suporte

### Documentação Oficial:
- **Render**: https://render.com/docs
- **Railway**: https://docs.railway.app
- **Vercel**: https://vercel.com/docs
- **Neon**: https://neon.tech/docs/introduction
- **Firebase**: https://firebase.google.com/docs/auth

### Comunidades:
- **Render Community**: https://community.render.com
- **Railway Discord**: https://discord.gg/railway
- **Stack Overflow**: Tag "render", "railway", etc.

### Para Problemas no Código:
1. Verifique logs da plataforma
2. Teste localmente: `npm run dev`
3. Verifique variáveis de ambiente
4. Confirme que build funciona: `npm run build`

---

**Última atualização**: 2025-11-04
**Versão do projeto**: 1.0.0
**Node.js**: 20+
**PostgreSQL**: 16

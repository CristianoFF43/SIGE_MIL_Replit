# 🚀 Deploy Rápido - SIGE-MIL

**Guia resumido para deploy do projeto.**

---

## 📋 Pré-requisitos

### 1. Preparar Repositório GitHub
```bash
# No diretório do projeto
git init
git add .
git commit -m "Preparar para deploy"

# Criar repositório no GitHub (github.com)
# Depois:
git remote add origin https://github.com/seu-usuario/SIGE-MIL.git
git push -u origin main
```

### 2. Criar Banco de Dados (Neon)
```
1. https://neon.tech → Sign Up com GitHub
2. Create Project → "sige-mil" → PostgreSQL 16
3. Copie Connection String
   Formato: postgresql://user:pass@host/db?sslmode=require
```

### 3. Configurar Firebase
```
1. https://console.firebase.google.com
2. Add Project → "SIGE-MIL"
3. Authentication → Sign-in method → Ativar Google
4. Project Settings → Your apps → Web → Copiar:
   - apiKey → VITE_FIREBASE_API_KEY
   - projectId → VITE_FIREBASE_PROJECT_ID
   - appId → VITE_FIREBASE_APP_ID
```

---

## ⚡ OPÇÃO 1: Render (Gratuito)

**Melhor custo-benefício** - Grátis para começar

### Passos Rápidos:

**1. Criar Database**
```
render.com → New+ → PostgreSQL → Free
Copie External Database URL
```

**2. Criar Web Service**
```
New+ → Web Service → Connect GitHub → Selecione SIGE-MIL

Configurações:
- Build: npm install && npm run build
- Start: npm start
- Plan: Free

Variáveis (ANTES de criar):
DATABASE_URL=(do passo 1)
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_API_KEY
NODE_ENV=production
SESSION_SECRET=(string aleatória)
```

**3. Criar e Aguardar**
```
Create Web Service → Aguarde 5-7min
```

**4. Aplicar Schema**
```
Dashboard → Serviço → Shell
npm run db:push
```

**5. Autorizar Domínio no Firebase**
```
Firebase Console → Authentication → Settings
Add domain: sige-mil.onrender.com
```

✅ **Pronto!** App em: `https://sige-mil.onrender.com`

**Limitações Free:**
- Dorme após 15min de inatividade
- Cold start de ~30-60s

**Upgrade: $7/mês** (sem cold start)

---

## 🏢 OPÇÃO 2: Railway (Profissional)

**Melhor performance** - ~$10-15/mês

### Passos Rápidos:

**1. Criar Projeto**
```
railway.app → Login com GitHub
New Project → Deploy from GitHub → SIGE-MIL
```

**2. Adicionar PostgreSQL**
```
+ New → Database → PostgreSQL
(Criado automaticamente em 10s)
```

**3. Configurar Variáveis**
```
Clique no serviço → Variables tab

DATABASE_URL=${{Postgres.DATABASE_URL}}
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_API_KEY
NODE_ENV=production
SESSION_SECRET=(string aleatória)
PORT=5000
```

**4. Configurar Build**
```
Settings → Build:
- Build Command: npm install && npm run build
- Start Command: npm start
```

**5. Deploy Automático**
```
Railway detecta mudanças e faz deploy
Aguarde 3-5min
```

**6. Aplicar Schema**
```
Opção A: Settings → Custom Start Command:
npm run db:push && npm start

Opção B: Railway CLI:
npm install -g @railway/cli
railway login
railway link
railway run npm run db:push
```

**7. Obter URL**
```
Settings → Domains → Generate Domain
Copie: sige-mil-production.up.railway.app
```

**8. Autorizar Domínio no Firebase**
```
Firebase Console → Authentication → Settings
Add domain: sige-mil-production.up.railway.app
```

✅ **Pronto!** App em: `https://sige-mil-production.up.railway.app`

**Vantagens:**
- Sem cold starts
- Métricas e logs excelentes
- Rollback com 1 clique

**Custo:**
- $5 grátis/mês trial
- Depois: ~$10-15/mês (pay-as-you-go)

---

## 🌐 OPÇÃO 3: VPS (DigitalOcean/Contabo)

**Controle total** - $5-6/mês

### Passos Rápidos (Ubuntu 22.04):

**1. Criar Droplet**
```
digitalocean.com → Create Droplet
Ubuntu 22.04, $6/mês (1GB RAM)
Anote IP: 123.456.789.10
```

**2. SSH e Setup**
```bash
ssh root@123.456.789.10

# Instalar tudo
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql nginx
npm install -g pm2

# Usuário
adduser sige
usermod -aG sudo sige
su - sige
```

**3. PostgreSQL**
```bash
sudo -u postgres psql
CREATE DATABASE sige_mil;
CREATE USER sige_admin WITH PASSWORD 'senha-forte';
GRANT ALL PRIVILEGES ON DATABASE sige_mil TO sige_admin;
\q
```

**4. Deploy App**
```bash
cd /home/sige
git clone https://github.com/seu-usuario/SIGE-MIL.git
cd SIGE-MIL
npm install

# Criar .env com todas variáveis
nano .env

npm run build
npm run db:push
pm2 start npm --name "sige-mil" -- start
pm2 save && pm2 startup
```

**5. Nginx**
```bash
sudo nano /etc/nginx/sites-available/sige-mil
# Cole configuração (ver GUIA_DEPLOY.md)

sudo ln -s /etc/nginx/sites-available/sige-mil /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**6. SSL**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

✅ **Pronto!** App em: `https://seu-dominio.com`

---

## 🔥 Firebase - Autorizar Domínios

**IMPORTANTE:** Sempre que deployar, autorize o domínio:

```
1. Firebase Console → Authentication → Settings
2. Authorized domains → Add domain
3. Adicione (SEM https://):
   - sige-mil.onrender.com (Render)
   - sige-mil-production.up.railway.app (Railway)
   - seu-dominio.com (VPS)
```

---

## ✅ Checklist Pós-Deploy

- [ ] App carrega sem erro
- [ ] Login funciona
- [ ] Dashboard renderiza
- [ ] Importação funciona
- [ ] Tabela mostra dados
- [ ] Filtros funcionam
- [ ] Exportação funciona

---

## 🔧 Problemas Comuns

### ❌ "DATABASE_URL not found"
→ Verifique variáveis de ambiente na plataforma

### ❌ "Firebase configuration not found"
→ Variáveis VITE_* devem ter prefixo VITE_
→ Redesployar após adicionar

### ❌ "Domain not authorized" (Firebase)
→ Firebase Console → Add domain (sem https://)

### ❌ Cold start lento (Render Free)
→ Upgrade para Starter ($7/mês)
→ Ou use UptimeRobot.com (ping grátis)

### ❌ Build falha
→ Limpar cache: Render Settings → "Clear build cache"
→ Railway: Redeploy

---

## 📊 Comparação Rápida

| | Render | Railway | VPS |
|---|---|---|---|
| **Facilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Custo** | Grátis | $10/mês | $6/mês |
| **Cold Start** | Sim (free) | Não | Não |
| **Setup** | 15min | 15min | 30min |
| **Controle** | Médio | Médio | Total |

---

## 🎯 Recomendação

### **Para começar grátis:**
→ **Render** (Opção 1)

### **Para produção séria:**
→ **Railway** (Opção 2)

### **Para controle total:**
→ **VPS** (Opção 3)

---

## 📚 Documentação Completa

Ver `GUIA_DEPLOY.md` para:
- Instruções detalhadas
- Troubleshooting completo
- Configuração avançada
- Vercel + Backend separado

---

**Última atualização**: 2025-11-04

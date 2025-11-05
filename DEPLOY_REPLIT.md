# 🚀 Guia de Deploy no Replit - SIGE MIL

## 📋 Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

- ✅ O arquivo `.replit` está configurado
- ✅ As otimizações de performance foram aplicadas
- ✅ O código está atualizado no GitHub
- ✅ Você tem acesso ao projeto no Replit

---

## 🔄 Passo 1: Atualizar o Código no Replit

### Opção A: Via Shell do Replit (Recomendado)

1. Abra o projeto no Replit: https://replit.com/@seu-usuario/SIGE-MIL
2. Clique em "Shell" (aba inferior)
3. Execute os comandos:

```bash
# Parar o servidor se estiver rodando
# (Clique no botão "Stop" no topo)

# Atualizar código do GitHub
git fetch origin
git reset --hard origin/main

# Instalar dependências (se houver mudanças)
npm install
```

### Opção B: Via Interface do Replit

1. Acesse o projeto no Replit
2. Clique em "Tools" > "Git"
3. Clique em "Pull" para baixar as atualizações

---

## ⚙️ Passo 2: Verificar Secrets (Variáveis de Ambiente)

### Secrets Obrigatórios:

1. Clique no ícone de **cadeado** 🔒 na barra lateral esquerda (Secrets)
2. Verifique se estas variáveis existem:

| Variável | Valor | Onde Encontrar |
|----------|-------|----------------|
| `DATABASE_URL` | `postgresql://...` | Neon Dashboard (Connection String) |
| `VITE_FIREBASE_PROJECT_ID` | `sige-mil` | Firebase Console > Project Settings |
| `VITE_FIREBASE_APP_ID` | `1:433141889027:web:...` | Firebase Console > Project Settings |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Firebase Console > Project Settings |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...@sige-mil.iam.gserviceaccount.com` | Firebase Console > Service Accounts |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Firebase Console > Service Accounts |
| `IMPORT_INITIAL_DATA` | `false` | ⚠️ **Importante para performance!** |

### Adicionar Secrets (se não existirem):

1. Clique em "+ New Secret"
2. Digite o nome da variável em "Key"
3. Cole o valor em "Value"
4. Clique em "Add Secret"

---

## 🧪 Passo 3: Testar em Desenvolvimento

Antes de publicar em produção, teste localmente no Replit:

```bash
# No Shell do Replit, execute:
npm run dev
```

**O que esperar:**
- Servidor inicia em ~2-3 segundos
- Console mostra: `serving on 0.0.0.0:5000`
- Acesse a URL de preview do Replit (abre automaticamente)
- Teste o login e navegação básica

**Se tiver erros:**
- Verifique se todas as Secrets estão configuradas
- Verifique se `IMPORT_INITIAL_DATA=false` está definido
- Verifique os logs no console

---

## 🌐 Passo 4: Deploy em Produção

### 4.1. Preparar o Deploy

1. No Replit, clique no botão **"Stop"** (se o servidor estiver rodando)
2. Verifique se o arquivo `.replit` existe (deve aparecer na lista de arquivos)

### 4.2. Fazer o Deploy

**Opção 1: Deploy via Interface (Recomendado)**

1. Clique na aba **"Deploy"** no topo do Replit
2. Clique em **"Deploy"** novamente na página que abrir
3. Aguarde o build (pode levar 2-5 minutos)
4. Quando concluído, você verá a URL de produção

**Opção 2: Deploy via Shell**

```bash
# No Shell, execute:
replit deploy
```

### 4.3. O que acontece no Deploy?

O Replit executará automaticamente (configurado no `.replit`):

```bash
npm run build   # Compila o frontend e backend
npm start       # Inicia o servidor em modo produção
```

---

## ✅ Passo 5: Verificar o Deploy

### Após o Deploy:

1. Acesse a URL de produção fornecida pelo Replit
   - Formato: `https://seu-projeto.seu-usuario.repl.co`
2. Teste o login
3. Verifique se os dados carregam rapidamente
4. Navegue entre as páginas principais

### Checklist de Verificação:

- [ ] Login funciona (Firebase Auth)
- [ ] Lista de militares carrega rapidamente (< 2s)
- [ ] Dashboard exibe gráficos
- [ ] Companhias mostram dados corretos
- [ ] Exportação funciona (Excel/PDF)
- [ ] Sem erros no console do navegador (F12)

---

## 🔧 Solução de Problemas

### Problema 1: Deploy Falha com Erro de Build

**Sintomas:**
```
Error: Cannot find module 'xyz'
```

**Solução:**
```bash
# No Shell do Replit:
rm -rf node_modules package-lock.json
npm install
replit deploy
```

---

### Problema 2: Site em Branco Após Deploy

**Sintomas:**
- URL abre, mas página fica em branco
- Console mostra erros 404

**Solução:**
```bash
# Verificar se o build foi feito:
ls -la dist/

# Se a pasta dist/ estiver vazia, fazer build manual:
npm run build

# Depois, fazer deploy novamente:
replit deploy
```

---

### Problema 3: Carregamento Lento (> 5s)

**Sintomas:**
- Página demora muito para carregar
- Queries levam segundos

**Possíveis causas:**

1. **IMPORT_INITIAL_DATA não está desabilitado**
   - Verificar Secret: deve ser `false`
   - Reiniciar o deploy

2. **Banco de dados hibernando** (plano gratuito do Neon)
   - Primeira query após inatividade leva 2-3s para "acordar" o banco
   - Queries seguintes serão rápidas
   - Considere upgrade para plano pago do Neon

3. **Banco em região distante**
   - Banco atual: EU Central (Frankfurt, Alemanha)
   - Considere migrar para US East (Ohio) ou US West (Oregon)
   - Ver: `PERFORMANCE.md` para instruções

---

### Problema 4: Erro de Autenticação

**Sintomas:**
```
Firebase: Error (auth/invalid-api-key)
```

**Solução:**
1. Verifique se todos os Secrets do Firebase estão corretos
2. Verifique se o domínio do Replit está autorizado no Firebase Console
3. Firebase Console > Authentication > Settings > Authorized domains
4. Adicione: `seu-projeto.seu-usuario.repl.co`

---

### Problema 5: Banco de Dados Não Conecta

**Sintomas:**
```
Error: DATABASE_URL must be set
```

**Solução:**
1. Verifique se o Secret `DATABASE_URL` existe
2. Teste a conexão no Neon Dashboard
3. Se o projeto Neon estiver pausado, reative-o
4. Obtenha uma nova Connection String se necessário

---

## 📊 Monitoramento Pós-Deploy

### Verificar Logs em Tempo Real:

1. No Replit, clique em "Console" (aba inferior)
2. Observe os logs enquanto usa o site
3. Procure por erros ou warnings

### Logs Esperados (Normais):

```
serving on 0.0.0.0:5000
GET /api/militares 200 in 300ms
POST /api/auth/user 200 in 150ms
```

### Logs de Erro (Investigar):

```
Error: Connection refused
Error: Token expired
Error: Permission denied
```

---

## 🔄 Atualizações Futuras

Para atualizar o site com novas mudanças:

1. Faça as mudanças no código localmente
2. Commit e push para o GitHub:
   ```bash
   git add .
   git commit -m "descrição das mudanças"
   git push
   ```
3. No Replit, puxe as atualizações:
   ```bash
   git pull origin main
   npm install  # se houver mudanças no package.json
   ```
4. Faça o deploy novamente:
   ```bash
   replit deploy
   ```

---

## 📈 Melhorias Futuras (Opcional)

### Performance:

- [ ] Migrar banco para região US (veja `PERFORMANCE.md`)
- [ ] Adicionar índices no banco de dados
- [ ] Implementar cache Redis
- [ ] Ativar CDN no Replit (se disponível)

### Segurança:

- [ ] Configurar domínio customizado (ex: sigemil.com.br)
- [ ] Adicionar SSL customizado
- [ ] Configurar rate limiting
- [ ] Implementar backup automático do banco

### Features:

- [ ] Sistema de notificações
- [ ] Exportação agendada de relatórios
- [ ] Integração com Google Drive
- [ ] Dashboard em tempo real

---

## 📞 Suporte

Se encontrar problemas não listados aqui:

1. Verifique os logs no Console do Replit
2. Verifique o Network tab do navegador (F12)
3. Consulte a documentação:
   - `RECUPERAR_ACESSO.md` - Problemas de login
   - `PERFORMANCE.md` - Problemas de lentidão
   - `ONDE_ACHAR_CREDENCIAIS.md` - Onde encontrar credenciais

---

**Última atualização:** 2025-11-05  
**Autor:** Claude Code  
**Status:** ✅ Pronto para produção

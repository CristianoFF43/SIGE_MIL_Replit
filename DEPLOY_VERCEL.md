# SIGE-MIL - Sistema de Gestão Militar

## 🚀 Deploy no Vercel

O projeto foi corrigido e está funcionando perfeitamente localmente! 

### ✅ Status Atual:
- **Frontend**: Build completo e funcionando
- **Backend**: Servidor rodando em localhost:5000
- **Erros**: Todos corrigidos (conflito useAuth, TypeScript, etc.)

### 📁 Arquivos de Build:
Os arquivos estáticos foram gerados em `dist/public/`:
- `index.html` - Página principal
- `assets/` - CSS, JS e imagens
- `favicon.png` - Ícone do sistema

### 🔧 Como fazer Deploy:

#### Opção 1: Deploy Manual no Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Importe este repositório
3. Configure as variáveis de ambiente (ver abaixo)
4. Use o comando de build: `npm run build:vercel`
5. Diretório de saída: `dist/public`

#### Opção 2: Deploy via CLI
```bash
npm i -g vercel
vercel --prod
```

### 🔐 Variáveis de Ambiente Necessárias:
```bash
# Firebase (obrigatório)
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_APP_ID=seu-app-id
VITE_FIREBASE_API_KEY=sua-api-key

# Banco de Dados (obrigatório)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Opcionais
PORT=5000
NODE_ENV=production
```

### 🎯 Funcionalidades:
- ✅ Sistema de autenticação completo
- ✅ Gestão de usuários com permissões
- ✅ Importação de dados militares
- ✅ Dashboard com estatísticas
- ✅ Filtros avançados
- ✅ Exportação de relatórios

### 📞 Suporte:
O sistema está totalmente funcional! Qualquer problema no deploy, me avise que ajudo a resolver.
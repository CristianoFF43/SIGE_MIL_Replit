#!/bin/bash
# Script de deploy manual para Vercel

echo "🚀 Iniciando deploy do SIGE-MIL para Vercel..."

# 1. Build do projeto
echo "📦 Fazendo build do projeto..."
npm run build:vercel

# 2. Verificar se o build foi bem sucedido
if [ $? -eq 0 ]; then
    echo "✅ Build realizado com sucesso!"
    echo "📁 Arquivos gerados em: dist/public/"
    echo ""
    echo "🎯 Próximos passos:"
    echo "1. Acesse: https://vercel.com"
    echo "2. Clique em 'New Project'"
    echo "3. Importe este repositório"
    echo "4. Configure as variáveis de ambiente"
    echo "5. Use comando de build: npm run build:vercel"
    echo "6. Diretório de saída: dist/public"
    echo ""
    echo "🔐 Variáveis de ambiente necessárias:"
    echo "- VITE_FIREBASE_PROJECT_ID"
    echo "- VITE_FIREBASE_APP_ID" 
    echo "- VITE_FIREBASE_API_KEY"
    echo "- DATABASE_URL"
    echo ""
    echo "✨ O deploy deve funcionar perfeitamente!"
else
    echo "❌ Erro no build. Verifique os logs acima."
fi
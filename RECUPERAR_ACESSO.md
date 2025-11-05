# 🔧 Guia de Recuperação de Acesso - SIGE MIL

## Situação: Não consigo acessar o sistema

Este guia ajuda você a recuperar acesso ao sistema quando todos os usuários foram removidos do Firebase ou quando você não consegue fazer login.

---

## ✅ Solução Rápida (3 passos)

### 1️⃣ Criar Usuário Admin no Banco de Dados

```bash
npm run create-admin
```

**O que esse comando faz:**
- Cria um usuário administrador diretamente no banco de dados
- Gera um ID único para o usuário
- Mostra instruções de como proceder

### 2️⃣ Escolher Método de Autenticação

Você tem **2 opções**:

---

## 🅰️ OPÇÃO A: Firebase Authentication (Produção)

### Passo a Passo:

1. **Execute o script de criação:**
   ```bash
   npm run create-admin
   ```

2. **Copie o ID gerado** (será algo como: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

3. **Acesse o Firebase Console:**
   - URL: https://console.firebase.google.com
   - Selecione seu projeto

4. **Vá em Authentication > Users**

5. **Adicione um novo usuário:**
   - Clique em "Add user"
   - Email: `admin@sigemil.local` (ou o email mostrado no script)
   - Senha: Defina uma senha segura
   - Clique em "Add user"

6. **IMPORTANTE - Editar o UID:**
   - Após criar o usuário, clique nele
   - Cole o ID gerado no passo 2 como o UID do usuário
   - Salve

7. **Faça login no sistema:**
   - Use o email: `admin@sigemil.local`
   - Use a senha que você definiu
   - ✅ Pronto! Você terá acesso total como administrador

---

## 🅱️ OPÇÃO B: Modo de Teste (Desenvolvimento)

**⚠️ Use apenas em ambiente de desenvolvimento!**

### Passo a Passo:

1. **Execute o script de criação:**
   ```bash
   npm run create-admin
   ```

2. **Configure as variáveis de ambiente:**
   - Se não existir, crie o arquivo `.env`:
     ```bash
     copy .env.example .env
     ```

   - Edite o arquivo `.env` e adicione/modifique:
     ```env
     TEST_AUTH_ENABLED=true
     VITE_TEST_MODE=true
     TEST_AUTH_SECRET=test-secret-123
     ```

3. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

4. **Acesse a tela de login:**
   - Você verá um botão "Test Login (Auto)"
   - Clique nele
   - Digite o email: `admin@sigemil.local`
   - ✅ Login automático com acesso de administrador

---

## 🔍 Verificar se deu certo

Após fazer login, verifique:

1. ✅ Você está logado (vê o nome "Admin Sistema" no canto superior direito)
2. ✅ Consegue acessar todas as páginas (Dashboard, Militares, Relatórios, Usuários)
3. ✅ No menu "Usuários", você vê o usuário admin criado
4. ✅ O role do usuário é "administrator"

---

## 🚨 Solução de Problemas

### Problema: "Usuário não encontrado" ao fazer login

**Causa:** O Firebase não está sincronizado com o banco de dados.

**Solução:**
- Se usando Firebase (Opção A): Verifique se o UID do usuário no Firebase é EXATAMENTE o mesmo do ID gerado
- Se usando Teste (Opção B): Verifique se as variáveis de ambiente estão corretas

### Problema: Servidor demora muito para iniciar

**Causa:** Tentando conectar ao banco de dados que está lento ou indisponível.

**Solução:**
1. Verifique se o `DATABASE_URL` no `.env` está correto
2. Teste a conexão com o banco:
   ```bash
   npm run db:push
   ```
3. Se o banco estiver no Neon, verifique se está ativo no dashboard

### Problema: "Scripts npm não funcionam no Windows"

**Causa:** Já corrigido! Instalamos o `cross-env`.

**Solução:**
```bash
npm install
npm run dev
```

---

## 📋 Checklist Final

Antes de entrar em contato para suporte, verifique:

- [ ] Executei `npm install`
- [ ] Executei `npm run create-admin`
- [ ] Escolhi uma opção (A ou B) e segui TODOS os passos
- [ ] Verifiquei se o `.env` existe e tem as variáveis corretas
- [ ] Reiniciei o servidor após mudanças no `.env`
- [ ] Tentei fazer login com o email correto (`admin@sigemil.local`)

---

## 🎯 Próximos Passos (Após Recuperar Acesso)

1. **Criar um usuário normal:**
   - Vá em "Usuários" > "Adicionar Usuário"
   - Crie um usuário com seu email real
   - Defina role "administrator"

2. **Desativar modo de teste (se usou Opção B):**
   - Edite `.env`
   - Mude para: `TEST_AUTH_ENABLED=false` e `VITE_TEST_MODE=false`
   - Reinicie o servidor

3. **Fazer backup do banco de dados:**
   - Configure backups automáticos no Neon
   - Ou exporte periodicamente via `pg_dump`

---

## 📞 Suporte

Se ainda tiver problemas:

1. Verifique os logs do servidor no terminal
2. Abra o console do navegador (F12) e veja se há erros
3. Tire screenshots dos erros
4. Revise as configurações do Firebase

---

**Criado em:** 2025-11-05
**Versão:** 1.0
**Atualizado por:** Claude Code

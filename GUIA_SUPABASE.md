# Guia Rápido: Como Configurar o Supabase

Este guia é para você criar seu banco de dados no Supabase e pegar a URL correta para colocar na Vercel.

## Passo 1: Criar o Projeto

1.  Acesse [supabase.com](https://supabase.com) e faça login.
2.  Clique no botão verde **"New Project"**.
3.  Escolha sua organização (se pedir).
4.  Preencha o formulário:
    *   **Name:** `SIGE_MIL` (ou o que preferir).
    *   **Database Password:** Crie uma senha forte e **ANOTE ELA AGORA**. Você vai precisar dela daqui a pouco e o Supabase *não mostra ela de novo*.
    *   **Region:** Escolha `South America (São Paulo)` para ficar mais rápido.
5.  Clique em **"Create new project"**.
6.  Aguarde alguns minutos enquanto ele configura tudo (pode levar uns 2-3 minutos).

## Passo 2: Pegar a URL de Conexão (DATABASE_URL)

Assim que o projeto estiver criado (tela verde de "Project Active"):

1.  No menu lateral esquerdo, procure pelo ícone de engrenagem ⚙️ (**Project Settings**).
2.  Dentro das configurações, clique na aba **"Database"**.
3.  Role a página para baixo até achar a seção **"Connection String"**.
4.  Clique na aba **"URI"** (não use JDBC nem .NET).
5.  Certifique-se de que **"Mode"** esteja como **"Transaction"** (recomendado para Vercel) ou "Session". O Transaction (porta 6543) é melhor.
6.  Copie a URL inteira. Ela vai se parecer com isso:
    ```
    postgres://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
    ```

## Passo 3: Ajustar a Senha

A URL que você copiou tem um pedaço escrito `[YOUR-PASSWORD]` (ou similar).

1.  Cole a URL em um bloco de notas.
2.  Apague a parte `[YOUR-PASSWORD]` (incluindo os colchetes).
3.  Escreva a senha que você criou no **Passo 1**.

**Exemplo Final:**
Se sua senha for `MinhaSenha123`, a URL final ficará assim:
`postgres://postgres.abcdef:MinhaSenha123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

## Passo 4: Colocar na Vercel

1.  Vá na Vercel, nas **Environment Variables**.
2.  Chave (Name): `DATABASE_URL`
3.  Valor (Value): A URL final que você montou no passo 3.

Pronto! Seu banco Supabase está configurado.

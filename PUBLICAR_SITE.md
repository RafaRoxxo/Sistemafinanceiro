# 🌐 Como Publicar Seu Sistema Financeiro Como Site

## 📱 O que você vai ter no final:

Um site tipo: **https://sistema-financeiro.vercel.app**

Que qualquer pessoa pode acessar pelo navegador (computador ou celular)!

---

## 🎯 PASSO A PASSO

### PARTE 1: Publicar o Backend (5 minutos)

#### 1. Abra o Terminal e instale as ferramentas

```bash
npm install -g supabase
```

#### 2. Faça login no Supabase

```bash
supabase login
```

Isso vai abrir o navegador. Clique em **"Authorize"**.

#### 3. Conecte com seu projeto

```bash
supabase link --project-ref ikhynelmjichndpeyklx
```

Se pedir senha do banco de dados, entre em:
- https://supabase.com/dashboard/project/ikhynelmjichndpeyklx/settings/database
- Copie a senha que você criou quando fez o projeto

#### 4. Publique o servidor

```bash
supabase functions deploy make-server-808cc1b6
```

✅ **Pronto! Seu backend está online!**

---

### PARTE 2: Publicar o Site (5 minutos)

Vou te mostrar **3 opções**. Escolha a mais fácil para você:

---

## 🟢 OPÇÃO 1: Vercel (Mais Fácil - RECOMENDADO)

### Passo 1: Criar conta no Vercel

1. Acesse: https://vercel.com
2. Clique em **"Sign Up"**
3. Escolha **"Continue with GitHub"** (ou Email)

### Passo 2: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 3: Fazer login

```bash
vercel login
```

Confirme no email que você receber.

### Passo 4: Publicar o site

```bash
vercel
```

**Responda as perguntas:**
- `Set up and deploy?` → **Y** (Yes)
- `Which scope?` → Escolha sua conta (seta para baixo + Enter)
- `Link to existing project?` → **N** (No)
- `What's your project's name?` → **sistema-financeiro** (ou o nome que quiser)
- `In which directory is your code located?` → **.** (apenas Enter)
- `Want to override the settings?` → **N** (No)

Aguarde... ele vai fazer o build e publicar!

### Passo 5: Abrir seu site

Vai aparecer algo como:

```
✅ Production: https://sistema-financeiro.vercel.app
```

**Copie essa URL!** Esse é seu site online! 🎉

### Passo 6: Configurar o link de recuperação de senha

```bash
supabase secrets set APP_URL=https://sistema-financeiro.vercel.app
```

(Substitua pela URL que o Vercel te deu)

---

## 🔵 OPÇÃO 2: Netlify (Também Fácil)

### Passo 1: Criar conta no Netlify

1. Acesse: https://netlify.com
2. Clique em **"Sign up"**
3. Escolha **"GitHub"** ou **"Email"**

### Passo 2: Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

### Passo 3: Fazer login

```bash
netlify login
```

### Passo 4: Publicar

```bash
netlify deploy --prod
```

**Responda:**
- `Create & configure a new site?` → **Y**
- `Team:` → Escolha sua conta
- `Site name:` → **sistema-financeiro**
- `Publish directory:` → **dist**

Aguarde o build...

### Passo 5: Pegar a URL

Vai aparecer:

```
✅ Live URL: https://sistema-financeiro.netlify.app
```

### Passo 6: Configurar

```bash
supabase secrets set APP_URL=https://sistema-financeiro.netlify.app
```

---

## 🟣 OPÇÃO 3: GitHub Pages (100% Grátis)

### Passo 1: Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Nome: **sistema-financeiro**
3. Deixe público
4. Clique **"Create repository"**

### Passo 2: Subir o código

```bash
git init
git add .
git commit -m "Sistema financeiro completo"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sistema-financeiro.git
git push -u origin main
```

(Substitua `SEU_USUARIO` pelo seu usuário do GitHub)

### Passo 3: Configurar GitHub Pages

1. No GitHub, vá no repositório
2. **Settings → Pages**
3. Source: **GitHub Actions**
4. Crie arquivo `.github/workflows/deploy.yml`:

```bash
mkdir -p .github/workflows
```

Crie o arquivo:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Passo 4: Push

```bash
git add .
git commit -m "Add deploy workflow"
git push
```

### Passo 5: Seu site estará em:

```
https://SEU_USUARIO.github.io/sistema-financeiro
```

---

## ✅ VERIFICAR SE FUNCIONOU

Acesse seu site e teste:

1. ✅ Criar uma conta nova
2. ✅ Fazer login
3. ✅ Adicionar uma renda
4. ✅ Adicionar um gasto
5. ✅ Trocar de mês

**Se tudo funcionar = Site publicado com sucesso! 🎉**

---

## 📧 (OPCIONAL) Ativar Recuperação de Senha por Email

### Passo 1: Criar conta no Resend

1. Acesse: https://resend.com
2. **Sign Up** (grátis - 100 emails/dia)
3. Verifique seu email

### Passo 2: Pegar API Key

1. No dashboard: **API Keys**
2. **Create API Key**
3. Nome: "Sistema Financeiro"
4. **Copie a chave** (começa com `re_`)

### Passo 3: Configurar

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
```

(Cole a chave que você copiou)

✅ **Pronto! Agora os usuários podem recuperar senha por email!**

---

## 🎨 Personalizar o Domínio (Opcional)

### Se você tem um domínio próprio (ex: meusite.com):

**Vercel:**
1. Dashboard → Settings → Domains
2. Add domain: **meusite.com**
3. Configure DNS conforme instruções

**Netlify:**
1. Site settings → Domain management
2. Add custom domain
3. Configure DNS

---

## 🐛 Problemas Comuns

### "Command not found"

Instale as ferramentas:
```bash
npm install -g supabase vercel
```

### Site não carrega

Verifique se fez o build:
```bash
npm run build
```

Deve criar uma pasta `dist/` com os arquivos.

### "Failed to deploy function"

Re-tente:
```bash
supabase functions deploy make-server-808cc1b6 --no-verify-jwt
```

### Dados não salvam

Verifique se o backend está online:
```
https://ikhynelmjichndpeyklx.supabase.co/functions/v1/make-server-808cc1b6/auth/login
```

Deve retornar um JSON (mesmo que seja erro).

---

## 📊 Gerenciar Seu Site Depois

### Ver logs e erros:

**Supabase:**
```
https://supabase.com/dashboard/project/ikhynelmjichndpeyklx/logs/edge-functions
```

**Vercel:**
```
https://vercel.com/dashboard
```

### Atualizar o site:

Sempre que fizer mudanças no código:

**Vercel:**
```bash
vercel --prod
```

**Netlify:**
```bash
netlify deploy --prod
```

**GitHub Pages:**
```bash
git add .
git commit -m "Atualização"
git push
```

---

## 🎯 RESUMO SUPER RÁPIDO

```bash
# 1. Backend
supabase login
supabase link --project-ref ikhynelmjichndpeyklx
supabase functions deploy make-server-808cc1b6

# 2. Frontend (escolha um)
# Vercel:
vercel --prod

# OU Netlify:
netlify deploy --prod

# 3. Configurar
supabase secrets set APP_URL=https://sua-url-aqui.vercel.app

# 4. (Opcional) Email
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
```

---

## 🚀 Pronto!

Seu site está online e funcionando!

Compartilhe a URL com quem quiser! 🎉

**Custo: R$ 0,00/mês** (usando planos gratuitos)

# 🚀 Guia de Deploy - Sistema Financeiro

## Visão Geral

Seu projeto tem dois componentes principais:
1. **Backend** - Supabase Edge Functions (serverless)
2. **Frontend** - React/Vite (app estático)

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com) (grátis)
- Conta no [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) (grátis)
- Conta no [Resend](https://resend.com) (opcional, para emails)

---

## 🔧 Parte 1: Deploy do Backend (Supabase)

### 1.1 Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"New Project"**
3. Escolha um nome (ex: `sistema-financeiro`)
4. Defina uma senha do banco (guarde ela!)
5. Escolha a região mais próxima
6. Clique em **"Create Project"** e aguarde ~2 minutos

### 1.2 Instalar Supabase CLI

```bash
# No terminal local
npm install -g supabase

# Ou usando brew (Mac)
brew install supabase/tap/supabase
```

### 1.3 Login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para você autorizar.

### 1.4 Link com o Projeto

```bash
# Na pasta do projeto
supabase link --project-ref SEU_PROJECT_ID
```

**Como pegar o PROJECT_ID:**
- No dashboard do Supabase
- Settings → General → Project ID
- Copie o ID (algo como `abcdefghijklmnop`)

### 1.5 Deploy das Edge Functions

```bash
# Deploy da função principal
supabase functions deploy make-server-808cc1b6
```

### 1.6 Configurar Variáveis de Ambiente (Secrets)

```bash
# API Key do Resend (opcional)
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx

# URL do seu app (será a URL do Vercel/Netlify)
supabase secrets set APP_URL=https://seu-app.vercel.app
```

### 1.7 Pegar Credenciais do Supabase

No dashboard do Supabase:
1. **Settings → API**
2. Copie:
   - **Project URL** (ex: `https://abcdef.supabase.co`)
   - **anon/public key** (chave pública)

---

## 🎨 Parte 2: Deploy do Frontend

### Opção A: Vercel (Recomendado)

#### 2.1 Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2.2 Login no Vercel

```bash
vercel login
```

#### 2.3 Deploy

```bash
# Na pasta do projeto
vercel
```

Siga as instruções:
- **Set up and deploy?** → Yes
- **Which scope?** → Escolha sua conta
- **Link to existing project?** → No
- **Project name?** → sistema-financeiro (ou o que preferir)
- **Directory?** → `.` (enter)
- **Override settings?** → No

#### 2.4 Configurar Variáveis de Ambiente

No dashboard do Vercel ou via CLI:

```bash
# Project ID do Supabase
vercel env add VITE_SUPABASE_PROJECT_ID
# Cole o project ID e enter

# Public Key do Supabase
vercel env add VITE_SUPABASE_ANON_KEY
# Cole a anon key e enter
```

Ou crie um arquivo `.env.production`:

```env
VITE_SUPABASE_PROJECT_ID=abcdefghijklmnop
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2.5 Redeploy com as Variáveis

```bash
vercel --prod
```

### Opção B: Netlify

#### 2.1 Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2.2 Login e Deploy

```bash
netlify login
netlify init
```

#### 2.3 Configurar Build

Quando perguntado:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

#### 2.4 Adicionar Variáveis de Ambiente

No dashboard do Netlify:
1. Site settings → Environment variables
2. Adicione:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_ANON_KEY`

#### 2.5 Deploy

```bash
netlify deploy --prod
```

---

## 🔗 Parte 3: Conectar Tudo

### 3.1 Atualizar o Frontend

Crie/edite o arquivo `/utils/supabase/info.ts`:

```typescript
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "SEU_PROJECT_ID";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "SUA_ANON_KEY";
```

### 3.2 Atualizar APP_URL no Supabase

Depois que o Vercel/Netlify der a URL final:

```bash
supabase secrets set APP_URL=https://seu-app.vercel.app
```

### 3.3 Testar

1. Acesse a URL do seu app
2. Crie uma conta
3. Teste login
4. Teste recuperação de senha (se configurou Resend)

---

## 🔐 Configurar Email (Resend)

### 4.1 Criar Conta no Resend

1. Acesse [https://resend.com](https://resend.com)
2. Crie conta grátis (100 emails/dia)

### 4.2 Pegar API Key

1. Dashboard → API Keys
2. Create API Key
3. Copie a chave

### 4.3 Configurar no Supabase

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
```

### 4.4 (Opcional) Configurar Domínio

1. Resend → Domains
2. Add Domain
3. Configure DNS records
4. Atualize o código para usar `noreply@seudominio.com`

---

## 📝 Checklist Final

- [ ] Projeto criado no Supabase
- [ ] Edge Function deployada (`supabase functions deploy`)
- [ ] Secrets configurados (RESEND_API_KEY, APP_URL)
- [ ] Project ID e Anon Key copiados
- [ ] Frontend deployado (Vercel/Netlify)
- [ ] Variáveis de ambiente configuradas no frontend
- [ ] APP_URL atualizado com URL final
- [ ] Testado criação de conta
- [ ] Testado login
- [ ] Testado recuperação de senha

---

## 🐛 Troubleshooting

### "Edge Function não encontrada"

```bash
# Re-deploy
supabase functions deploy make-server-808cc1b6 --no-verify-jwt
```

### "CORS error"

O Supabase Edge Functions já tem CORS habilitado. Se der erro:
1. Verifique se está usando a URL correta do projeto
2. Limpe cache do navegador

### "Variáveis de ambiente não funcionam"

```bash
# Verificar secrets
supabase secrets list

# Re-configurar
supabase secrets unset NOME_DA_SECRET
supabase secrets set NOME_DA_SECRET=novo_valor
```

### Build do frontend falha

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🎯 URLs Importantes

Depois do deploy, você terá:

- **Frontend:** `https://seu-app.vercel.app`
- **Backend:** `https://SEU_PROJECT_ID.supabase.co/functions/v1/make-server-808cc1b6`
- **Supabase Dashboard:** `https://supabase.com/dashboard/project/SEU_PROJECT_ID`

---

## 💰 Custos

- **Supabase Free Tier:** 500MB database, 2GB bandwidth, Edge Functions incluídas
- **Vercel Free Tier:** Deploy ilimitado, 100GB bandwidth
- **Resend Free Tier:** 100 emails/dia

**Total: R$ 0,00/mês** para uso pessoal! 🎉

---

## 🚀 Deploy Rápido (TL;DR)

```bash
# 1. Backend
supabase login
supabase link --project-ref SEU_PROJECT_ID
supabase functions deploy make-server-808cc1b6
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set APP_URL=https://seu-app.vercel.app

# 2. Frontend
vercel login
vercel
# Configure as variáveis de ambiente no dashboard
vercel --prod
```

Pronto! 🎉

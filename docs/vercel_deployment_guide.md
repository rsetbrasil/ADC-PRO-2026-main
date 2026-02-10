# Guia de Deploy na Vercel com Supabase

Este guia explica como fazer o deploy da aplicação na Vercel usando Supabase PostgreSQL como banco de dados.

---

## Pré-requisitos

- ✅ Conta na Vercel (https://vercel.com)
- ✅ Conta no Supabase (https://supabase.com)
- ✅ Projeto no GitHub
- ✅ Dados já migrados para o Supabase

---

## Passo 1: Preparar o Código para Deploy

### 1.1 Verificar Schema do Prisma

O `prisma/schema.prisma` já está configurado para PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 1.2 Commit e Push para o GitHub

```bash
git add .
git commit -m "Preparando para deploy na Vercel"
git push origin main
```

---

## Passo 2: Obter Credenciais do Supabase

### 2.1 Acessar o Dashboard do Supabase

1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto: `hnpschlfoecpddoydnuv`

### 2.2 Obter a Connection String

1. Vá em **Settings** → **Database**
2. Role até **Connection string** → **URI**
3. Selecione **Transaction** mode
4. Copie a string que parece com:
   ```
   postgresql://postgres.hnpschlfoecpddoydnuv:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
5. **Substitua `[YOUR-PASSWORD]`** pela senha do seu banco

---

## Passo 3: Configurar Projeto na Vercel

### 3.1 Importar Projeto

1. Acesse: https://vercel.com/new
2. Clique em **Import Git Repository**
3. Selecione seu repositório do GitHub
4. Clique em **Import**

### 3.2 Configurar Build Settings

A Vercel detectará automaticamente que é um projeto Next.js. Mantenha as configurações padrão:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### 3.3 Adicionar Environment Variables

Clique em **Environment Variables** e adicione:

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres.hnpschlfoecpddoydnuv:[SUA-SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `JWT_SECRET` | Gere com: `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hnpschlfoecpddoydnuv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

> **Importante:** Marque todas como **Production**, **Preview** e **Development**

### 3.4 Deploy

Clique em **Deploy** e aguarde o build completar.

---

## Passo 4: Executar Migrações no Supabase

### 4.1 Via Vercel CLI (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link ao projeto
vercel link

# Executar Prisma Generate
vercel env pull .env.production
npx prisma generate

# Executar Prisma DB Push
npx prisma db push
```

### 4.2 Via Supabase SQL Editor (Alternativa)

1. Acesse: https://supabase.com/dashboard/project/hnpschlfoecpddoydnuv/sql
2. Execute o SQL gerado pelo Prisma:
   ```bash
   npx prisma migrate dev --create-only
   ```
3. Copie o SQL gerado e execute no SQL Editor

---

## Passo 5: Verificar Deploy

### 5.1 Acessar a Aplicação

A Vercel fornecerá uma URL como:
```
https://seu-projeto.vercel.app
```

### 5.2 Testar Funcionalidades

- ✅ Login de usuários
- ✅ Listagem de produtos
- ✅ Criação de pedidos
- ✅ Visualização de clientes

---

## Passo 6: Configurar Domínio Personalizado (Opcional)

1. Vá em **Settings** → **Domains**
2. Adicione seu domínio
3. Configure os DNS conforme instruções da Vercel

---

## Troubleshooting

### Erro: "Can't reach database server"

**Solução:**
- Verifique se a `DATABASE_URL` está correta
- Confirme que a senha do Supabase está correta
- Verifique se o Supabase não está pausado

### Erro: "Prisma Client not generated"

**Solução:**
Adicione script de build no `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### Erro: "Module not found"

**Solução:**
```bash
# Limpar cache e reinstalar
rm -rf .next node_modules
npm install
```

---

## Manutenção

### Atualizar Código

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

A Vercel fará deploy automaticamente!

### Ver Logs

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Deployments**
4. Clique no deployment
5. Veja os logs em **Functions** ou **Build Logs**

---

## Custos

### Vercel
- **Hobby (Grátis):** 100GB bandwidth/mês
- **Pro ($20/mês):** Bandwidth ilimitado

### Supabase
- **Free Tier:** 500MB database, 2GB bandwidth
- **Pro ($25/mês):** 8GB database, 50GB bandwidth

---

## Próximos Passos

- [ ] Configurar domínio personalizado
- [ ] Configurar SSL (automático na Vercel)
- [ ] Configurar backups do Supabase
- [ ] Monitorar performance
- [ ] Configurar analytics

---

## Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Documentação Vercel:** https://vercel.com/docs
- **Documentação Supabase:** https://supabase.com/docs

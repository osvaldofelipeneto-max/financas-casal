# 💰 Finanças do Casal

App financeiro pessoal para o casal — lançamentos diários, contas a pagar, dashboard com saldo projetado.

---

## 🗂 Estrutura do projeto

```
financas-casal/
├── backend/          ← API Node.js (sobe no Railway)
│   ├── server.js
│   ├── database.js
│   ├── package.json
│   └── railway.toml
├── frontend/         ← App PWA (sobe no Railway ou Netlify)
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
└── README.md
```

---

## 🚀 Deploy — Passo a passo

### ETAPA 1 — Subir no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New repository**
3. Nome: `financas-casal` → clique em **Create repository**
4. Na próxima tela, clique em **uploading an existing file**
5. Arraste **toda a pasta `financas-casal`** para a área de upload
6. Clique em **Commit changes**

---

### ETAPA 2 — Deploy do Backend no Railway

1. Acesse [railway.app](https://railway.app) e faça login com GitHub
2. Clique em **New Project → Deploy from GitHub repo**
3. Selecione o repositório `financas-casal`
4. Railway vai detectar o projeto. **Importante:** clique em **Settings** e defina o **Root Directory** como `backend`
5. Aguarde o deploy (1-2 minutos)
6. Vá em **Settings → Networking → Generate Domain**
7. Copie a URL gerada — será algo como `https://financas-casal-production.up.railway.app`

> ✅ Teste: abra a URL + `/health` no navegador. Deve aparecer `{"status":"ok"}`

---

### ETAPA 3 — Deploy do Frontend no Railway

1. No mesmo projeto Railway, clique em **New Service → GitHub Repo**
2. Selecione novamente `financas-casal`
3. Em **Settings → Root Directory**, defina como `frontend`
4. Em **Settings → Deploy → Start Command**, coloque:
   ```
   npx serve . -p $PORT
   ```
5. Gere um domínio para este serviço também
6. Copie essa segunda URL — será o link do app

> Alternativamente, pode hospedar o frontend no **Netlify** (arrasta a pasta `frontend` em netlify.com/drop) — é gratuito e mais simples.

---

### ETAPA 4 — Configurar o app

1. Abra o link do frontend no celular/computador
2. Selecione seu usuário (Osvaldo ou Rebecca)
3. O app vai pedir a **URL da API** — cole a URL do backend (Etapa 2)
4. Pronto! ✅

---

### ETAPA 5 — Instalar como app no celular

**iPhone (Safari):**
1. Abra o link no Safari
2. Toque no ícone de compartilhar (□↑)
3. Toque em **"Adicionar à Tela de Início"**

**Android (Chrome):**
1. Abra o link no Chrome
2. Toque nos três pontos (⋮)
3. Toque em **"Adicionar à tela inicial"**

**Windows/Mac (Chrome):**
1. Abra o link no Chrome
2. Clique no ícone de instalar na barra de endereço (⊕)
3. Clique em **Instalar**

---

## 🔧 Rodando localmente (opcional)

```bash
# Backend
cd backend
npm install
npm run dev
# API disponível em http://localhost:3000

# Frontend
cd frontend
npx serve . -p 8080
# App disponível em http://localhost:8080
```

---

## 📱 Funcionalidades

- **Dashboard** — saldo atual, saldo projetado, alertas de vencimento
- **Lançamentos** — entradas e saídas por categoria, com histórico por mês
- **Contas a Pagar** — fixas e variáveis, marcação de pagamento, alertas
- **Sincronização** — dados compartilhados em tempo real entre os dois celulares
- **Offline** — funciona sem internet, sincroniza quando conectar
- **PWA** — instala como app nativo em qualquer dispositivo

---

## ❓ Dúvidas comuns

**A URL da API mudou. O que fazer?**
Abra o app → ⚙ Configurações → edite a URL da API.

**Esqueci de colocar o Root Directory no Railway. O que fazer?**
Vá em Settings do serviço → Root Directory → altere para `backend` ou `frontend` conforme o serviço.

**O Railway pediu cartão de crédito?**
O plano Hobby é gratuito mas exige cadastro de cartão. Não cobra nada para uso pessoal leve.

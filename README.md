# ⚡ Agenda

Sistema web para organizar o dia a dia de um eletricista e da secretária: clientes, endereços, ordens de serviço e uma **agenda semanal** com arrastar e soltar.

> Também conhecido internamente como *Tomada de Decisão* 🔌

## ✨ Funcionalidades

- 🔐 **Login** com sessão via cookie (JWT) e dois perfis: `secretaria` e `eletricista`
- 👥 **Clientes e endereços**, com histórico de observações por endereço
- 🧰 **Tipos de atividade** configuráveis (ativar, inativar, editar)
- 📋 **Ordens de serviço** com várias atividades, cada uma com data e horário
- 📅 **Agenda semanal** com arrastar para remarcar, aviso de conflito de horário e deslocamento de uma OS inteira para outro dia
- ✅ Conclusão e cancelamento de atividades
- 👤 **Gestão de usuários** (edição e exclusão restritas à secretária)

## 📚 Documentação

Requisitos, regras de negócio, domínio, decisões de arquitetura e status da implementação ficam em um vault do Obsidian: [agenda-eletrecista-obsidian](https://github.com/LuizKirsch/agenda-eletrecista-obsidian). Comece por `00 - Visão Geral.md`.

## 🛠️ Stack

| Camada   | Tecnologias |
|----------|-------------|
| Backend  | Node.js, Express 5, Sequelize, JWT, bcryptjs |
| Banco    | MySQL (produção) ou SQLite (desenvolvimento) |
| Frontend | React 19, React Router, Vite |

## 🚀 Começando

### Pré-requisitos

- Node.js 20+
- MySQL **ou** nada (usando SQLite)

### Instalação

```bash
npm install
npm --prefix client install
cp .env.example .env
```

Preencha o `.env`. O essencial:

```env
JWT_SECRET=um-valor-longo-e-aleatorio

# Usuário inicial (perfil secretaria), criado pela migration
SECRETARIA_NOME=Maria
SECRETARIA_LOGIN=maria
SECRETARIA_SENHA=troque-esta-senha
```

Gere o `JWT_SECRET` com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Para usar **SQLite** em vez de MySQL, adicione:

```env
DB_DIALECT=sqlite
DB_STORAGE=dev.sqlite
```

### Banco de dados

```bash
npm run db:migrate
```

### Rodando

```bash
npm run dev
```

Sobe a API em `http://localhost:3000` e o Vite em `http://localhost:5173` (com proxy de `/api` para a API).

### Produção

```bash
npm run build   # gera client/dist
npm start       # Express serve a API e o frontend
```

## 📜 Scripts

| Script | O que faz |
|--------|-----------|
| `npm run dev` | API (nodemon) + frontend (Vite) juntos |
| `npm start` | Sobe o servidor |
| `npm run build` | Instala e builda o frontend |
| `npm run db:migrate` | Aplica as migrations |
| `npm run db:migrate:undo` | Desfaz a última migration |

## 🗂️ Estrutura

```
├── app.js             # Express: API em /api + frontend buildado
├── server.js          # Ponto de entrada
├── config/            # Configuração do Sequelize
├── migrations/        # Estrutura do banco
├── models/            # Models Sequelize
├── routes/            # Rotas da API
├── controllers/       # Camada HTTP
├── services/          # Regras de negócio
├── middlewares/       # Autenticação, permissões e erros
└── client/            # Frontend React (Vite)
    └── src/
        ├── pages/     # Telas
        └── agenda/    # Grade semanal e modais de OS
```

## 🔌 API

Todas as rotas ficam em `/api` e, exceto `/auth/login`, exigem sessão.

| Recurso | Rotas |
|---------|-------|
| Auth | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| Usuários | `GET /usuarios` · `POST /usuarios` · `PUT /usuarios/:id` · `DELETE /usuarios/:id` |
| Clientes | `GET /clientes` · `POST /clientes` · `GET /clientes/:id` · `POST /clientes/:id/enderecos` |
| Endereços | `GET /enderecos/:id` · `GET /enderecos/:id/observacoes` · `POST /enderecos/:id/observacoes` |
| Tipos de atividade | `GET /tipos-atividade` · `POST /tipos-atividade` · `PUT /tipos-atividade/:id` · `PATCH /tipos-atividade/:id/situacao` · `DELETE /tipos-atividade/:id` |
| Agenda | `GET /agenda` |
| Ordens de serviço | `POST /os` · `GET /os/:id` · `PUT /os/:id` · `DELETE /os/:id` · `POST /os/:id/deslocar` · `POST /os/:id/concluir` |
| Atividades da OS | `PATCH /atividades-os/:id/horario` · `PATCH /atividades-os/:id/status` · `DELETE /atividades-os/:id` |

Erros voltam sempre como `{ "erro": "mensagem" }`.

Há também `GET /health` fora de `/api` para checagem do servidor.

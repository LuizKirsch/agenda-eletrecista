# Build em 2 estágios: 1) compila o React (client/dist)  2) imagem final só com o necessário para rodar a API

# ---------- Estágio 1: build do front (Vite) ----------
FROM node:22-bookworm-slim AS client
WORKDIR /app/client
# Copia só os manifests antes do código para aproveitar o cache do Docker no npm ci
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build            # gera /app/client/dist

# ---------- Estágio 2: API Express ----------
# bookworm-slim (Debian) em vez de alpine: o sqlite3 é dependência nativa e não compila bem no musl
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev        # sem nodemon/concurrently na imagem final

COPY . .
# O app.js serve client/dist como estático + fallback do React Router, então basta copiar o build pra cá
COPY --from=client /app/client/dist ./client/dist

# Roda como usuário sem privilégios (o usuário "node" já existe na imagem oficial)
USER node
EXPOSE 3000

# Aplica as migrations pendentes e sobe o servidor.
# A migration da tabela usuario cria a secretária a partir de SECRETARIA_* do .env
CMD ["sh", "-c", "npx sequelize-cli db:migrate && node server.js"]

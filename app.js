const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { tratarErros } = require('./middlewares/erros');

const app = express();
app.set('trust proxy', 1); // atrás do Caddy (único acesso ao container): req.ip vem do X-Forwarded-For
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');

app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', require('./routes'));

// Build do React (npm run build) + fallback do React Router
app.use(express.static(CLIENT_DIST));
app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(CLIENT_DIST, 'index.html')) : next()));

app.use(tratarErros);

module.exports = app;

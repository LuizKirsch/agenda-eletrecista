const express = require('express');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Rotas dos módulos entram aqui (src/routes)

module.exports = app;

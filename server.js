require('dotenv').config();

if (!process.env.JWT_SECRET) throw new Error('Defina JWT_SECRET no .env');

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

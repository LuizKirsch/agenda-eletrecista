require('dotenv').config();

const db = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  dialect: 'mysql',
  logging: false,
};

module.exports = { development: db, test: db, production: db };

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { httpErro } = require('../middlewares/erros');

async function entrar(login, senha) {
  const usuario = await Usuario.findOne({ where: { login } });
  const ok = usuario && usuario.ativo && await bcrypt.compare(senha, usuario.senha_hash);
  if (!ok) throw httpErro(401, 'Login ou senha inválidos.');

  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  return {
    token,
    expira: new Date(jwt.decode(token).exp * 1000),
    usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
  };
}

module.exports = { entrar };

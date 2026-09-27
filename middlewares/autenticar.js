const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { httpErro } = require('./erros');

module.exports = async function autenticar(req, res, next) {
  let id;
  try {
    ({ id } = jwt.verify(req.cookies.token, process.env.JWT_SECRET));
  } catch {
    throw httpErro(401, 'Sua sessão expirou. Entre novamente.');
  }
  const usuario = await Usuario.findByPk(id);
  if (!usuario || !usuario.ativo) throw httpErro(401, 'Sua sessão expirou. Entre novamente.');
  req.usuario = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
  next();
};

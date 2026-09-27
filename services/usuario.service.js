const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const { httpErro } = require('../middlewares/erros');

const CAMPOS_PUBLICOS = ['id', 'nome', 'login', 'perfil', 'ativo'];
const publico = (usuario) => Object.fromEntries(CAMPOS_PUBLICOS.map((c) => [c, usuario[c]]));

async function garantirLoginLivre(login, id) {
  const where = id ? { login, id: { [Op.ne]: id } } : { login };
  if (await Usuario.findOne({ where })) throw httpErro(409, 'Este login já está em uso.');
}

async function salvando(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw httpErro(409, 'Este login já está em uso.');
    throw err;
  }
}

async function buscar(id) {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw httpErro(404, 'Usuário não encontrado.');
  return usuario;
}

const ehOProprio = (id, logado) => String(id) === String(logado.id);

function listar() {
  return Usuario.findAll({ attributes: CAMPOS_PUBLICOS, order: [['nome', 'ASC']] });
}

async function criar({ nome, login, senha, perfil }) {
  await garantirLoginLivre(login);
  const usuario = await salvando(async () => Usuario.create({ nome, login, perfil, senha_hash: await bcrypt.hash(senha, 10) }));
  return publico(usuario);
}

async function atualizar(id, { nome, login, senha, perfil, ativo }, logado) {
  const usuario = await buscar(id);
  if (ehOProprio(id, logado) && (perfil !== usuario.perfil || !ativo)) {
    throw httpErro(400, 'Você não pode alterar o perfil nem desativar o próprio usuário.');
  }
  await garantirLoginLivre(login, usuario.id);
  const dados = { nome, login, perfil, ativo, ...(senha && { senha_hash: await bcrypt.hash(senha, 10) }) };
  await salvando(() => usuario.update(dados));
  return publico(usuario);
}

async function excluir(id, logado) {
  if (ehOProprio(id, logado)) throw httpErro(400, 'Você não pode excluir o próprio usuário.');
  await (await buscar(id)).destroy();
}

module.exports = { listar, criar, atualizar, excluir };

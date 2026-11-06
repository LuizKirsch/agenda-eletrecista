const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Usuario, OrdemServico, AtividadeOs } = require('../models');
const { httpErro } = require('../middlewares/erros');

const PALETA = require('../config/paleta');

const CAMPOS_PUBLICOS = ['id', 'nome', 'login', 'perfil', 'ativo', 'cor'];
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

// cor: undefined/'' = não informada; senão #rrggbb (normalizada para minúsculas)
function validarCor(cor) {
  if (cor === undefined || cor === null || cor === '') return undefined;
  const c = String(cor).toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(c)) throw httpErro(400, 'Cor inválida. Use o formato #rrggbb.');
  return c;
}

// Primeira cor da paleta ainda não usada por outro eletricista; se todas estão em uso, recomeça a paleta.
async function proximaCor(ignorarId) {
  const outros = await Usuario.findAll({ where: { perfil: 'eletricista', ...(ignorarId && { id: { [Op.ne]: ignorarId } }) }, attributes: ['cor'] });
  const usadas = new Set(outros.map((u) => u.cor));
  return (PALETA.find((p) => !usadas.has(p.cor)) ?? PALETA[outros.length % PALETA.length]).cor;
}

async function criar({ nome, login, senha, perfil, cor }) {
  const corInformada = validarCor(cor);
  await garantirLoginLivre(login);
  const corFinal = perfil === 'eletricista' ? corInformada ?? await proximaCor() : null;
  const usuario = await salvando(async () => Usuario.create({ nome, login, perfil, cor: corFinal, senha_hash: await bcrypt.hash(senha, 10) }));
  return publico(usuario);
}

async function atualizar(id, { nome, login, senha, perfil, ativo, cor }, logado) {
  const corInformada = validarCor(cor);
  const usuario = await buscar(id);
  if (ehOProprio(id, logado) && (perfil !== usuario.perfil || !ativo)) {
    throw httpErro(400, 'Você não pode alterar o perfil nem desativar o próprio usuário.');
  }
  await garantirLoginLivre(login, usuario.id);
  const corFinal = perfil === 'eletricista' ? corInformada ?? usuario.cor ?? await proximaCor(usuario.id) : null;
  const dados = { nome, login, perfil, ativo, cor: corFinal, ...(senha && { senha_hash: await bcrypt.hash(senha, 10) }) };
  await salvando(() => usuario.update(dados));
  return publico(usuario);
}

async function excluir(id, logado) {
  if (ehOProprio(id, logado)) throw httpErro(400, 'Você não pode excluir o próprio usuário.');
  const usuario = await buscar(id);
  // RN 64 / RF 2.14: com vínculo só desativa
  const vinculos = await OrdemServico.count({ where: { eletricista_id: usuario.id } }) + await AtividadeOs.count({ where: { eletricista_id: usuario.id } });
  if (vinculos) throw httpErro(409, 'Este eletricista tem ordens de serviço ou atividades vinculadas e não pode ser excluído. Desative-o.');
  await usuario.destroy();
}

module.exports = { listar, criar, atualizar, excluir };

const { Op } = require('sequelize');
const { TipoAtividade, AtividadeOs } = require('../models');
const { httpErro } = require('../middlewares/erros');

// Única fonte da contagem de uso (RF 5.6, RF 5.7, RN 19).
function contarUso(tipoId) {
  return AtividadeOs.count({ where: { tipo_atividade_id: tipoId } });
}

async function comUso(tipo) {
  const { id, nome, duracao_padrao_min: duracao, ativo } = tipo;
  return { id, nome, duracao_padrao_min: duracao, ativo, uso: await contarUso(id) };
}

async function buscar(id) {
  const tipo = await TipoAtividade.findByPk(id);
  if (!tipo) throw httpErro(404, 'Tipo de atividade não encontrado.');
  return tipo;
}

// A collation da coluna (utf8mb4_0900_as_ci) faz a comparação ignorar maiúsculas/minúsculas.
async function garantirNomeLivre(nome, id) {
  const where = id ? { nome, id: { [Op.ne]: id } } : { nome };
  if (await TipoAtividade.findOne({ where })) throw httpErro(409, 'Já existe um tipo de atividade com este nome.');
}

async function salvando(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw httpErro(409, 'Já existe um tipo de atividade com este nome.');
    throw err;
  }
}

async function garantirOutroAtivo(tipo) {
  if (tipo.ativo && await TipoAtividade.count({ where: { ativo: true } }) <= 1) {
    throw httpErro(409, 'Deve existir ao menos um tipo de atividade ativo.');
  }
}

async function listar({ somenteAtivos }) {
  const tipos = await TipoAtividade.findAll({ where: somenteAtivos ? { ativo: true } : undefined, order: [['id', 'ASC']] });
  return Promise.all(tipos.map(comUso));
}

async function criar({ nome, duracao_padrao_min }) {
  await garantirNomeLivre(nome);
  return comUso(await salvando(() => TipoAtividade.create({ nome, duracao_padrao_min, ativo: true })));
}

async function atualizar(id, { nome, duracao_padrao_min }) {
  const tipo = await buscar(id);
  await garantirNomeLivre(nome, tipo.id);
  await salvando(() => tipo.update({ nome, duracao_padrao_min }));
  return comUso(tipo);
}

async function alterarSituacao(id, ativo) {
  const tipo = await buscar(id);
  if (!ativo) await garantirOutroAtivo(tipo);
  await tipo.update({ ativo });
  return comUso(tipo);
}

async function excluir(id) {
  const tipo = await buscar(id);
  if (await contarUso(tipo.id) > 0) throw httpErro(409, 'Este tipo de atividade está em uso e não pode ser excluído. Desative-o.');
  await garantirOutroAtivo(tipo);
  await tipo.destroy();
}

module.exports = { contarUso, listar, criar, atualizar, alterarSituacao, excluir };

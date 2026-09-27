const tipoService = require('../services/tipoAtividade.service');
const { httpErro, lerCampos } = require('../middlewares/erros');

function lerTipo(body) {
  const { nome } = lerCampos(body, { nome: { rotulo: 'Nome', max: 100, obrigatorio: true } });
  const bruto = body?.duracao_padrao_min;
  if (bruto === undefined || bruto === null || String(bruto).trim() === '') throw httpErro(400, 'Preencha o campo Duração padrão.');
  const duracao = Number(bruto);
  if (typeof bruto === 'boolean' || !Number.isInteger(duracao) || duracao < 5 || duracao > 720) {
    throw httpErro(400, 'A duração padrão deve ser um número inteiro entre 5 e 720 minutos.');
  }
  return { nome, duracao_padrao_min: duracao };
}

async function listar(req, res) {
  res.json(await tipoService.listar({ somenteAtivos: req.query.ativos === '1' }));
}

async function criar(req, res) {
  res.status(201).json(await tipoService.criar(lerTipo(req.body)));
}

async function atualizar(req, res) {
  res.json(await tipoService.atualizar(req.params.id, lerTipo(req.body)));
}

async function alterarSituacao(req, res) {
  if (typeof req.body?.ativo !== 'boolean') throw httpErro(400, 'Preencha o campo Situação.');
  res.json(await tipoService.alterarSituacao(req.params.id, req.body.ativo));
}

async function excluir(req, res) {
  await tipoService.excluir(req.params.id);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, alterarSituacao, excluir };

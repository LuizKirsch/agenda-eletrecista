const tipoService = require('../services/tipoAtividade.service');
const { httpErro, lerCampos } = require('../middlewares/erros');

const vazio = (v) => v === undefined || v === null || String(v).trim() === '';

// Valor em reais, ≥ 0, com até 2 casas (DECIMAL(10,2)).
function lerValor(bruto, rotulo) {
  const valor = Number(bruto);
  if (typeof bruto === 'boolean' || !Number.isFinite(valor) || valor < 0 || valor > 99999999.99
    || Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-6) {
    throw httpErro(400, `O campo ${rotulo} deve ser um valor maior ou igual a zero, com até 2 casas decimais.`);
  }
  return Math.round(valor * 100) / 100;
}

function lerTipo(body) {
  const { nome } = lerCampos(body, { nome: { rotulo: 'Nome', max: 100, obrigatorio: true } });
  const bruto = body?.duracao_padrao_min;
  if (vazio(bruto)) throw httpErro(400, 'Preencha o campo Duração padrão.');
  const duracao = Number(bruto);
  if (typeof bruto === 'boolean' || !Number.isInteger(duracao) || duracao < 5 || duracao > 720) {
    throw httpErro(400, 'A duração padrão deve ser um número inteiro entre 5 e 720 minutos.');
  }
  const valor = vazio(body.valor_padrao) ? null : lerValor(body.valor_padrao, 'Valor padrão');
  return { nome, duracao_padrao_min: duracao, valor_padrao: valor };
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

module.exports = { vazio, lerValor, listar, criar, atualizar, alterarSituacao, excluir };

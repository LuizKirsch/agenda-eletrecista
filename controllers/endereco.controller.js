const enderecoService = require('../services/endereco.service');
const { lerCampos } = require('../middlewares/erros');
const { CAMPOS_ENDERECO } = require('./cliente.controller');

const lerTexto = (body) => lerCampos(body, { texto: { rotulo: 'Observação', obrigatorio: true } }).texto;

async function detalhar(req, res) {
  res.json(await enderecoService.detalhar(req.params.id));
}

async function adicionarObservacao(req, res) {
  res.status(201).json(await enderecoService.adicionarObservacao(req.params.id, lerTexto(req.body)));
}

async function listarObservacoes(req, res) {
  res.json(await enderecoService.listarObservacoes(req.params.id));
}

async function atualizar(req, res) {
  res.json(await enderecoService.atualizar(req.params.id, lerCampos(req.body, CAMPOS_ENDERECO)));
}

async function excluir(req, res) {
  await enderecoService.excluir(req.params.id);
  res.status(204).end();
}

async function atualizarObservacao(req, res) {
  res.json(await enderecoService.atualizarObservacao(req.params.id, req.params.observacaoId, lerTexto(req.body)));
}

async function excluirObservacao(req, res) {
  await enderecoService.excluirObservacao(req.params.id, req.params.observacaoId);
  res.status(204).end();
}

module.exports = {
  detalhar, adicionarObservacao, listarObservacoes, atualizar, excluir, atualizarObservacao, excluirObservacao,
};

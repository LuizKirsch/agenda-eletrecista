const enderecoService = require('../services/endereco.service');
const { lerCampos } = require('../middlewares/erros');

async function detalhar(req, res) {
  res.json(await enderecoService.detalhar(req.params.id));
}

async function adicionarObservacao(req, res) {
  const { texto } = lerCampos(req.body, { texto: { rotulo: 'Observação', obrigatorio: true } });
  res.status(201).json(await enderecoService.adicionarObservacao(req.params.id, texto));
}

async function listarObservacoes(req, res) {
  res.json(await enderecoService.listarObservacoes(req.params.id));
}

module.exports = { detalhar, adicionarObservacao, listarObservacoes };

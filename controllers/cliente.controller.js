const clienteService = require('../services/cliente.service');
const { lerCampos } = require('../middlewares/erros');

const CAMPOS_CLIENTE = {
  nome: { rotulo: 'Nome', max: 120, obrigatorio: true },
  telefone: { rotulo: 'Telefone', max: 20, obrigatorio: true },
};

const CAMPOS_ENDERECO = {
  identificacao: { rotulo: 'Identificação', max: 60 },
  logradouro: { rotulo: 'Logradouro', max: 150, obrigatorio: true },
  numero: { rotulo: 'Número', max: 10 },
  complemento: { rotulo: 'Complemento', max: 60 },
  bairro: { rotulo: 'Bairro', max: 80 },
  cidade: { rotulo: 'Cidade', max: 80, obrigatorio: true },
  ponto_referencia: { rotulo: 'Ponto de referência', max: 150 },
};

async function listar(req, res) {
  const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';
  res.json(await clienteService.listar(busca));
}

async function criar(req, res) {
  res.status(201).json(await clienteService.criar(lerCampos(req.body, CAMPOS_CLIENTE)));
}

async function detalhar(req, res) {
  res.json(await clienteService.detalhar(req.params.id));
}

async function adicionarEndereco(req, res) {
  res.status(201).json(await clienteService.adicionarEndereco(req.params.id, lerCampos(req.body, CAMPOS_ENDERECO)));
}

module.exports = { listar, criar, detalhar, adicionarEndereco };

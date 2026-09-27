const { Cliente, Endereco, EnderecoObservacao } = require('../models');
const { httpErro } = require('../middlewares/erros');

async function buscarEndereco(id, opcoes) {
  const endereco = await Endereco.findByPk(id, opcoes);
  if (!endereco) throw httpErro(404, 'Endereço não encontrado.');
  return endereco;
}

function detalhar(id) {
  return buscarEndereco(id, { include: { model: Cliente, as: 'cliente' } });
}

async function adicionarObservacao(enderecoId, texto) {
  const endereco = await buscarEndereco(enderecoId);
  const observacao = await EnderecoObservacao.create({ endereco_id: endereco.id, texto });
  return observacao.reload();
}

async function listarObservacoes(enderecoId) {
  const endereco = await buscarEndereco(enderecoId);
  return EnderecoObservacao.findAll({
    where: { endereco_id: endereco.id },
    order: [['criado_em', 'DESC'], ['id', 'DESC']],
  });
}

module.exports = { detalhar, adicionarObservacao, listarObservacoes };

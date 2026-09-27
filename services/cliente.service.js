const { Op } = require('sequelize');
const { Cliente, Endereco } = require('../models');
const { httpErro } = require('../middlewares/erros');

async function buscarCliente(id) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw httpErro(404, 'Cliente não encontrado.');
  return cliente;
}

function listar(busca) {
  const termo = `%${busca}%`;
  return Cliente.findAll({
    attributes: ['id', 'nome', 'telefone'],
    where: busca ? { [Op.or]: [{ nome: { [Op.like]: termo } }, { telefone: { [Op.like]: termo } }] } : undefined,
    order: [['nome', 'ASC'], ['id', 'ASC']],
  });
}

async function criar(dados) {
  const cliente = await Cliente.create(dados);
  return cliente.reload();
}

async function detalhar(id) {
  const cliente = await Cliente.findByPk(id, {
    include: { model: Endereco, as: 'enderecos' },
    order: [[{ model: Endereco, as: 'enderecos' }, 'id', 'ASC']],
  });
  if (!cliente) throw httpErro(404, 'Cliente não encontrado.');
  return cliente;
}

async function adicionarEndereco(clienteId, dados) {
  const cliente = await buscarCliente(clienteId);
  return Endereco.create({ ...dados, cliente_id: cliente.id });
}

module.exports = { listar, criar, detalhar, adicionarEndereco };

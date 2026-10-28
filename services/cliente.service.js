const { Op } = require('sequelize');
const {
  sequelize, Cliente, Endereco, EnderecoObservacao, OrdemServico, Orcamento, OrcamentoItem,
} = require('../models');
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

async function atualizar(id, dados) {
  const cliente = await buscarCliente(id);
  await cliente.update(dados);
  return cliente;
}

// RN 42 / RN 43: com OS não exclui; senão leva endereços, observações e orçamentos junto
function excluir(id) {
  return sequelize.transaction(async (transaction) => {
    const cliente = await Cliente.findByPk(id, { transaction });
    if (!cliente) throw httpErro(404, 'Cliente não encontrado.');
    const where = { cliente_id: cliente.id };
    if (await OrdemServico.count({ where, transaction })) {
      throw httpErro(409, 'Este cliente tem OS vinculada e não pode ser excluído.');
    }
    const orcamentos = (await Orcamento.findAll({ where, transaction })).map((o) => o.id);
    await OrcamentoItem.destroy({ where: { orcamento_id: orcamentos }, transaction });
    await Orcamento.destroy({ where, transaction });
    const enderecos = (await Endereco.findAll({ where, transaction })).map((e) => e.id);
    await EnderecoObservacao.destroy({ where: { endereco_id: enderecos }, transaction });
    await Endereco.destroy({ where, transaction });
    await cliente.destroy({ transaction });
  });
}

module.exports = {
  listar, criar, detalhar, adicionarEndereco, atualizar, excluir,
};

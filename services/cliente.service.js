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

const soDigitos = (t) => String(t ?? '').replace(/\D/g, '');

// RF 3.1: DDD (11 a 99) + 8 ou 9 dígitos; guarda só os dígitos e recusa telefone já cadastrado.
async function validarTelefone(telefone, idAtual) {
  const digitos = soDigitos(telefone);
  if (!/^[1-9][1-9](\d{8}|\d{9})$/.test(digitos)) {
    throw httpErro(400, 'Telefone inválido. Informe o DDD e o número com 8 ou 9 dígitos.');
  }
  // ponytail: varre todos (cobre telefones antigos com máscara); indexar se a base crescer muito
  const todos = await Cliente.findAll({ attributes: ['id', 'telefone'] });
  if (todos.some((c) => c.id !== Number(idAtual) && soDigitos(c.telefone) === digitos)) {
    throw httpErro(409, 'Já existe um cliente com este telefone.');
  }
  return digitos;
}

function listar(busca) {
  const termo = `%${busca}%`;
  return Cliente.findAll({
    attributes: ['id', 'nome', 'telefone'],
    where: busca ? { [Op.or]: [{ nome: { [Op.like]: termo } }, { telefone: { [Op.like]: `%${soDigitos(busca) || busca}%` } }] } : undefined,
    order: [['nome', 'ASC'], ['id', 'ASC']],
  });
}

async function criar(dados) {
  const cliente = await Cliente.create({ ...dados, telefone: await validarTelefone(dados.telefone) });
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
  await cliente.update({ ...dados, telefone: await validarTelefone(dados.telefone, cliente.id) });
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

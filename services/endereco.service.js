const {
  sequelize, Cliente, Endereco, EnderecoObservacao, OrdemServico, Orcamento, OrcamentoItem,
} = require('../models');
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

async function atualizar(id, dados) {
  const endereco = await buscarEndereco(id);
  await endereco.update(dados);
  return detalhar(endereco.id);
}

// RN 42 / RN 43: com OS não exclui; senão leva as observações e os orçamentos do endereço junto
function excluir(id) {
  return sequelize.transaction(async (transaction) => {
    const endereco = await buscarEndereco(id, { transaction });
    const where = { endereco_id: endereco.id };
    if (await OrdemServico.count({ where, transaction })) {
      throw httpErro(409, 'Este endereço tem OS vinculada e não pode ser excluído.');
    }
    const orcamentos = (await Orcamento.findAll({ where, transaction })).map((o) => o.id);
    await OrcamentoItem.destroy({ where: { orcamento_id: orcamentos }, transaction });
    await Orcamento.destroy({ where, transaction });
    await EnderecoObservacao.destroy({ where, transaction });
    await endereco.destroy({ transaction });
  });
}

async function buscarObservacao(enderecoId, observacaoId) {
  const observacao = await EnderecoObservacao.findByPk(observacaoId);
  if (!observacao || String(observacao.endereco_id) !== String(enderecoId)) throw httpErro(404, 'Observação não encontrada.');
  return observacao;
}

// RN 41: a observação editada mantém a data de registro original
async function atualizarObservacao(enderecoId, observacaoId, texto) {
  const observacao = await buscarObservacao(enderecoId, observacaoId);
  await observacao.update({ texto });
  return observacao;
}

async function excluirObservacao(enderecoId, observacaoId) {
  await (await buscarObservacao(enderecoId, observacaoId)).destroy();
}

module.exports = {
  detalhar, adicionarObservacao, listarObservacoes, atualizar, excluir, atualizarObservacao, excluirObservacao,
};

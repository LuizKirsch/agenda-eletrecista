const {
  sequelize, Orcamento, OrcamentoItem, OrdemServico, AtividadeOs, Cliente, Endereco, TipoAtividade,
} = require('../models');
const { httpErro } = require('../middlewares/erros');
const { paraMin, paraHora } = require('./horario');
const { avisoConflito } = require('./agenda.service');
const { validarClienteEndereco } = require('./os.service');
const { reais } = require('./tipoAtividade.service');

const SO_PENDENTE = {
  editar: 'Somente orçamentos pendentes podem ser editados.',
  excluir: 'Somente orçamentos pendentes podem ser excluídos.',
  status: 'Este orçamento já foi aceito ou recusado.',
};

// Total calculado em centavos para não acumular erro de ponto flutuante (RN 48)
const totalDe = (itens) => itens.reduce((t, i) => t + i.quantidade * Math.round(Number(i.valor_unitario) * 100), 0) / 100;

const ordemItens = [[{ model: OrcamentoItem, as: 'itens' }, 'sequencia', 'ASC']];

async function buscar(id, transaction) {
  const orcamento = await Orcamento.findByPk(id, { include: { model: OrcamentoItem, as: 'itens' }, order: ordemItens, transaction });
  if (!orcamento) throw httpErro(404, 'Orçamento não encontrado.');
  return orcamento;
}

function garantirPendente(orcamento, acao) {
  if (orcamento.status !== 'pendente') throw httpErro(409, SO_PENDENTE[acao]);
}

// Item novo só aceita tipo ativo; na edição, o tipo que já estava no orçamento pode continuar mesmo inativo (RN 49)
async function validarTipos(itens, tiposJaUsados, transaction) {
  const ids = [...new Set(itens.map((i) => i.tipo_atividade_id).filter(Boolean))];
  const porId = new Map((await TipoAtividade.findAll({ where: { id: ids }, transaction })).map((t) => [String(t.id), t]));
  itens.forEach((item, i) => {
    if (!item.tipo_atividade_id) return;
    const tipo = porId.get(String(item.tipo_atividade_id));
    if (!tipo) throw httpErro(400, `Tipo de atividade não encontrado (${i + 1}º item).`);
    if (!tipo.ativo && !tiposJaUsados.has(String(tipo.id))) {
      throw httpErro(400, `O tipo "${tipo.nome}" está inativo. Escolha um tipo ativo (${i + 1}º item).`);
    }
  });
}

async function gravarItens(orcamentoId, itens, transaction) {
  await OrcamentoItem.bulkCreate(itens.map((item, i) => ({ ...item, orcamento_id: orcamentoId, sequencia: i + 1 })), { transaction });
}

async function listar() {
  const orcamentos = await Orcamento.findAll({
    include: [{ model: Cliente, as: 'cliente' }, { model: OrcamentoItem, as: 'itens' }],
    order: [['criado_em', 'DESC'], ['id', 'DESC']],
  });
  return orcamentos.map((o) => ({
    id: o.id,
    cliente: { id: o.cliente.id, nome: o.cliente.nome },
    criado_em: o.criado_em,
    status: o.status,
    total: totalDe(o.itens),
  }));
}

async function detalhar(id) {
  const o = await Orcamento.findByPk(id, {
    include: [
      { model: Cliente, as: 'cliente' },
      { model: Endereco, as: 'endereco' },
      { model: OrcamentoItem, as: 'itens', include: { model: TipoAtividade, as: 'tipo' } },
    ],
    order: ordemItens,
  });
  if (!o) throw httpErro(404, 'Orçamento não encontrado.');
  return {
    id: o.id,
    status: o.status,
    observacao: o.observacao,
    criado_em: o.criado_em,
    ordem_servico_id: o.ordem_servico_id,
    cliente: { id: o.cliente.id, nome: o.cliente.nome, telefone: o.cliente.telefone },
    endereco: o.endereco,
    itens: o.itens.map((i) => ({
      id: i.id,
      tipo: i.tipo ? { id: i.tipo.id, nome: i.tipo.nome, ativo: i.tipo.ativo } : null,
      descricao: i.descricao,
      quantidade: i.quantidade,
      valor_unitario: reais(i.valor_unitario),
      duracao_min: i.duracao_min,
    })),
    total: totalDe(o.itens),
  };
}

async function criar(dados) {
  const id = await sequelize.transaction(async (transaction) => {
    await validarClienteEndereco(dados, transaction);
    await validarTipos(dados.itens, new Set(), transaction);
    const orcamento = await Orcamento.create({
      cliente_id: dados.cliente_id, endereco_id: dados.endereco_id, observacao: dados.observacao, status: 'pendente',
    }, { transaction });
    await gravarItens(orcamento.id, dados.itens, transaction);
    return orcamento.id;
  });
  return detalhar(id);
}

// Os itens são substituídos por inteiro: não há nada fora do orçamento que aponte para eles
async function atualizar(id, dados) {
  await sequelize.transaction(async (transaction) => {
    const orcamento = await buscar(id, transaction);
    garantirPendente(orcamento, 'editar');
    await validarClienteEndereco(dados, transaction);
    await validarTipos(dados.itens, new Set(orcamento.itens.map((i) => String(i.tipo_atividade_id))), transaction);
    await orcamento.update({ cliente_id: dados.cliente_id, endereco_id: dados.endereco_id, observacao: dados.observacao }, { transaction });
    await OrcamentoItem.destroy({ where: { orcamento_id: orcamento.id }, transaction });
    await gravarItens(orcamento.id, dados.itens, transaction);
  });
  return detalhar(id);
}

function excluir(id) {
  return sequelize.transaction(async (transaction) => {
    const orcamento = await buscar(id, transaction);
    garantirPendente(orcamento, 'excluir');
    await OrcamentoItem.destroy({ where: { orcamento_id: orcamento.id }, transaction });
    await orcamento.destroy({ transaction });
  });
}

async function recusar(id) {
  await sequelize.transaction(async (transaction) => {
    const orcamento = await buscar(id, transaction);
    garantirPendente(orcamento, 'status');
    await orcamento.update({ status: 'recusado' }, { transaction });
  });
  return detalhar(id);
}

// Gera a OS com uma atividade agendada por item, cada uma na data e no início escolhidos (podem ser dias diferentes),
// com a duração do item. Item avulso vira atividade avulsa; tipo desativado entra normalmente. Se alguma não
// couber no próprio dia, nada muda (RN 51, RN 52).
function aceitar(id, horarios) {
  return sequelize.transaction(async (transaction) => {
    const orcamento = await buscar(id, transaction);
    garantirPendente(orcamento, 'status');
    if (horarios.length !== orcamento.itens.length) throw httpErro(400, 'Informe a data e o início de cada item.');

    const fins = orcamento.itens.map((item, i) => paraMin(horarios[i].hora_inicio) + item.duracao_min);
    const fora = fins.findIndex((fim) => fim > 1439);
    if (fora >= 0) {
      throw httpErro(409, `O ${fora + 1}º item não cabe no dia a partir desse horário. Escolha um início mais cedo ou outro dia.`);
    }

    const os = await OrdemServico.create({ cliente_id: orcamento.cliente_id, endereco_id: orcamento.endereco_id }, { transaction });
    const atividades = await AtividadeOs.bulkCreate(orcamento.itens.map((item, i) => ({
      ordem_servico_id: os.id,
      tipo_atividade_id: item.tipo_atividade_id,
      descricao: item.tipo_atividade_id ? null : item.descricao,
      sequencia: i + 1,
      data: horarios[i].data,
      hora_inicio: horarios[i].hora_inicio,
      hora_fim: paraHora(fins[i]),
      status: 'agendada',
    })), { transaction });

    await orcamento.update({ status: 'aceito', ordem_servico_id: os.id }, { transaction });
    return { os_id: os.id, aviso_conflito: await avisoConflito(atividades.map((a) => a.id), transaction) };
  });
}

module.exports = {
  listar, detalhar, criar, atualizar, excluir, recusar, aceitar,
};

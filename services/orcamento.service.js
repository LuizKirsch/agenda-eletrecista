const {
  sequelize, Orcamento, OrcamentoItem, OrcamentoVersao, Usuario, OrdemServico, AtividadeOs, Cliente, Endereco, TipoAtividade,
} = require('../models');
const { httpErro } = require('../middlewares/erros');
const { paraMin, paraHora, diaNum, dataDeNum } = require('./horario');
const { Op } = require('sequelize');
const { avisoConflito, hhmm } = require('./agenda.service');
const { recomendar } = require('./recomendacao');
const { validarClienteEndereco, validarEletricistas } = require('./os.service');
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

async function detalhar(id, transaction) {
  const o = await Orcamento.findByPk(id, {
    include: [
      { model: Cliente, as: 'cliente' },
      { model: Endereco, as: 'endereco' },
      { model: OrcamentoItem, as: 'itens', include: { model: TipoAtividade, as: 'tipo' } },
    ],
    order: ordemItens,
    transaction,
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
async function atualizar(id, dados, usuarioId) {
  await sequelize.transaction(async (transaction) => {
    const orcamento = await buscar(id, transaction);
    garantirPendente(orcamento, 'editar');
    await validarClienteEndereco(dados, transaction);
    await validarTipos(dados.itens, new Set(orcamento.itens.map((i) => String(i.tipo_atividade_id))), transaction);
    // RF 4.20: o estado anterior vira a próxima versão numerada, na mesma transação da edição
    const numero = ((await OrcamentoVersao.max('numero', { where: { orcamento_id: orcamento.id }, transaction })) || 0) + 1;
    await OrcamentoVersao.create({
      orcamento_id: orcamento.id, numero, usuario_id: usuarioId, snapshot: JSON.stringify(await detalhar(id, transaction)),
    }, { transaction });
    await orcamento.update({ cliente_id: dados.cliente_id, endereco_id: dados.endereco_id, observacao: dados.observacao }, { transaction });
    await OrcamentoItem.destroy({ where: { orcamento_id: orcamento.id }, transaction });
    await gravarItens(orcamento.id, dados.itens, transaction);
  });
  return detalhar(id);
}

const versaoDe = (v) => ({ numero: v.numero, criado_em: v.criado_em, autor: v.usuario?.nome ?? null });

// Versões anteriores (somente leitura); a versão atual é a última + 1
async function listarVersoes(id) {
  await buscar(id);
  const versoes = await OrcamentoVersao.findAll({
    where: { orcamento_id: id }, include: { model: Usuario, as: 'usuario' }, order: [['numero', 'DESC']],
  });
  return versoes.map(versaoDe);
}

async function detalharVersao(id, numero) {
  const v = await OrcamentoVersao.findOne({ where: { orcamento_id: id, numero }, include: { model: Usuario, as: 'usuario' } });
  if (!v) throw httpErro(404, 'Versão não encontrada.');
  return { ...versaoDe(v), orcamento: JSON.parse(v.snapshot) };
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
function aceitar(id, horarios, eletricistaId) {
  return sequelize.transaction(async (transaction) => {
    const orcamento = await buscar(id, transaction);
    garantirPendente(orcamento, 'status');
    if (horarios.length !== orcamento.itens.length) throw httpErro(400, 'Informe a data e o início de cada item.');

    await validarEletricistas({ eletricista_id: eletricistaId, atividades: horarios }, null, new Map(), transaction);
    const fins = orcamento.itens.map((item, i) => paraMin(horarios[i].hora_inicio) + item.duracao_min);
    const fora = fins.findIndex((fim) => fim > 1439);
    if (fora >= 0) {
      throw httpErro(409, `O ${fora + 1}º item não cabe no dia a partir desse horário. Escolha um início mais cedo ou outro dia.`);
    }

    const os = await OrdemServico.create({ cliente_id: orcamento.cliente_id, endereco_id: orcamento.endereco_id, eletricista_id: eletricistaId }, { transaction });
    const atividades = await AtividadeOs.bulkCreate(orcamento.itens.map((item, i) => ({
      ordem_servico_id: os.id,
      tipo_atividade_id: item.tipo_atividade_id,
      descricao: item.tipo_atividade_id ? null : item.descricao,
      eletricista_id: horarios[i].eletricista_id,
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

// RF 4.19 / RN 67: uma consulta só (índice eletricista+data) com a agenda dos eletricistas envolvidos; o resto é em memória.
// fixas = itens 0..N-1 já definidos ({ data, inicioMin }); a recomendação recomeça do fim da última.
async function recomendarHorarios(id, { data, inicioMin, eletricistaId, atividades, fixas }) {
  const orcamento = await buscar(id);
  if (fixas.length > orcamento.itens.length) throw httpErro(400, 'Ponto de recálculo inválido.');
  const eletricistas = orcamento.itens.map((_, i) => atividades[i]?.eletricista_id ?? eletricistaId);
  const datas = [data, ...fixas.map((f) => f.data)].sort();
  const agenda = await AtividadeOs.findAll({
    where: {
      eletricista_id: [...new Set(eletricistas)],
      data: { [Op.between]: [datas[0], dataDeNum(diaNum(datas.at(-1)) + 61)] },
      status: { [Op.ne]: 'cancelada' },
    },
    attributes: ['eletricista_id', 'data', 'hora_inicio', 'hora_fim'],
  });
  const porDia = new Map();
  for (const a of agenda) {
    const chave = `${a.eletricista_id}|${a.data}`;
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave).push({ ini: paraMin(hhmm(a.hora_inicio)), fim: paraMin(hhmm(a.hora_fim)) });
  }
  return recomendar({
    itens: orcamento.itens, data, inicioMin, eletricistas, fixas, ocupadosPor: (eletr, dia) => porDia.get(`${eletr}|${dia}`) || [],
  });
}

module.exports = {
  recomendarHorarios, listar, detalhar, criar, atualizar, excluir, recusar, aceitar, listarVersoes, detalharVersao,
};

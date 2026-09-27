const {
  sequelize, OrdemServico, AtividadeOs, Cliente, Endereco, TipoAtividade,
} = require('../models');
const { httpErro } = require('../middlewares/erros');
const { paraMin, paraHora } = require('./horario');
const { hhmm, avisoConflito, conflitosNasDatas, tipoResumo } = require('./agenda.service');

const SO_AGENDADAS_REMARCAM = 'Somente atividades agendadas podem ser remarcadas.';

async function buscarOs(id, transaction) {
  const os = await OrdemServico.findByPk(id, {
    include: { model: AtividadeOs, as: 'atividades' },
    order: [[{ model: AtividadeOs, as: 'atividades' }, 'sequencia', 'ASC']],
    transaction,
  });
  if (!os) throw httpErro(404, 'Ordem de serviço não encontrada.');
  return os;
}

async function buscarAtividade(id, transaction) {
  const atividade = await AtividadeOs.findByPk(id, { transaction });
  if (!atividade) throw httpErro(404, 'Atividade não encontrada.');
  return atividade;
}

async function validarClienteEndereco({ cliente_id: clienteId, endereco_id: enderecoId }, transaction) {
  if (!await Cliente.findByPk(clienteId, { transaction })) throw httpErro(404, 'Cliente não encontrado.');
  if (enderecoId) {
    const endereco = await Endereco.findByPk(enderecoId, { transaction });
    if (!endereco || String(endereco.cliente_id) !== String(clienteId)) {
      throw httpErro(400, 'O endereço não pertence ao cliente selecionado.');
    }
  }
}

// Linhas novas só aceitam tipo ativo; linha existente pode manter o tipo inativo que já tinha (RN 20).
async function validarTipos(linhas, existentes, transaction) {
  const tipos = await TipoAtividade.findAll({ where: { id: [...new Set(linhas.map((l) => l.tipo_atividade_id))] }, transaction });
  const porId = new Map(tipos.map((t) => [String(t.id), t]));
  linhas.forEach((linha, i) => {
    const tipo = porId.get(String(linha.tipo_atividade_id));
    if (!tipo) throw httpErro(400, `Selecione o tipo de atividade (${i + 1}ª atividade).`);
    const mantemOMesmo = linha.id && String(existentes.get(String(linha.id))?.tipo_atividade_id) === String(tipo.id);
    if (!tipo.ativo && !mantemOMesmo) {
      throw httpErro(400, `O tipo "${tipo.nome}" está inativo. Escolha um tipo ativo (${i + 1}ª atividade).`);
    }
  });
}

const camposAtividade = (linha, i) => ({
  tipo_atividade_id: linha.tipo_atividade_id,
  data: linha.data,
  hora_inicio: linha.hora_inicio,
  hora_fim: linha.hora_fim,
  sequencia: i + 1,
});

async function detalhar(id) {
  const os = await OrdemServico.findByPk(id, {
    include: [
      { model: Cliente, as: 'cliente' },
      { model: Endereco, as: 'endereco' },
      { model: AtividadeOs, as: 'atividades', include: { model: TipoAtividade, as: 'tipo' } },
    ],
    order: [[{ model: AtividadeOs, as: 'atividades' }, 'sequencia', 'ASC']],
  });
  if (!os) throw httpErro(404, 'Ordem de serviço não encontrada.');
  const conflitos = await conflitosNasDatas(os.atividades.map((a) => a.data));
  return {
    id: os.id,
    observacao: os.observacao,
    cliente: { id: os.cliente.id, nome: os.cliente.nome, telefone: os.cliente.telefone },
    endereco: os.endereco,
    atividades: os.atividades.map((a) => ({
      id: a.id,
      sequencia: a.sequencia,
      tipo: { ...tipoResumo(a.tipo), duracao_padrao_min: a.tipo.duracao_padrao_min },
      data: a.data,
      hora_inicio: hhmm(a.hora_inicio),
      hora_fim: hhmm(a.hora_fim),
      status: a.status,
      conflito: conflitos.has(a.id),
    })),
  };
}

function criar(dados) {
  return sequelize.transaction(async (transaction) => {
    await validarClienteEndereco(dados, transaction);
    await validarTipos(dados.atividades, new Map(), transaction);
    const os = await OrdemServico.create({
      cliente_id: dados.cliente_id, endereco_id: dados.endereco_id, observacao: dados.observacao,
    }, { transaction });
    const atividades = await AtividadeOs.bulkCreate(
      dados.atividades.map((l, i) => ({ ...camposAtividade(l, i), ordem_servico_id: os.id, status: 'agendada' })),
      { transaction },
    );
    const ids = atividades.map((a) => a.id);
    return { id: os.id, aviso_conflito: await avisoConflito(ids, transaction) };
  });
}

function atualizar(id, dados) {
  return sequelize.transaction(async (transaction) => {
    const os = await buscarOs(id, transaction);
    const existentes = new Map(os.atividades.map((a) => [String(a.id), a]));
    const idsMantidos = new Set(dados.atividades.filter((l) => l.id).map((l) => String(l.id)));
    if ([...idsMantidos].some((idLinha) => !existentes.has(idLinha))) throw httpErro(404, 'Atividade não encontrada.');

    await validarClienteEndereco(dados, transaction);
    await validarTipos(dados.atividades, existentes, transaction);
    await os.update({ cliente_id: dados.cliente_id, endereco_id: dados.endereco_id, observacao: dados.observacao }, { transaction });

    const removidas = os.atividades.filter((a) => !idsMantidos.has(String(a.id))).map((a) => a.id);
    if (removidas.length) await AtividadeOs.destroy({ where: { id: removidas }, transaction });

    const ids = [];
    for (const [i, linha] of dados.atividades.entries()) {
      if (linha.id) {
        await existentes.get(String(linha.id)).update(camposAtividade(linha, i), { transaction });
        ids.push(linha.id);
      } else {
        const nova = await AtividadeOs.create(
          { ...camposAtividade(linha, i), ordem_servico_id: os.id, status: 'agendada' },
          { transaction },
        );
        ids.push(nova.id);
      }
    }
    return { id: os.id, aviso_conflito: await avisoConflito(ids, transaction) };
  });
}

function excluir(id) {
  return sequelize.transaction(async (transaction) => {
    const os = await buscarOs(id, transaction);
    await AtividadeOs.destroy({ where: { ordem_servico_id: os.id }, transaction });
    await os.destroy({ transaction });
  });
}

// Remarcar a OS inteira (decisão do projeto, altera RF 1.14/RN 6): a atividade de referência vai para
// data/hora_inicio e as demais agendadas são encadeadas no mesmo dia, na ordem da sequência, mantendo
// a duração de cada uma. Concluídas e canceladas não mudam. Se não couber no dia, recusa tudo (RN 7).
function deslocar(osId, { atividade_id: atividadeId, data, hora_inicio: horaInicio }) {
  return sequelize.transaction(async (transaction) => {
    const os = await buscarOs(osId, transaction);
    const referencia = os.atividades.find((a) => String(a.id) === String(atividadeId));
    if (!referencia) throw httpErro(404, 'Atividade não encontrada.');
    if (referencia.status !== 'agendada') throw httpErro(409, SO_AGENDADAS_REMARCAM);

    const agendadas = os.atividades.filter((a) => a.status === 'agendada');
    const duracao = (a) => paraMin(hhmm(a.hora_fim)) - paraMin(hhmm(a.hora_inicio));
    const soma = (lista) => lista.reduce((total, a) => total + duracao(a), 0);

    let inicio = paraMin(horaInicio) - soma(agendadas.slice(0, agendadas.indexOf(referencia)));
    if (inicio < 0 || inicio + soma(agendadas) > 1439) {
      throw httpErro(409, 'As atividades agendadas da OS não cabem nesse dia a partir desse horário.');
    }

    for (const a of agendadas) {
      const fim = inicio + duracao(a);
      await a.update({ data, hora_inicio: paraHora(inicio), hora_fim: paraHora(fim) }, { transaction });
      inicio = fim;
    }
    return { aviso_conflito: await avisoConflito(agendadas.map((a) => a.id), transaction) };
  });
}

async function concluir(osId) {
  await buscarOs(osId);
  await AtividadeOs.update({ status: 'concluida' }, { where: { ordem_servico_id: osId, status: 'agendada' } });
  return detalhar(osId);
}

function remarcarAtividade(id, { data, hora_inicio: horaInicio, hora_fim: horaFim }) {
  return sequelize.transaction(async (transaction) => {
    const atividade = await buscarAtividade(id, transaction);
    if (atividade.status !== 'agendada') throw httpErro(409, SO_AGENDADAS_REMARCAM);
    await atividade.update({ data, hora_inicio: horaInicio, hora_fim: horaFim }, { transaction });
    return { aviso_conflito: await avisoConflito([atividade.id], transaction) };
  });
}

async function alterarStatus(id, status) {
  const atividade = await buscarAtividade(id);
  if (atividade.status !== 'agendada') {
    throw httpErro(409, 'Somente atividades agendadas podem ser concluídas ou canceladas.');
  }
  await atividade.update({ status });
  return { id: atividade.id, status: atividade.status };
}

// Exclui concluída/cancelada; se era a última, exclui a OS; senão renumera a sequência (RN 14, RN 15).
function excluirAtividade(id) {
  return sequelize.transaction(async (transaction) => {
    const atividade = await buscarAtividade(id, transaction);
    if (atividade.status === 'agendada') {
      throw httpErro(409, 'Somente atividades concluídas ou canceladas podem ser excluídas.');
    }
    await atividade.destroy({ transaction });
    const restantes = await AtividadeOs.findAll({
      where: { ordem_servico_id: atividade.ordem_servico_id },
      order: [['sequencia', 'ASC']],
      transaction,
    });
    if (!restantes.length) {
      await OrdemServico.destroy({ where: { id: atividade.ordem_servico_id }, transaction });
      return;
    }
    for (const [i, a] of restantes.entries()) {
      if (a.sequencia !== i + 1) await a.update({ sequencia: i + 1 }, { transaction });
    }
  });
}

module.exports = {
  detalhar, criar, atualizar, excluir, deslocar, concluir, remarcarAtividade, alterarStatus, excluirAtividade,
};

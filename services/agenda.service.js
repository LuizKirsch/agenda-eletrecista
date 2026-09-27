const { Op, fn, col } = require('sequelize');
const { AtividadeOs, OrdemServico, Cliente, Endereco, TipoAtividade } = require('../models');

const hhmm = (hora) => String(hora).slice(0, 5);

// Único ponto da regra de conflito (RN 10, RF 1.20): mesma data, ambas não canceladas e intervalos
// sobrepostos. Encostadas (fim de uma = início da outra) não conflitam.
function idsEmConflito(atividades) {
  const porDia = new Map();
  for (const a of atividades) {
    if (a.status === 'cancelada') continue;
    if (!porDia.has(a.data)) porDia.set(a.data, []);
    porDia.get(a.data).push(a);
  }
  const ids = new Set();
  for (const doDia of porDia.values()) {
    for (let i = 0; i < doDia.length; i++) {
      for (let j = i + 1; j < doDia.length; j++) {
        const a = doDia[i];
        const b = doDia[j];
        if (hhmm(a.hora_inicio) < hhmm(b.hora_fim) && hhmm(b.hora_inicio) < hhmm(a.hora_fim)) {
          ids.add(a.id);
          ids.add(b.id);
        }
      }
    }
  }
  return ids;
}

async function conflitosNasDatas(datas, transaction) {
  const doDia = await AtividadeOs.findAll({ where: { data: [...new Set(datas)] }, transaction });
  return idsEmConflito(doDia);
}

// true se alguma das atividades gravadas ficou em conflito (RN 11: avisa, não bloqueia)
async function avisoConflito(ids, transaction) {
  const gravadas = await AtividadeOs.findAll({ where: { id: ids }, transaction });
  const conflitos = await conflitosNasDatas(gravadas.map((a) => a.data), transaction);
  return gravadas.some((a) => conflitos.has(a.id));
}

const tipoResumo = (tipo) => ({ id: tipo.id, nome: tipo.nome, ativo: tipo.ativo });

async function listar(inicio, fim) {
  const atividades = await AtividadeOs.findAll({
    where: { data: { [Op.between]: [inicio, fim] } },
    include: [
      { model: TipoAtividade, as: 'tipo' },
      {
        model: OrdemServico,
        as: 'os',
        include: [{ model: Cliente, as: 'cliente' }, { model: Endereco, as: 'endereco' }],
      },
    ],
    order: [['data', 'ASC'], ['hora_inicio', 'ASC'], ['id', 'ASC']],
  });

  const totais = await AtividadeOs.findAll({
    attributes: ['ordem_servico_id', [fn('COUNT', col('id')), 'total']],
    where: { ordem_servico_id: [...new Set(atividades.map((a) => a.ordem_servico_id))] },
    group: ['ordem_servico_id'],
    raw: true,
  });
  const totalPorOs = new Map(totais.map((t) => [t.ordem_servico_id, Number(t.total)]));
  const conflitos = idsEmConflito(atividades);

  return atividades.map((a) => ({
    id: a.id,
    os_id: a.ordem_servico_id,
    sequencia: a.sequencia,
    total: totalPorOs.get(a.ordem_servico_id),
    tipo: tipoResumo(a.tipo),
    data: a.data,
    hora_inicio: hhmm(a.hora_inicio),
    hora_fim: hhmm(a.hora_fim),
    status: a.status,
    conflito: conflitos.has(a.id),
    cliente: { id: a.os.cliente.id, nome: a.os.cliente.nome },
    endereco: a.os.endereco,
  }));
}

module.exports = { hhmm, idsEmConflito, conflitosNasDatas, avisoConflito, tipoResumo, listar };

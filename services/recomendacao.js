const { diaNum, dataDeNum, paraHora } = require('./horario');

// RN 67: first-fit guloso. Função pura; a agenda entra por `ocupadosPor`.
// Fim máximo 23:59 (1439), igual à checagem do aceite (RN 52): o aceite rejeita fim > 1439.
const FIM_DIA = 1439;
const DIAS_BUSCA = 60;
const teto15 = (min) => Math.ceil(min / 15) * 15;
const somarDias = (data, n) => dataDeNum(diaNum(data) + n);

// itens: [{ duracao_min }]; eletricistas: id por item; data/inicioMin: início informado;
// ocupadosPor(eletricistaId, data) => [{ ini, fim, status? }] em minutos (cancelada é ignorada);
// fixas: [{ data, inicioMin }] dos itens 0..N-1 já definidos (casos 3 e 4): não são recalculados,
// ocupam a agenda e o cursor começa no fim da última.
// Retorna, por item, { data, hora_inicio, hora_fim } ou null (sem horário livre em 60 dias / maior que o dia).
function recomendar({ itens, data, inicioMin, eletricistas, ocupadosPor, fixas = [] }) {
  const proprios = []; // atividades desta OS: { eletr, data, ini, fim }
  const resultado = [];
  const marcar = (i, dia, ini) => {
    const fim = ini + itens[i].duracao_min;
    proprios.push({ eletr: String(eletricistas[i]), data: dia, ini, fim });
    return { data: dia, hora_inicio: paraHora(ini), hora_fim: paraHora(fim) };
  };

  let cursorDia = data;
  let cursorMin = inicioMin;
  fixas.forEach((f, i) => {
    resultado.push(marcar(i, f.data, f.inicioMin));
    cursorDia = f.data;
    cursorMin = f.inicioMin + itens[i].duracao_min;
  });

  for (let i = fixas.length; i < itens.length; i++) {
    const dur = itens[i].duracao_min;
    const eletr = String(eletricistas[i]);
    // caso 1: se não cabe depois do início informado, os dias seguintes começam às 00:00
    const inicioDiasSeguintes = dur > FIM_DIA - inicioMin ? 0 : inicioMin;
    let achou = null;
    for (let d = 0, dia = cursorDia, min = cursorMin; d < DIAS_BUSCA && dur <= FIM_DIA && !achou; d++) {
      const ocupados = [
        ...ocupadosPor(eletr, dia).filter((o) => o.status !== 'cancelada'),
        ...proprios.filter((p) => p.eletr === eletr && p.data === dia),
      ].sort((a, b) => a.ini - b.ini);
      let t = teto15(min);
      for (const o of ocupados) {
        if (t + dur <= o.ini) break;
        if (o.fim > t) t = teto15(o.fim);
      }
      if (t + dur <= FIM_DIA) achou = { dia, t };
      else { dia = somarDias(dia, 1); min = inicioDiasSeguintes; }
    }
    if (!achou) { resultado.push(null); continue; }
    resultado.push(marcar(i, achou.dia, achou.t));
    cursorDia = achou.dia;
    cursorMin = achou.t + dur;
  }
  return resultado;
}

module.exports = { recomendar };

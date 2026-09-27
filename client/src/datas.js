// Datas 'YYYY-MM-DD' e horas 'HH:MM' como texto; aritmética inteira, sem Date (evita fuso).
// Mesmo algoritmo de services/horario.js no backend.

const pad = (n) => String(n).padStart(2, '0');

export function diaNum(data) {
  let [a, m, d] = data.split('-').map(Number);
  a -= m <= 2 ? 1 : 0;
  const era = Math.floor(a / 400);
  const yoe = a - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function dataDeNum(n) {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return `${String(yoe + era * 400 + (m <= 2 ? 1 : 0)).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

export const somarDias = (data, n) => dataDeNum(diaNum(data) + n);
export const paraMin = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
export const paraHora = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// 0 = segunda ... 6 = domingo (1970-01-01 foi quinta)
const diaDaSemana = (data) => (((diaNum(data) + 3) % 7) + 7) % 7;
export const segundaDe = (data) => somarDias(data, -diaDaSemana(data));

export const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const nomeDia = (data) => DIAS[diaDaSemana(data)];
export const dataCurta = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;
export const dataBr = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;

export function rotuloSemana(segunda) {
  const domingo = somarDias(segunda, 6);
  const parte = (d) => `${Number(d.slice(8, 10))} ${MESES[Number(d.slice(5, 7)) - 1]}`;
  return `${parte(segunda)} – ${parte(domingo)} ${domingo.slice(0, 4)}`;
}

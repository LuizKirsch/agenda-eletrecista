// Datas 'YYYY-MM-DD' e horas 'HH:MM' tratadas como texto e aritmética inteira, sem Date (evita fuso).

const pad = (n) => String(n).padStart(2, '0');

// Dias desde 1970-01-01 (algoritmo days_from_civil, de Howard Hinnant).
function diaNum(data) {
  let [a, m, d] = data.split('-').map(Number);
  a -= m <= 2 ? 1 : 0;
  const era = Math.floor(a / 400);
  const yoe = a - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function dataDeNum(n) {
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

const ehData = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && dataDeNum(diaNum(s)) === s;
const ehHora = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const paraMin = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
const paraHora = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

module.exports = { diaNum, dataDeNum, ehData, ehHora, paraMin, paraHora };

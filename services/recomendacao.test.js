// node services/recomendacao.test.js
const assert = require('assert');
const { recomendar } = require('./recomendacao');
const { paraMin: m } = require('./horario');

const it = (...d) => d.map((duracao_min) => ({ duracao_min }));
// agenda: { 'eletr|data': [[ini, fim, status?]] } em HH:MM
const agenda = (obj = {}) => (e, d) => (obj[`${e}|${d}`] || []).map(([i, f, status]) => ({ ini: m(i), fim: m(f), status }));
const run = (o) => recomendar({ eletricistas: o.itens.map(() => 1), ocupadosPor: agenda(), inicioMin: m('08:00'), data: '2026-11-10', ...o });
const txt = (r) => r.map((x) => x && `${x.data} ${x.hora_inicio}-${x.hora_fim}`);

// agenda vazia: encadeia
assert.deepStrictEqual(txt(run({ itens: it(60, 30) })), ['2026-11-10 08:00-09:00', '2026-11-10 09:00-09:30']);

// buraco entre 08-09 e 10-11: 60 min cabe às 09:00; 90 min vai para 11:00
const a1 = agenda({ '1|2026-11-10': [['08:00', '09:00'], ['10:00', '11:00']] });
assert.deepStrictEqual(txt(run({ itens: it(60), ocupadosPor: a1 })), ['2026-11-10 09:00-10:00']);
assert.deepStrictEqual(txt(run({ itens: it(90), ocupadosPor: a1 })), ['2026-11-10 11:00-12:30']);

// dia lotado: pula para o dia seguinte no mesmo início
const lotado = agenda({ '1|2026-11-10': [['00:00', '23:59']] });
assert.deepStrictEqual(txt(run({ itens: it(60), ocupadosPor: lotado })), ['2026-11-11 08:00-09:00']);

// caso 1: início 22:00 e item de 120 min: dia seguinte começa às 00:00
assert.deepStrictEqual(txt(run({ itens: it(120), inicioMin: m('22:00') })), ['2026-11-11 00:00-02:00']);
// item curto cabe no dia; o longo seguinte vai para 00:00 do dia seguinte
assert.deepStrictEqual(txt(run({ itens: it(30, 120), inicioMin: m('22:00') })), ['2026-11-10 22:00-22:30', '2026-11-11 00:00-02:00']);

// item maior que o dia: sem sugestão; o seguinte segue do cursor
assert.deepStrictEqual(txt(run({ itens: it(1500, 60) })), [null, '2026-11-10 08:00-09:00']);

// 60 dias: lotados os 60 -> null; com o 60º dia livre acha (2027-01-08)
const dias = (ate) => Object.fromEntries(Array.from({ length: ate }, (_, n) => [`1|${new Date(Date.UTC(2026, 10, 10 + n)).toISOString().slice(0, 10)}`, [['00:00', '23:59']]]));
assert.deepStrictEqual(run({ itens: it(60), ocupadosPor: agenda(dias(60)) }), [null]);
assert.strictEqual(run({ itens: it(60), ocupadosPor: agenda(dias(59)) })[0].data, '2027-01-08');

// própria OS ocupa o mesmo eletricista: fixas 10-11 e 08-09 (item 3 de 30 min cabe no buraco 09:00-10:00)
assert.deepStrictEqual(
  txt(run({ itens: it(60, 60, 30), fixas: [{ data: '2026-11-10', inicioMin: m('10:00') }, { data: '2026-11-10', inicioMin: m('08:00') }] })),
  ['2026-11-10 10:00-11:00', '2026-11-10 08:00-09:00', '2026-11-10 09:00-09:30'],
);

// eletricistas diferentes: o 2º usa a agenda dele (ocupado 09-10), cursor continua
const r = run({ itens: it(60, 60), eletricistas: [1, 2], ocupadosPor: agenda({ '2|2026-11-10': [['09:00', '10:00']] }) });
assert.deepStrictEqual(txt(r), ['2026-11-10 08:00-09:00', '2026-11-10 10:00-11:00']);

// arredondamento para 15 min
assert.deepStrictEqual(txt(run({ itens: it(20, 20), inicioMin: m('08:05') })), ['2026-11-10 08:15-08:35', '2026-11-10 08:45-09:05']);
assert.strictEqual(run({ itens: it(30), ocupadosPor: agenda({ '1|2026-11-10': [['08:00', '08:40']] }) })[0].hora_inicio, '08:45');

// cancelada não ocupa
assert.deepStrictEqual(txt(run({ itens: it(60), ocupadosPor: agenda({ '1|2026-11-10': [['08:00', '12:00', 'cancelada']] }) })), ['2026-11-10 08:00-09:00']);

// casos 3 e 4: fixa preservada, seguintes recomeçam do fim dela
assert.deepStrictEqual(
  txt(run({ itens: it(60, 60, 60), fixas: [{ data: '2026-11-12', inicioMin: m('14:00') }] })),
  ['2026-11-12 14:00-15:00', '2026-11-12 15:00-16:00', '2026-11-12 16:00-17:00'],
);

console.log('recomendacao: ok');

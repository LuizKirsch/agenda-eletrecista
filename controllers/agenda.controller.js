const agendaService = require('../services/agenda.service');
const { httpErro } = require('../middlewares/erros');
const { lerId } = require('./os.controller');
const { ehData } = require('../services/horario');

async function listar(req, res) {
  const { inicio, fim } = req.query;
  if (!ehData(inicio) || !ehData(fim) || fim < inicio) throw httpErro(400, 'Período inválido.');
  // RF 1.13: eletricista_id=1,2,3 filtra por um ou mais eletricistas; ausente = todos
  const eletricistaIds = req.query.eletricista_id ? String(req.query.eletricista_id).split(',').map(lerId) : null;
  if (eletricistaIds?.some((id) => !id)) throw httpErro(400, 'Eletricista inválido.');
  res.json(await agendaService.listar(inicio, fim, eletricistaIds));
}

module.exports = { listar };

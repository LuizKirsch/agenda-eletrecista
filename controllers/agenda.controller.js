const agendaService = require('../services/agenda.service');
const { httpErro } = require('../middlewares/erros');
const { lerId } = require('./os.controller');
const { ehData } = require('../services/horario');

async function listar(req, res) {
  const { inicio, fim } = req.query;
  if (!ehData(inicio) || !ehData(fim) || fim < inicio) throw httpErro(400, 'Período inválido.');
  const eletricistaId = lerId(req.query.eletricista_id);
  if (req.query.eletricista_id && !eletricistaId) throw httpErro(400, 'Eletricista inválido.');
  res.json(await agendaService.listar(inicio, fim, eletricistaId));
}

module.exports = { listar };

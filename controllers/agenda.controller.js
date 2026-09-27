const agendaService = require('../services/agenda.service');
const { httpErro } = require('../middlewares/erros');
const { ehData } = require('../services/horario');

async function listar(req, res) {
  const { inicio, fim } = req.query;
  if (!ehData(inicio) || !ehData(fim) || fim < inicio) throw httpErro(400, 'Período inválido.');
  res.json(await agendaService.listar(inicio, fim));
}

module.exports = { listar };

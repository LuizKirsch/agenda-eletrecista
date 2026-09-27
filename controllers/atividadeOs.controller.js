const osService = require('../services/os.service');
const { httpErro } = require('../middlewares/erros');
const { lerHorario } = require('./os.controller');

async function remarcar(req, res) {
  res.json(await osService.remarcarAtividade(req.params.id, lerHorario(req.body)));
}

async function alterarStatus(req, res) {
  const status = req.body?.status;
  if (!['concluida', 'cancelada'].includes(status)) throw httpErro(400, 'Status inválido.');
  res.json(await osService.alterarStatus(req.params.id, status));
}

async function excluir(req, res) {
  await osService.excluirAtividade(req.params.id);
  res.status(204).end();
}

module.exports = { remarcar, alterarStatus, excluir };

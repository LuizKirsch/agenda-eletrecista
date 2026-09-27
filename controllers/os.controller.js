const osService = require('../services/os.service');
const { httpErro } = require('../middlewares/erros');
const { ehData, ehHora } = require('../services/horario');

function lerId(valor) {
  const n = Number(valor);
  return valor !== null && valor !== '' && Number.isInteger(n) && n > 0 ? n : null;
}

// Valida data/início/fim; `sufixo` identifica a linha nas mensagens (ex.: " (2ª atividade)").
function lerHorario(obj, sufixo = '') {
  const { data, hora_inicio: horaInicio, hora_fim: horaFim } = obj ?? {};
  if (!ehData(data)) throw httpErro(400, `Preencha o campo Data${sufixo}.`);
  if (!ehHora(horaInicio)) throw httpErro(400, `Preencha o campo Início${sufixo}.`);
  if (!ehHora(horaFim)) throw httpErro(400, `Preencha o campo Fim${sufixo}.`);
  if (horaFim <= horaInicio) throw httpErro(400, `O horário de fim precisa ser depois do início${sufixo}.`);
  return { data, hora_inicio: horaInicio, hora_fim: horaFim };
}

function lerOs(body) {
  const clienteId = lerId(body?.cliente_id);
  if (!clienteId) throw httpErro(400, 'Selecione o cliente.');
  const enderecoId = lerId(body.endereco_id);
  const observacao = typeof body.observacao === 'string' && body.observacao.trim() ? body.observacao.trim() : null;
  if (!Array.isArray(body.atividades) || !body.atividades.length) throw httpErro(400, 'Adicione ao menos uma atividade.');

  const atividades = body.atividades.map((linha, i) => {
    const sufixo = ` (${i + 1}ª atividade)`;
    const tipoId = lerId(linha?.tipo_atividade_id);
    if (!tipoId) throw httpErro(400, `Selecione o tipo de atividade${sufixo}.`);
    return { id: lerId(linha.id), tipo_atividade_id: tipoId, ...lerHorario(linha, sufixo) };
  });
  return { cliente_id: clienteId, endereco_id: enderecoId, observacao, atividades };
}

async function detalhar(req, res) {
  res.json(await osService.detalhar(req.params.id));
}

async function criar(req, res) {
  res.status(201).json(await osService.criar(lerOs(req.body)));
}

async function atualizar(req, res) {
  res.json(await osService.atualizar(req.params.id, lerOs(req.body)));
}

async function excluir(req, res) {
  await osService.excluir(req.params.id);
  res.status(204).end();
}

async function deslocar(req, res) {
  const atividadeId = lerId(req.body?.atividade_id);
  if (!atividadeId) throw httpErro(404, 'Atividade não encontrada.');
  const { data, hora_inicio: horaInicio } = req.body;
  if (!ehData(data)) throw httpErro(400, 'Preencha o campo Data.');
  if (!ehHora(horaInicio)) throw httpErro(400, 'Preencha o campo Início.');
  res.json(await osService.deslocar(req.params.id, { atividade_id: atividadeId, data, hora_inicio: horaInicio }));
}

async function concluir(req, res) {
  res.json(await osService.concluir(req.params.id));
}

module.exports = { lerHorario, detalhar, criar, atualizar, excluir, deslocar, concluir };

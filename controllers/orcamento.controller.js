const orcamentoService = require('../services/orcamento.service');
const { httpErro, lerCampos } = require('../middlewares/erros');
const { ehData, ehHora } = require('../services/horario');
const { lerId } = require('./os.controller');
const { vazio, lerValor } = require('./tipoAtividade.controller');

const inteiroEntre = (bruto, min, max) => {
  const n = Number(bruto);
  return typeof bruto !== 'boolean' && !vazio(bruto) && Number.isInteger(n) && n >= min && n <= max ? n : null;
};

function lerItem(item, i) {
  const sufixo = ` (${i + 1}º item)`;
  const { descricao } = lerCampos(item, { descricao: { rotulo: `Descrição${sufixo}`, max: 100, obrigatorio: true } });
  const quantidade = inteiroEntre(item.quantidade, 1, 9999);
  if (!quantidade) throw httpErro(400, `A quantidade deve ser um número inteiro maior que zero${sufixo}.`);
  if (vazio(item.valor_unitario)) throw httpErro(400, `Preencha o campo Valor unitário${sufixo}.`);
  const duracao = inteiroEntre(item.duracao_min, 5, 720);
  if (!duracao) throw httpErro(400, `O tempo deve ser um número inteiro entre 5 e 720 minutos${sufixo}.`);
  return {
    tipo_atividade_id: lerId(item.tipo_atividade_id),
    descricao,
    quantidade,
    valor_unitario: lerValor(item.valor_unitario, `Valor unitário${sufixo}`),
    duracao_min: duracao,
  };
}

// RN 44: cliente, endereço e ao menos um item; o service confere se o endereço é do cliente
function lerOrcamento(body) {
  const clienteId = lerId(body?.cliente_id);
  if (!clienteId) throw httpErro(400, 'Selecione o cliente.');
  const enderecoId = lerId(body.endereco_id);
  if (!enderecoId) throw httpErro(400, 'Selecione o endereço.');
  const observacao = typeof body.observacao === 'string' && body.observacao.trim() ? body.observacao.trim() : null;
  if (!Array.isArray(body.itens) || !body.itens.length) throw httpErro(400, 'Adicione ao menos um item de serviço.');
  const itens = body.itens.map((item, i) => lerItem(item ?? {}, i));
  return { cliente_id: clienteId, endereco_id: enderecoId, observacao, itens };
}

async function listar(req, res) {
  res.json(await orcamentoService.listar());
}

async function detalhar(req, res) {
  res.json(await orcamentoService.detalhar(req.params.id));
}

async function criar(req, res) {
  res.status(201).json(await orcamentoService.criar(lerOrcamento(req.body)));
}

async function atualizar(req, res) {
  res.json(await orcamentoService.atualizar(req.params.id, lerOrcamento(req.body)));
}

async function excluir(req, res) {
  await orcamentoService.excluir(req.params.id);
  res.status(204).end();
}

async function recusar(req, res) {
  res.json(await orcamentoService.recusar(req.params.id));
}

// body: { atividades: [{ data, hora_inicio }] }, uma por item, na ordem dos itens (RN 51)
async function aceitar(req, res) {
  const lista = req.body?.atividades;
  if (!Array.isArray(lista) || !lista.length) throw httpErro(400, 'Informe a data e o início de cada item.');
  const horarios = lista.map((h, i) => {
    if (!ehData(h?.data)) throw httpErro(400, `Preencha o campo Data (${i + 1}º item).`);
    if (!ehHora(h.hora_inicio)) throw httpErro(400, `Preencha o campo Início (${i + 1}º item).`);
    return { data: h.data, hora_inicio: h.hora_inicio };
  });
  res.json(await orcamentoService.aceitar(req.params.id, horarios));
}

module.exports = {
  listar, detalhar, criar, atualizar, excluir, recusar, aceitar,
};

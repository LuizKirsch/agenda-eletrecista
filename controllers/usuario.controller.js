const usuarioService = require('../services/usuario.service');
const { httpErro, exigirCampos } = require('../middlewares/erros');

function lerUsuario(body, { edicao = false } = {}) {
  exigirCampos(body, { nome: 'Nome', login: 'Login', ...(!edicao && { senha: 'Senha' }), perfil: 'Perfil' });
  const nome = body.nome.trim();
  const login = body.login.trim();
  const { perfil } = body;
  const senha = typeof body.senha === 'string' && body.senha ? body.senha : undefined;

  if (nome.length > 100) throw httpErro(400, 'O campo Nome deve ter no máximo 100 caracteres.');
  if (login.length > 60) throw httpErro(400, 'O campo Login deve ter no máximo 60 caracteres.');
  if (!['eletricista', 'secretaria'].includes(perfil)) throw httpErro(400, 'Perfil inválido.');
  if (edicao && typeof body.ativo !== 'boolean') throw httpErro(400, 'Preencha o campo Ativo.');

  return { nome, login, senha, perfil, ...(edicao && { ativo: body.ativo }) };
}

async function listar(req, res) {
  res.json(await usuarioService.listar());
}

async function criar(req, res) {
  res.status(201).json(await usuarioService.criar(lerUsuario(req.body)));
}

async function atualizar(req, res) {
  res.json(await usuarioService.atualizar(req.params.id, lerUsuario(req.body, { edicao: true }), req.usuario));
}

async function excluir(req, res) {
  await usuarioService.excluir(req.params.id, req.usuario);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, excluir };

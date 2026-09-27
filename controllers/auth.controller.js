const authService = require('../services/auth.service');
const { exigirCampos } = require('../middlewares/erros');

const opcoesCookie = () => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });

async function login(req, res) {
  exigirCampos(req.body, { login: 'Login', senha: 'Senha' });
  const { token, expira, usuario } = await authService.entrar(req.body.login.trim(), req.body.senha);
  res.cookie('token', token, { ...opcoesCookie(), expires: expira });
  res.json(usuario);
}

function logout(req, res) {
  res.clearCookie('token', opcoesCookie());
  res.status(204).end();
}

function me(req, res) {
  res.json(req.usuario);
}

module.exports = { login, logout, me };

const authService = require('../services/auth.service');
const { exigirCampos, httpErro } = require('../middlewares/erros');

const opcoesCookie = () => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });

// P2.1: limite de tentativas de login (5 falhas em 15 min por login + IP -> 429).
// ponytail: em memória, por processo (zera ao reiniciar, não é compartilhado entre instâncias); Redis se houver mais de uma instância.
const MAX_FALHAS = 5;
const JANELA_MS = 15 * 60 * 1000;
const falhas = new Map(); // chave -> { n, ate }

async function login(req, res) {
  exigirCampos(req.body, { login: 'Login', senha: 'Senha' });
  const nomeLogin = req.body.login.trim();
  const chave = `${nomeLogin.toLowerCase()}|${req.ip}`; // com o IP, errar a senha de outro login não tranca o dono
  const agora = Date.now();
  for (const [k, v] of falhas) if (v.ate <= agora) falhas.delete(k); // poda oportunista
  if ((falhas.get(chave)?.n ?? 0) >= MAX_FALHAS) throw httpErro(429, 'Muitas tentativas. Tente novamente em alguns minutos.');

  let resultado;
  try {
    resultado = await authService.entrar(nomeLogin, req.body.senha);
  } catch (e) {
    if (e.status === 401) { // só credencial errada conta (RN 22: mensagem 401 inalterada)
      const f = falhas.get(chave) ?? { n: 0, ate: agora + JANELA_MS };
      f.n += 1;
      falhas.set(chave, f);
    }
    throw e;
  }
  falhas.delete(chave);
  const { token, expira, usuario } = resultado;
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

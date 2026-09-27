const MENSAGEM_GENERICA = 'Não foi possível concluir a operação. Tente novamente.';

// Erro com status HTTP e mensagem que pode ir para o usuário.
function httpErro(status, mensagem) {
  return Object.assign(new Error(mensagem), { status, publico: true });
}

// Lança 400 "Preencha o campo X." para o primeiro campo vazio. `campos` = { chave: 'Rótulo' }.
function exigirCampos(body, campos) {
  for (const [chave, rotulo] of Object.entries(campos)) {
    const valor = body?.[chave];
    if (typeof valor !== 'string' || !valor.trim()) throw httpErro(400, `Preencha o campo ${rotulo}.`);
  }
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  if (!err.publico) console.error(err);
  res.status(err.status || 500).json({ erro: err.publico ? err.message : MENSAGEM_GENERICA });
}

module.exports = { httpErro, exigirCampos, tratarErros };

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

// Apara, valida obrigatórios e tamanhos e devolve só os campos declarados (opcional vazio vira null).
// `campos` = { chave: { rotulo, max, obrigatorio } }
function lerCampos(body, campos) {
  const dados = {};
  for (const [chave, { rotulo, max, obrigatorio }] of Object.entries(campos)) {
    const valor = typeof body?.[chave] === 'string' ? body[chave].trim() : '';
    if (obrigatorio && !valor) throw httpErro(400, `Preencha o campo ${rotulo}.`);
    if (max && valor.length > max) throw httpErro(400, `O campo ${rotulo} deve ter no máximo ${max} caracteres.`);
    dados[chave] = valor || null;
  }
  return dados;
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  if (!err.publico) console.error(err);
  res.status(err.status || 500).json({ erro: err.publico ? err.message : MENSAGEM_GENERICA });
}

module.exports = { httpErro, exigirCampos, lerCampos, tratarErros };

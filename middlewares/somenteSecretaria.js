const { httpErro } = require('./erros');

module.exports = function somenteSecretaria(req, res, next) {
  if (req.usuario.perfil !== 'secretaria') throw httpErro(403, 'Acesso permitido somente à secretária.');
  next();
};

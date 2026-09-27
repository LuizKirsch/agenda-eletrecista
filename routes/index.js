const router = require('express').Router();
const autenticar = require('../middlewares/autenticar');
const { httpErro } = require('../middlewares/erros');

router.use('/auth', require('./auth.routes'));

// Tudo abaixo exige sessão. Agenda, atividade, cliente e orçamento entram aqui.
router.use(autenticar);
router.use('/usuarios', require('./usuario.routes'));
router.use('/clientes', require('./cliente.routes'));
router.use('/enderecos', require('./endereco.routes'));
router.use('/tipos-atividade', require('./tipoAtividade.routes'));

router.use(() => { throw httpErro(404, 'Recurso não encontrado.'); });

module.exports = router;

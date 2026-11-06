const router = require('express').Router();
const tipos = require('../controllers/tipoAtividade.controller');

router.get('/', tipos.listar);
router.post('/', tipos.criar);
router.put('/:id', tipos.atualizar);
router.patch('/:id/situacao', tipos.alterarSituacao);

module.exports = router;

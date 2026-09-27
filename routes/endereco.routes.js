const router = require('express').Router();
const enderecos = require('../controllers/endereco.controller');

router.get('/:id', enderecos.detalhar);
router.post('/:id/observacoes', enderecos.adicionarObservacao);
router.get('/:id/observacoes', enderecos.listarObservacoes);

module.exports = router;

const router = require('express').Router();
const orcamentos = require('../controllers/orcamento.controller');

router.get('/', orcamentos.listar);
router.post('/', orcamentos.criar);
router.get('/:id', orcamentos.detalhar);
router.get('/:id/versoes', orcamentos.listarVersoes);
router.get('/:id/versoes/:numero', orcamentos.detalharVersao);
router.put('/:id', orcamentos.atualizar);
router.delete('/:id', orcamentos.excluir);
router.post('/:id/aceitar', orcamentos.aceitar);
router.post('/:id/recusar', orcamentos.recusar);

module.exports = router;

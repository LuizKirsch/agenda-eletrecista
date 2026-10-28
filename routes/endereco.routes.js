const router = require('express').Router();
const enderecos = require('../controllers/endereco.controller');

router.get('/:id', enderecos.detalhar);
router.put('/:id', enderecos.atualizar);
router.delete('/:id', enderecos.excluir);
router.post('/:id/observacoes', enderecos.adicionarObservacao);
router.get('/:id/observacoes', enderecos.listarObservacoes);
router.put('/:id/observacoes/:observacaoId', enderecos.atualizarObservacao);
router.delete('/:id/observacoes/:observacaoId', enderecos.excluirObservacao);

module.exports = router;

const router = require('express').Router();
const atividades = require('../controllers/atividadeOs.controller');

router.patch('/:id/horario', atividades.remarcar);
router.patch('/:id/status', atividades.alterarStatus);
router.delete('/:id', atividades.excluir);

module.exports = router;

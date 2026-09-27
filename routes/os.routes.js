const router = require('express').Router();
const os = require('../controllers/os.controller');

router.post('/', os.criar);
router.get('/:id', os.detalhar);
router.put('/:id', os.atualizar);
router.delete('/:id', os.excluir);
router.post('/:id/deslocar', os.deslocar);
router.post('/:id/concluir', os.concluir);

module.exports = router;

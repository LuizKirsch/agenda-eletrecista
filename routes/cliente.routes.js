const router = require('express').Router();
const clientes = require('../controllers/cliente.controller');

router.get('/', clientes.listar);
router.post('/', clientes.criar);
router.get('/:id', clientes.detalhar);
router.put('/:id', clientes.atualizar);
router.delete('/:id', clientes.excluir);
router.post('/:id/enderecos', clientes.adicionarEndereco);

module.exports = router;

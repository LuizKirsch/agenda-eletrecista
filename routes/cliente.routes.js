const router = require('express').Router();
const clientes = require('../controllers/cliente.controller');

router.get('/', clientes.listar);
router.post('/', clientes.criar);
router.get('/:id', clientes.detalhar);
router.post('/:id/enderecos', clientes.adicionarEndereco);

module.exports = router;

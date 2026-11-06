const router = require('express').Router();
const usuarios = require('../controllers/usuario.controller');
const somenteSecretaria = require('../middlewares/somenteSecretaria');

router.get('/', usuarios.listar);
router.post('/', somenteSecretaria, usuarios.criar);
router.put('/:id', somenteSecretaria, usuarios.atualizar);
router.delete('/:id', somenteSecretaria, usuarios.excluir);

module.exports = router;

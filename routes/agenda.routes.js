const router = require('express').Router();
const agenda = require('../controllers/agenda.controller');

router.get('/', agenda.listar);

module.exports = router;

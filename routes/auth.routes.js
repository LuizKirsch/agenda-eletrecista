const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const autenticar = require('../middlewares/autenticar');

router.post('/login', auth.login);
router.post('/logout', autenticar, auth.logout);
router.get('/me', autenticar, auth.me);

module.exports = router;

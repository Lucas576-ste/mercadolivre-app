const express = require('express');
const router = express.Router();
const { sugerirCategoria } = require('../controller/categoria.controller');

router.get('/sugerir', sugerirCategoria);

module.exports = router;

const express = require('express');
const router = express.Router();
const { sugerirCategoria, buscarAtributos } = require('../controller/categoria.controller');

router.get('/sugerir', sugerirCategoria);
router.get('/:id/atributos', buscarAtributos);

module.exports = router;

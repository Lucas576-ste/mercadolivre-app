const express = require('express');
const router = express.Router();
const { sugerirCategoria } = require('../controllers/categoria.controller');

router.get('/sugerir', sugerirCategoria);

module.exports = router;

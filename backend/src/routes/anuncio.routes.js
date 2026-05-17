const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  listar,
  buscarPorId,
  criar,
  editar,
  atualizarPreco,
  atualizarEstoque,
  sincronizar,
} = require('../controller/anuncio.controller');

router.use(authMiddleware);

router.get('/', listar);
router.post('/sincronizar', sincronizar);
router.get('/:id', buscarPorId);
router.post('/', criar);
router.put('/:id', editar);
router.patch('/:id/preco', atualizarPreco);
router.patch('/:id/estoque', atualizarEstoque);

module.exports = router;

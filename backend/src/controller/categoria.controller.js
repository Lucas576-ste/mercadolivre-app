const asyncHandler        = require('../middleware/asyncHandler');
const categoriaService    = require('../service/categoria.service');
const ValidationException = require('../domain/exception/ValidationException');

const sugerirCategoria = asyncHandler(async (req, res) => {
  const { titulo } = req.query;
  if (!titulo || titulo.trim() === '') throw new ValidationException('Título é obrigatório.');
  res.json(await categoriaService.sugerirCategoria(titulo.trim()));
});

module.exports = { sugerirCategoria };

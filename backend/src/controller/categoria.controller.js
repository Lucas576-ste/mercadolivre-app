const asyncHandler        = require('../middleware/asyncHandler');
const categoriaService    = require('../service/categoria.service');
const ValidationException = require('../domain/exception/ValidationException');

const sugerirCategoria = asyncHandler(async (req, res) => {
  const { titulo } = req.query;
  if (!titulo || titulo.trim() === '') throw new ValidationException('Título é obrigatório.');
  res.json(await categoriaService.sugerirCategoria(titulo.trim()));
});

const buscarAtributos = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new ValidationException('ID da categoria é obrigatório.');
  res.json(await categoriaService.buscarAtributos(id));
});

module.exports = { sugerirCategoria, buscarAtributos };

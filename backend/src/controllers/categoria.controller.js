const categoriaService = require('../services/categoria.service');

async function sugerirCategoria(req, res) {
  const { titulo } = req.query;

  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ erro: 'Título é obrigatório.' });
  }

  try {
    const resultado = await categoriaService.sugerirCategoria(titulo.trim());
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar categoria.', detalhe: error.message });
  }
}

module.exports = { sugerirCategoria };

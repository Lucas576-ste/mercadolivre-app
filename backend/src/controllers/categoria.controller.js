const axios = require('axios');

async function sugerirCategoria(req, res) {
  const { titulo } = req.query;

  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ erro: 'Título é obrigatório.' });
  }

  try {
    // Passo 1 — Preditor de categoria
    const { data: sugestoes } = await axios.get(
      `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=1`
    );

    if (!sugestoes || sugestoes.length === 0) {
      return res.json({ category_id: null, category_name: null, atributos: [] });
    }

    const { category_id, category_name } = sugestoes[0];

    // Passo 2 — Atributos obrigatórios da categoria
    const { data: attrs } = await axios.get(
      `https://api.mercadolibre.com/categories/${category_id}/attributes`
    );

    const atributos = attrs
      .filter(a => a.tags?.required)
      .map(a => ({
        id: a.id,
        nome: a.name,
        tipo: a.value_type,
        valores: a.values?.length > 0
          ? a.values.map(v => ({ id: v.id, nome: v.name }))
          : null,
      }));

    res.json({ category_id, category_name, atributos });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar categoria.', detalhe: error.message });
  }
}

module.exports = { sugerirCategoria };

const { mlPublicRequest } = require('./mlApi.service');

function mapearAtributos(attrs) {
  return attrs
    .filter(a => a.tags?.required)
    .map(a => ({
      id: a.id,
      nome: a.name,
      tipo: a.value_type,
      valores: a.values?.length > 0
        ? a.values.map(v => ({ id: v.id, nome: v.name }))
        : null,
    }));
}

async function sugerirCategoria(titulo) {
  const sugestoes = await mlPublicRequest(
    `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=1`
  );

  if (!sugestoes || sugestoes.length === 0) {
    return { category_id: null, category_name: null, atributos: [] };
  }

  const { category_id, category_name } = sugestoes[0];
  const attrs = await mlPublicRequest(`/categories/${category_id}/attributes`);

  return { category_id, category_name, atributos: mapearAtributos(attrs) };
}

async function buscarAtributos(categoryId) {
  const attrs = await mlPublicRequest(`/categories/${categoryId}/attributes`);
  return mapearAtributos(attrs);
}

module.exports = { sugerirCategoria, buscarAtributos };

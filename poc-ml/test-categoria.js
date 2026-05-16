const axios = require('axios');

const TITULOS = [
  'Smartphone Samsung Galaxy S23',
  'Tênis Nike Air Max',
  'Notebook Dell Inspiron 15',
];

async function preverCategoria(titulo) {
  const url = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=3`;
  const { data } = await axios.get(url);
  return data;
}

async function main() {
  console.log('🔍 Testando preditor de categorias do Mercado Livre\n');
  console.log('='.repeat(60));

  for (const titulo of TITULOS) {
    console.log(`\n📌 Título: "${titulo}"`);

    try {
      const sugestoes = await preverCategoria(titulo);

      if (!sugestoes || sugestoes.length === 0) {
        console.log('   ⚠️  Nenhuma sugestão retornada.');
        continue;
      }

      console.log('   Categorias sugeridas:');
      sugestoes.forEach((s, i) => {
        const prefixo = i === 0 ? '   ✅ (recomendada)' : '              ';
        console.log(`   ${prefixo} [${s.category_id}] ${s.category_name} — domínio: ${s.domain_name}`);
      });

      console.log(`\n   👉 category_id recomendada: ${sugestoes[0].category_id}`);
    } catch (error) {
      const detalhe = error.response?.data || error.message;
      console.error(`   ❌ Erro ao buscar categoria para "${titulo}":`);
      console.error('  ', JSON.stringify(detalhe, null, 2));
    }

    console.log('-'.repeat(60));
  }
}

main();

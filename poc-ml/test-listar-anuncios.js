const axios = require('axios');
const { getToken } = require('./config');

async function main() {
  console.log('🔍 Buscando token no MongoDB...\n');
  const token = await getToken();

  if (!token) {
    console.error('❌ Nenhum token encontrado. Faça login primeiro.');
    process.exit(1);
  }

  console.log(`✅ Token encontrado para usuário: ${token.ml_user_id}\n`);

  const headers = { Authorization: `Bearer ${token.access_token}` };

  // PASSO 1 — Buscar IDs dos anúncios
  console.log('📋 Buscando lista de anúncios do usuário...\n');

  let ids = [];
  try {
    const { data } = await axios.get(
      `https://api.mercadolibre.com/users/${token.ml_user_id}/items/search`,
      { headers }
    );
    ids = data.results || [];
    console.log(`✅ Total de anúncios encontrados: ${ids.length}\n`);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    console.error('❌ Erro ao listar anúncios:');
    console.error(JSON.stringify(detalhe, null, 2));
    process.exit(1);
  }

  if (ids.length === 0) {
    console.log('ℹ️  Nenhum anúncio encontrado nessa conta.');
    return;
  }

  // PASSO 2 — Buscar detalhes em lotes de 20
  console.log('='.repeat(80));
  console.log(
    'ID'.padEnd(16) +
    'TÍTULO'.padEnd(40) +
    'PREÇO'.padEnd(12) +
    'ESTOQUE'.padEnd(10) +
    'STATUS'
  );
  console.log('='.repeat(80));

  for (let i = 0; i < ids.length; i += 20) {
    const lote = ids.slice(i, i + 20);

    try {
      const { data } = await axios.get(
        `https://api.mercadolibre.com/items?ids=${lote.join(',')}`,
        { headers }
      );

      for (const item of data) {
        if (item.code !== 200) {
          console.log(`${item.body?.id || '???'.padEnd(16)} ❌ Erro ao buscar item (code ${item.code})`);
          continue;
        }

        const { id, title, price, available_quantity, status } = item.body;

        const statusEmoji =
          status === 'active' ? '🟢 ativo' :
          status === 'paused' ? '⚪ pausado' :
          status === 'closed' ? '🔴 fechado' : status;

        console.log(
          String(id).padEnd(16) +
          String(title).substring(0, 38).padEnd(40) +
          `R$ ${Number(price).toFixed(2)}`.padEnd(12) +
          String(available_quantity).padEnd(10) +
          statusEmoji
        );
      }
    } catch (error) {
      const detalhe = error.response?.data || error.message;
      console.error('❌ Erro ao buscar detalhes do lote:');
      console.error(JSON.stringify(detalhe, null, 2));
    }
  }

  console.log('='.repeat(80));
}

main();

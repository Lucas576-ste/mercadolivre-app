const axios = require('axios');
const { getToken } = require('./config');

const TITULO_TESTE = 'Smartphone Samsung Galaxy';
const TITULO_ANUNCIO = 'Smartphone Samsung Galaxy - Item de Teste Não Ofertar';

async function preverCategoria(titulo) {
  const url = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=1`;
  const { data } = await axios.get(url);
  return data[0]?.category_id || null;
}

async function main() {
  console.log('🔍 Buscando token no MongoDB...\n');
  const token = await getToken();

  if (!token) {
    console.error('❌ Nenhum token encontrado. Faça login primeiro.');
    process.exit(1);
  }

  console.log(`✅ Token encontrado para usuário: ${token.ml_user_id}\n`);

  // PASSO 1 — Prever categoria
  console.log(`🔍 Buscando category_id para: "${TITULO_TESTE}"...`);
  const categoryId = await preverCategoria(TITULO_TESTE);

  if (!categoryId) {
    console.error('❌ Não foi possível determinar a categoria. Abortando.');
    process.exit(1);
  }

  console.log(`✅ category_id obtida: ${categoryId}\n`);

  // PASSO 2 — Montar payload
  const payload = {
    title: TITULO_ANUNCIO,
    category_id: categoryId,
    price: 100,
    currency_id: 'BRL',
    available_quantity: 1,
    buying_mode: 'buy_it_now',
    listing_type_id: 'free',
    condition: 'new',
  };

  console.log('📦 Payload que será enviado ao ML:');
  console.log(JSON.stringify(payload, null, 2));
  console.log();

  // PASSO 3 — Criar anúncio
  console.log('🚀 Criando anúncio no Mercado Livre...\n');

  let mlId;
  try {
    const { data } = await axios.post('https://api.mercadolibre.com/items', payload, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    mlId = data.id;
    console.log('✅ Anúncio criado com sucesso!');
    console.log(`   ml_id  : ${mlId}`);
    console.log(`   status : ${data.status}`);
    console.log(`   link   : ${data.permalink}\n`);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    console.error('❌ Erro ao criar anúncio:');
    console.error(JSON.stringify(detalhe, null, 2));
    process.exit(1);
  }

  // PASSO 4 — Pausar imediatamente
  console.log('⏸️  Pausando anúncio de teste automaticamente...');
  try {
    await axios.put(
      `https://api.mercadolibre.com/items/${mlId}`,
      { status: 'paused' },
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    console.log('✅ Anúncio pausado com sucesso. Não aparecerá para compradores.');
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    console.warn('⚠️  Anúncio criado mas não foi possível pausar automaticamente:');
    console.warn(JSON.stringify(detalhe, null, 2));
    console.warn(`   Pause manualmente em: https://www.mercadolivre.com.br/anuncios/${mlId}`);
  }
}

main();

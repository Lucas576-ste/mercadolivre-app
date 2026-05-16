const axios = require('axios');
const { getToken } = require('./config');

async function main() {
  console.log('🔍 Buscando token no MongoDB...\n');

  const token = await getToken();

  if (!token) {
    console.error('❌ Nenhum token encontrado no banco. Faça login primeiro.');
    process.exit(1);
  }

  const agora = new Date();
  const expirado = agora >= new Date(token.expires_at);

  console.log('📦 Token salvo no banco:');
  console.log(`   ml_user_id : ${token.ml_user_id}`);
  console.log(`   expires_at : ${new Date(token.expires_at).toLocaleString('pt-BR')}`);
  console.log(`   expirado   : ${expirado ? '⚠️  SIM' : '✅ NÃO'}\n`);

  console.log('🌐 Chamando GET /users/me na API do ML...\n');

  try {
    const { data } = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });

    console.log('✅ Token válido! Dados do usuário:');
    console.log(`   ID        : ${data.id}`);
    console.log(`   Nome      : ${data.first_name} ${data.last_name}`);
    console.log(`   Nickname  : ${data.nickname}`);
    console.log(`   Email     : ${data.email}`);
    console.log(`   País      : ${data.country_id}`);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    console.error('❌ Erro ao chamar /users/me:');
    console.error(JSON.stringify(detalhe, null, 2));
  }
}

main();

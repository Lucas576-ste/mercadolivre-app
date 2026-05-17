const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const TokenRepository = require('../repository/TokenRepository');

const mlClient = axios.create({
  baseURL: 'https://api.mercadolibre.com',
  timeout: 10000,
});

axiosRetry(mlClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response && error.response.status >= 500);
  },
});

async function getToken() {
  const token = await TokenRepository.findFirst();
  if (!token) throw new Error('Usuário não autenticado. Faça login pelo /auth/login');
  return token;
}

async function refreshAccessToken(token) {
  const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
    grant_type: 'refresh_token',
    client_id: process.env.ML_CLIENT_ID,
    client_secret: process.env.ML_CLIENT_SECRET,
    refresh_token: token.refresh_token,
  });

  const { access_token, refresh_token, expires_in } = response.data;
  token.access_token = access_token;
  token.refresh_token = refresh_token;
  token.expires_at = new Date(Date.now() + expires_in * 1000);
  return TokenRepository.save(token);
}

async function getValidToken() {
  let token = await getToken();
  if (token.isExpired()) {
    token = await refreshAccessToken(token);
  }
  return token;
}

async function mlRequest(method, url, data = null) {
  const token = await getValidToken();
  const config = {
    method,
    url,
    headers: { Authorization: `Bearer ${token.access_token}` },
  };
  if (data) config.data = data;
  const response = await mlClient(config);
  return response.data;
}

// Chamadas à API pública do ML (sem autenticação) — aproveita o mesmo cliente com retry
async function mlPublicRequest(path) {
  const response = await mlClient.get(path);
  return response.data;
}

module.exports = { mlRequest, mlPublicRequest, getValidToken, refreshAccessToken };

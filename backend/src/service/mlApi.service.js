const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const FormData = require('form-data');
const TokenRepository = require('../repository/TokenRepository');
const UnauthorizedException = require('../domain/exception/UnauthorizedException');

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
  if (!token) throw new UnauthorizedException('Não autenticado. Acesse /auth/login para conectar sua conta do Mercado Livre.');
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

// Baixa uma imagem de uma URL externa e faz upload binário para o CDN do ML.
// Retorna { id } se bem-sucedido ou null se falhar.
async function mlUploadFoto(url) {
  try {
    const imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const buffer = Buffer.from(imgRes.data);
    const contentType = imgRes.headers['content-type'] || 'image/jpeg';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';

    const form = new FormData();
    form.append('file', buffer, { filename: `photo.${ext}`, contentType });

    const token = await getValidToken();
    const response = await mlClient({
      method: 'post',
      url: '/pictures/items/upload',
      headers: { Authorization: `Bearer ${token.access_token}`, ...form.getHeaders() },
      data: form,
    });

    return response.data?.id ? { id: response.data.id } : null;
  } catch (e) {
    console.warn('[ML] Falha ao fazer upload de foto:', e.message);
    return null;
  }
}

module.exports = { mlRequest, mlPublicRequest, getValidToken, refreshAccessToken, mlUploadFoto };

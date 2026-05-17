const axios = require('axios');
const TokenRepository       = require('../repository/TokenRepository');
const { refreshAccessToken } = require('./mlApi.service');
const ValidationException   = require('../domain/exception/ValidationException');
const MercadoLivreException = require('../domain/exception/MercadoLivreException');

function gerarUrlLogin() {
  const url = new URL('https://auth.mercadolivre.com.br/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.ML_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.ML_REDIRECT_URI);
  return url.toString();
}

async function processarCallback(code) {
  if (!code) throw new ValidationException('Código de autorização não recebido.');

  let tokenData;
  try {
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI,
    });
    tokenData = response.data;
  } catch (error) {
    throw new MercadoLivreException(
      'Falha ao obter token do Mercado Livre.',
      error.response?.data || error.message
    );
  }

  const { access_token, refresh_token, expires_in, user_id } = tokenData;

  await TokenRepository.upsert(String(user_id), {
    ml_user_id:    String(user_id),
    access_token,
    refresh_token,
    expires_at: new Date(Date.now() + expires_in * 1000),
  });
}

async function verificarStatus() {
  const token = await TokenRepository.findFirst();
  if (!token) return false;

  if (token.isExpired()) {
    try {
      await refreshAccessToken(token);
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

async function logout() {
  await TokenRepository.deleteAll();
}

module.exports = { gerarUrlLogin, processarCallback, verificarStatus, logout };

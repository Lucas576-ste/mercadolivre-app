const axios = require('axios');
const Token = require('../models/Token');
const { refreshAccessToken } = require('./mlApi.service');
const ServiceError = require('../utils/ServiceError');

function gerarUrlLogin() {
  const url = new URL('https://auth.mercadolivre.com.br/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.ML_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.ML_REDIRECT_URI);
  return url.toString();
}

async function processarCallback(code) {
  if (!code) throw new ServiceError('Código de autorização não recebido.', 400);

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
    throw new ServiceError(
      'Falha ao obter token do Mercado Livre.',
      500,
      error.response?.data || error.message
    );
  }

  const { access_token, refresh_token, expires_in, user_id } = tokenData;

  await Token.findOneAndUpdate(
    { ml_user_id: String(user_id) },
    {
      ml_user_id: String(user_id),
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
    },
    { upsert: true, new: true }
  );
}

async function verificarStatus() {
  const token = await Token.findOne();
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
  await Token.deleteMany({});
}

module.exports = { gerarUrlLogin, processarCallback, verificarStatus, logout };

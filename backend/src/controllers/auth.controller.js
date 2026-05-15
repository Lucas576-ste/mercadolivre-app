const axios = require('axios');
const Token = require('../models/Token');

function login(req, res) {
  const url = new URL('https://auth.mercadolivre.com.br/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.ML_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.ML_REDIRECT_URI);
  res.redirect(url.toString());
}

async function callback(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ erro: 'Código de autorização não recebido.' });
  }

  try {
    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'authorization_code',
      client_id: process.env.ML_CLIENT_ID,
      client_secret: process.env.ML_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI,
    });

    const { access_token, refresh_token, expires_in, user_id } = response.data;

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

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    res.status(500).json({ erro: 'Falha ao obter token do Mercado Livre.', detalhe });
  }
}

async function status(req, res) {
  try {
    const token = await Token.findOne();
    if (!token) return res.json({ autenticado: false });

    if (token.isExpired()) {
      try {
        await require('../services/mlApi.service').refreshAccessToken(token);
        return res.json({ autenticado: true });
      } catch {
        return res.json({ autenticado: false });
      }
    }

    res.json({ autenticado: true });
  } catch {
    res.json({ autenticado: false });
  }
}

async function logout(req, res) {
  try {
    await Token.deleteMany({});
    res.json({ mensagem: 'Logout realizado.' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao fazer logout.', detalhe: error.message });
  }
}

module.exports = { login, callback, status, logout };

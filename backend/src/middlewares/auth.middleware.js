const Token = require('../models/Token');
const { getValidToken } = require('../services/mlApi.service');

async function authMiddleware(req, res, next) {
  try {
    const token = await Token.findOne();
    if (!token) {
      return res.status(401).json({ erro: 'Não autenticado. Acesse /auth/login para conectar sua conta do Mercado Livre.' });
    }
    // Garante que o token esta valido (renova se necessario)
    await getValidToken();
    next();
  } catch (error) {
    return res.status(401).json({ erro: 'Falha na autenticação.', detalhe: error.message });
  }
}

module.exports = authMiddleware;

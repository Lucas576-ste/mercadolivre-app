const TokenRepository = require('../repository/TokenRepository');
const { getValidToken } = require('../service/mlApi.service');

async function authMiddleware(req, res, next) {
  try {
    const token = await TokenRepository.findFirst();
    if (!token) {
      return res.status(401).json({
        erro: 'Não autenticado. Acesse /auth/login para conectar sua conta do Mercado Livre.',
      });
    }
    await getValidToken();
    next();
  } catch (error) {
    return res.status(401).json({ erro: 'Falha na autenticação.', detalhe: error.message });
  }
}

module.exports = authMiddleware;

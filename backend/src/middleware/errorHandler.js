const NotFoundException       = require('../domain/exception/NotFoundException');
const ConflictException       = require('../domain/exception/ConflictException');
const MercadoLivreException   = require('../domain/exception/MercadoLivreException');
const ValidationException     = require('../domain/exception/ValidationException');
const UnauthorizedException   = require('../domain/exception/UnauthorizedException');

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof ValidationException) {
    return res.status(400).json({ erro: error.message });
  }

  if (error instanceof UnauthorizedException) {
    return res.status(401).json({ erro: error.message });
  }

  if (error instanceof NotFoundException) {
    return res.status(404).json({ erro: error.message });
  }

  if (error instanceof ConflictException) {
    return res.status(409).json({ erro: error.message });
  }

  if (error instanceof MercadoLivreException) {
    const body = { erro: error.message };
    if (error.detalhe) body.detalhe = error.detalhe;
    return res.status(400).json(body);
  }

  // Erro não mapeado — não expõe detalhes internos em produção
  console.error('[UNHANDLED ERROR]', error);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    erro: 'Erro interno do servidor.',
    ...(isProd ? {} : { detalhe: error.message }),
  });
}

module.exports = errorHandler;

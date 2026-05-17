// Envolve funções async do controller e encaminha erros ao errorHandler global
// Necessário no Express 4 (Express 5 faz isso nativamente)
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

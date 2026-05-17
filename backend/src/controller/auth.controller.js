const asyncHandler = require('../middleware/asyncHandler');
const authService  = require('../service/auth.service');

function login(req, res) {
  res.redirect(authService.gerarUrlLogin());
}

// callback usa redirect no sucesso — asyncHandler encaminha erros ao errorHandler
const callback = asyncHandler(async (req, res) => {
  await authService.processarCallback(req.query.code);
  res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
});

const status = asyncHandler(async (req, res) => {
  const autenticado = await authService.verificarStatus();
  res.json({ autenticado });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout();
  res.json({ mensagem: 'Logout realizado.' });
});

module.exports = { login, callback, status, logout };

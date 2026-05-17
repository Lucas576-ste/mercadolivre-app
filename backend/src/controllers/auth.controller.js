const authService = require('../services/auth.service');

function login(req, res) {
  res.redirect(authService.gerarUrlLogin());
}

async function callback(req, res) {
  try {
    await authService.processarCallback(req.query.code);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  } catch (error) {
    const status = error.status || 500;
    const body = { erro: error.message };
    if (error.detalhe) body.detalhe = error.detalhe;
    res.status(status).json(body);
  }
}

async function status(req, res) {
  const autenticado = await authService.verificarStatus();
  res.json({ autenticado });
}

async function logout(req, res) {
  try {
    await authService.logout();
    res.json({ mensagem: 'Logout realizado.' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao fazer logout.', detalhe: error.message });
  }
}

module.exports = { login, callback, status, logout };

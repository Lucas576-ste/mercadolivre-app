const anuncioService = require('../services/anuncio.service');

// Mapeia erros do service para a resposta HTTP correta
function handleError(res, error) {
  const status  = error.status  || 500;
  const erro    = error.message || 'Erro interno.';
  const detalhe = error.detalhe || undefined;
  return res.status(status).json(detalhe ? { erro, detalhe } : { erro });
}

async function listar(req, res) {
  try {
    const resultado = await anuncioService.listar(req.query);
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
}

async function buscarPorId(req, res) {
  try {
    const anuncio = await anuncioService.buscarPorId(req.params.id);
    res.json(anuncio);
  } catch (error) {
    handleError(res, error);
  }
}

async function criar(req, res) {
  try {
    const anuncio = await anuncioService.criar(req.body);
    res.status(201).json(anuncio);
  } catch (error) {
    handleError(res, error);
  }
}

async function editar(req, res) {
  try {
    const anuncio = await anuncioService.editar(req.params.id, req.body);
    res.json(anuncio);
  } catch (error) {
    handleError(res, error);
  }
}

async function atualizarPreco(req, res) {
  try {
    const { preco } = req.body;
    if (preco === undefined || isNaN(preco)) {
      return res.status(400).json({ erro: 'Preço inválido.' });
    }
    const anuncio = await anuncioService.atualizarPreco(req.params.id, preco);
    res.json(anuncio);
  } catch (error) {
    handleError(res, error);
  }
}

async function atualizarEstoque(req, res) {
  try {
    const { estoque } = req.body;
    if (estoque === undefined || isNaN(estoque)) {
      return res.status(400).json({ erro: 'Estoque inválido.' });
    }
    const anuncio = await anuncioService.atualizarEstoque(req.params.id, estoque);
    res.json(anuncio);
  } catch (error) {
    handleError(res, error);
  }
}

async function sincronizar(req, res) {
  try {
    const resultado = await anuncioService.sincronizar();
    res.json(resultado);
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = { listar, buscarPorId, criar, editar, atualizarPreco, atualizarEstoque, sincronizar };

const asyncHandler        = require('../middleware/asyncHandler');
const anuncioService      = require('../service/anuncio.service');
const ValidationException = require('../domain/exception/ValidationException');

const listar = asyncHandler(async (req, res) => {
  res.json(await anuncioService.listar(req.query));
});

const buscarPorId = asyncHandler(async (req, res) => {
  res.json(await anuncioService.buscarPorId(req.params.id));
});

const criar = asyncHandler(async (req, res) => {
  res.status(201).json(await anuncioService.criar(req.body));
});

const editar = asyncHandler(async (req, res) => {
  res.json(await anuncioService.editar(req.params.id, req.body));
});

const atualizarPreco = asyncHandler(async (req, res) => {
  const { preco } = req.body;
  if (preco === undefined || isNaN(preco)) throw new ValidationException('Preço inválido.');
  res.json(await anuncioService.atualizarPreco(req.params.id, preco));
});

const atualizarEstoque = asyncHandler(async (req, res) => {
  const { estoque } = req.body;
  if (estoque === undefined || isNaN(estoque)) throw new ValidationException('Estoque inválido.');
  res.json(await anuncioService.atualizarEstoque(req.params.id, estoque));
});

const sincronizar = asyncHandler(async (req, res) => {
  res.json(await anuncioService.sincronizar());
});

module.exports = { listar, buscarPorId, criar, editar, atualizarPreco, atualizarEstoque, sincronizar };

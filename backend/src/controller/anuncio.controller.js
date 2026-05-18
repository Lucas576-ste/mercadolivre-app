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
  if (req.body.preco === undefined) throw new ValidationException('Preço é obrigatório.');
  res.json(await anuncioService.atualizarPreco(req.params.id, req.body.preco));
});

const atualizarEstoque = asyncHandler(async (req, res) => {
  if (req.body.estoque === undefined) throw new ValidationException('Estoque é obrigatório.');
  res.json(await anuncioService.atualizarEstoque(req.params.id, req.body.estoque));
});

const sincronizar = asyncHandler(async (req, res) => {
  res.json(await anuncioService.sincronizar());
});

const alterarStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new ValidationException('Status é obrigatório.');
  res.json(await anuncioService.alterarStatus(req.params.id, status));
});

module.exports = { listar, buscarPorId, criar, editar, atualizarPreco, atualizarEstoque, sincronizar, alterarStatus };

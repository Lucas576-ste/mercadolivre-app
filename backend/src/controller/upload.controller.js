const asyncHandler = require('../middleware/asyncHandler');
const uploadService = require('../service/upload.service');
const ValidationException = require('../domain/exception/ValidationException');

const uploadImagem = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationException('Nenhum arquivo enviado.');
  const url = await uploadService.uploadParaImgBB(req.file.buffer, req.file.originalname, req.file.mimetype);
  res.json({ url });
});

module.exports = { uploadImagem };

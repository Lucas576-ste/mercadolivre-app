const asyncHandler = require('../middleware/asyncHandler');
const uploadService = require('../service/upload.service');
const ValidationException = require('../domain/exception/ValidationException');

const uploadImagem = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationException('Nenhum arquivo enviado.');

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!tiposPermitidos.includes(req.file.mimetype)) {
    throw new ValidationException('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.');
  }

  if (req.file.size > 5 * 1024 * 1024) {
    throw new ValidationException('Arquivo muito grande. Máximo 5MB.');
  }

  const url = await uploadService.uploadParaImgBB(req.file.buffer, req.file.originalname);
  res.json({ url });
});

module.exports = { uploadImagem };

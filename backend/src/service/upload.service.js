const axios = require('axios');
const ValidationException = require('../domain/exception/ValidationException');

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

async function uploadParaImgBB(buffer, nomeArquivo, mimetype) {
  if (!TIPOS_PERMITIDOS.includes(mimetype)) {
    throw new ValidationException('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.');
  }

  if (buffer.length > TAMANHO_MAXIMO) {
    throw new ValidationException('Arquivo muito grande. Máximo 5MB.');
  }

  if (!process.env.IMGBB_API_KEY) {
    throw new ValidationException('Serviço de upload não configurado. Contate o administrador.');
  }

  const base64 = buffer.toString('base64');

  const params = new URLSearchParams();
  params.append('key', process.env.IMGBB_API_KEY);
  params.append('image', base64);
  params.append('name', nomeArquivo);

  try {
    const { data } = await axios.post('https://api.imgbb.com/1/upload', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    if (!data.success) throw new ValidationException('ImgBB rejeitou o upload. Verifique a chave de API.');

    return data.data.display_url;
  } catch (err) {
    if (err instanceof ValidationException) throw err;
    const detalhe = err?.response?.data?.error?.message ?? err.message;
    throw new ValidationException(`Erro ao fazer upload da imagem: ${detalhe}`);
  }
}

module.exports = { uploadParaImgBB };

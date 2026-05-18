const axios = require('axios');
const ValidationException = require('../domain/exception/ValidationException');

async function uploadParaImgBB(buffer, nomeArquivo) {
  const base64 = buffer.toString('base64');

  const params = new URLSearchParams();
  params.append('key', process.env.IMGBB_API_KEY);
  params.append('image', base64);
  params.append('name', nomeArquivo);

  const { data } = await axios.post('https://api.imgbb.com/1/upload', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  if (!data.success) throw new ValidationException('Falha no upload da imagem.');

  return data.data.display_url;
}

module.exports = { uploadParaImgBB };

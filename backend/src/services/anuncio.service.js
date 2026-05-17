const axios = require('axios');
const Anuncio = require('../models/Anuncio');
const Token = require('../models/Token');
const { mlRequest } = require('./mlApi.service');

// Erro tipado para que o controller saiba qual HTTP status retornar
class ServiceError extends Error {
  constructor(mensagem, status = 500, detalhe = null) {
    super(mensagem);
    this.status = status;
    this.detalhe = detalhe;
  }
}

// ── Helpers ML públicos (sem autenticação) ─────────────────────────────────

async function detectarCategoria(titulo, categoriaFallback) {
  try {
    const { data } = await axios.get(
      `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=1`
    );
    if (data && data[0]?.category_id) return data[0].category_id;
  } catch {
    // fallback silencioso: usa a categoria enviada pelo frontend
  }
  return categoriaFallback;
}

async function montarAtributos(categoryId, titulo) {
  try {
    const { data: attrs } = await axios.get(
      `https://api.mercadolibre.com/categories/${categoryId}/attributes`
    );
    const obrigatorios = attrs.filter(a => a.tags?.required);

    return obrigatorios.map(attr => {
      if (attr.value_type === 'list' && attr.values?.length > 0) {
        return { id: attr.id, value_id: attr.values[0].id, value_name: attr.values[0].name };
      }
      if (attr.value_type === 'boolean') {
        const falso = attr.values?.find(v => v.name === 'Não' || v.name === 'No');
        return falso
          ? { id: attr.id, value_id: falso.id, value_name: falso.name }
          : { id: attr.id, value_name: 'Não' };
      }
      if (attr.value_type === 'number') {
        return { id: attr.id, value_name: '0' };
      }
      return { id: attr.id, value_name: titulo };
    });
  } catch {
    return [];
  }
}

// ── Casos de uso ───────────────────────────────────────────────────────────

async function listar({ status, categoria, busca, pagina = 1, limite = 20 }) {
  const filtro = {};
  if (status)    filtro.status   = status;
  if (categoria) filtro.categoria = categoria;
  if (busca)     filtro.titulo   = { $regex: busca, $options: 'i' };

  const skip = (Number(pagina) - 1) * Number(limite);
  const [anuncios, total] = await Promise.all([
    Anuncio.find(filtro).skip(skip).limit(Number(limite)).sort({ createdAt: -1 }),
    Anuncio.countDocuments(filtro),
  ]);

  return { anuncios, total, pagina: Number(pagina), limite: Number(limite) };
}

async function buscarPorId(id) {
  const anuncio = await Anuncio.findById(id);
  if (!anuncio) throw new ServiceError('Anúncio não encontrado.', 404);
  return anuncio;
}

async function criar({ titulo, descricao, categoria, condicao, preco, estoque, fotos }) {
  const categoryId  = await detectarCategoria(titulo, categoria);
  const attributes  = await montarAtributos(categoryId, titulo);

  const mlPayload = {
    title: titulo,
    category_id: categoryId,
    price: Number(preco),
    currency_id: 'BRL',
    available_quantity: 1,
    buying_mode: 'buy_it_now',
    listing_type_id: 'free',
    condition: condicao || 'new',
    pictures: (fotos || []).filter(u => u?.trim()).map(u => ({ source: u })),
    ...(attributes.length > 0 && { attributes }),
  };

  let mlResposta;
  try {
    mlResposta = await mlRequest('post', '/items', mlPayload);
  } catch (mlError) {
    throw new ServiceError(
      'Erro ao criar anúncio no Mercado Livre.',
      400,
      mlError.response?.data || mlError.message
    );
  }

  if (descricao?.trim()) {
    try {
      await mlRequest('post', `/items/${mlResposta.id}/description`, { plain_text: descricao });
    } catch (descError) {
      console.warn('Aviso: anúncio criado, mas falha ao salvar descrição:', descError.response?.data || descError.message);
    }
  }

  try {
    return await Anuncio.create({
      ml_id: mlResposta.id,
      titulo,
      descricao,
      preco: Number(preco),
      estoque: Number(estoque),
      categoria: categoryId,
      condicao: condicao || 'new',
      tipo_listagem: mlPayload.listing_type_id,
      fotos: (fotos || []).filter(u => u?.trim()),
      status: mlResposta.status,
    });
  } catch (dbError) {
    if (dbError.code === 11000) {
      throw new ServiceError('Já existe um anúncio com esse ID do Mercado Livre no banco de dados.', 409);
    }
    throw dbError;
  }
}

async function editar(id, { titulo, preco, estoque, descricao, condicao, fotos }) {
  const anuncio = await Anuncio.findById(id);
  if (!anuncio) throw new ServiceError('Anúncio não encontrado.', 404);

  const mlPayload = {};
  if (titulo   !== undefined) mlPayload.title              = titulo;
  if (preco    !== undefined) mlPayload.price              = Number(preco);
  if (estoque  !== undefined) mlPayload.available_quantity = Number(estoque);
  if (condicao !== undefined) mlPayload.condition          = condicao;
  if (fotos    !== undefined) mlPayload.pictures           = fotos
    .filter(u => u?.trim())
    .map(u => ({ source: u }));

  if (anuncio.ml_id && Object.keys(mlPayload).length > 0) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, mlPayload);
    } catch (mlError) {
      throw new ServiceError(
        'Erro ao editar anúncio no Mercado Livre.',
        400,
        mlError.response?.data || mlError.message
      );
    }
  }

  if (descricao !== undefined && anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}/description`, { plain_text: descricao });
    } catch (descError) {
      console.warn('Aviso: falha ao atualizar descrição:', descError.response?.data || descError.message);
    }
  }

  const campos = {};
  if (titulo    !== undefined) campos.titulo    = titulo;
  if (preco     !== undefined) campos.preco     = Number(preco);
  if (estoque   !== undefined) campos.estoque   = Number(estoque);
  if (descricao !== undefined) campos.descricao = descricao;
  if (condicao  !== undefined) campos.condicao  = condicao;
  if (fotos     !== undefined) campos.fotos     = fotos;

  const atualizado = await Anuncio.findOneAndUpdate(
    { _id: id, versao: anuncio.versao },
    { ...campos, $inc: { versao: 1 } },
    { new: true }
  );

  if (!atualizado) {
    throw new ServiceError(
      'Conflito de atualização. O anúncio foi modificado por outra operação simultânea. Tente novamente.',
      409
    );
  }

  return atualizado;
}

async function atualizarPreco(id, preco) {
  const anuncio = await Anuncio.findById(id);
  if (!anuncio) throw new ServiceError('Anúncio não encontrado.', 404);

  if (anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, {
        price: Number(preco),
        available_quantity: anuncio.estoque,
      });
    } catch (mlError) {
      throw new ServiceError(
        'Erro ao atualizar preço no Mercado Livre.',
        400,
        mlError.response?.data || mlError.message
      );
    }
  }

  const atualizado = await Anuncio.findOneAndUpdate(
    { _id: id, versao: anuncio.versao },
    { preco: Number(preco), $inc: { versao: 1 } },
    { new: true }
  );

  if (!atualizado) {
    throw new ServiceError(
      'Conflito de atualização. O anúncio foi modificado por outra operação simultânea. Tente novamente.',
      409
    );
  }

  return atualizado;
}

async function atualizarEstoque(id, estoque) {
  const anuncio = await Anuncio.findById(id);
  if (!anuncio) throw new ServiceError('Anúncio não encontrado.', 404);

  if (anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, { available_quantity: Number(estoque) });
    } catch (mlError) {
      throw new ServiceError(
        'Erro ao atualizar estoque no Mercado Livre.',
        400,
        mlError.response?.data || mlError.message
      );
    }
  }

  const atualizado = await Anuncio.findOneAndUpdate(
    { _id: id, versao: anuncio.versao },
    { estoque: Number(estoque), $inc: { versao: 1 } },
    { new: true }
  );

  if (!atualizado) {
    throw new ServiceError(
      'Conflito de atualização. O anúncio foi modificado por outra operação simultânea. Tente novamente.',
      409
    );
  }

  return atualizado;
}

async function sincronizar() {
  const token = await Token.findOne();
  if (!token) throw new ServiceError('Usuário não autenticado.', 401);

  const resultado = await mlRequest('get', `/users/${token.ml_user_id}/items/search?limit=100`);
  const ids = resultado.results || [];

  if (ids.length === 0) return { mensagem: 'Nenhum anúncio encontrado no Mercado Livre.', sincronizados: 0 };

  let sincronizados = 0;
  for (let i = 0; i < ids.length; i += 20) {
    const lote = ids.slice(i, i + 20);
    let detalhes;
    try {
      detalhes = await mlRequest('get', `/items?ids=${lote.join(',')}`);
    } catch (mlError) {
      console.warn('Erro ao buscar lote de itens:', mlError.response?.data || mlError.message);
      continue;
    }

    for (const item of detalhes) {
      if (item.code !== 200) continue;
      const { id, title, price, available_quantity, status, category_id, condition, listing_type_id } = item.body;
      await Anuncio.findOneAndUpdate(
        { ml_id: id },
        { ml_id: id, titulo: title, preco: price, estoque: available_quantity,
          status, categoria: category_id, condicao: condition, tipo_listagem: listing_type_id },
        { upsert: true, new: true }
      );
      sincronizados++;
    }
  }

  return { mensagem: 'Sincronização concluída.', sincronizados };
}

module.exports = { listar, buscarPorId, criar, editar, atualizarPreco, atualizarEstoque, sincronizar };

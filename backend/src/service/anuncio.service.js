const AnuncioRepository      = require('../repository/AnuncioRepository');
const TokenRepository        = require('../repository/TokenRepository');
const { mlRequest, mlPublicRequest } = require('./mlApi.service');
const NotFoundException      = require('../domain/exception/NotFoundException');
const ConflictException      = require('../domain/exception/ConflictException');
const MercadoLivreException  = require('../domain/exception/MercadoLivreException');
const ValidationException    = require('../domain/exception/ValidationException');

// ── Helpers ML públicos ────────────────────────────────────────────────────

async function detectarCategoria(titulo, categoriaFallback) {
  try {
    const data = await mlPublicRequest(
      `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=1`
    );
    if (data?.[0]?.category_id) return data[0].category_id;
  } catch {
    // fallback silencioso
  }
  return categoriaFallback;
}

async function buscarNomeCategoria(categoryId) {
  try {
    const cat = await mlPublicRequest(`/categories/${categoryId}`);
    return cat.name ?? null;
  } catch {
    return null;
  }
}

async function montarAtributos(categoryId, titulo) {
  try {
    const attrs = await mlPublicRequest(`/categories/${categoryId}/attributes`);
    return attrs
      .filter(a => a.tags?.required)
      .map(attr => {
        if (attr.value_type === 'list' && attr.values?.length > 0)
          return { id: attr.id, value_id: attr.values[0].id, value_name: attr.values[0].name };
        if (attr.value_type === 'boolean') {
          const falso = attr.values?.find(v => v.name === 'Não' || v.name === 'No');
          return falso
            ? { id: attr.id, value_id: falso.id, value_name: falso.name }
            : { id: attr.id, value_name: 'Não' };
        }
        if (attr.value_type === 'number') return { id: attr.id, value_name: '0' };
        return { id: attr.id, value_name: titulo };
      });
  } catch {
    return [];
  }
}

// ── Casos de uso ───────────────────────────────────────────────────────────

async function listar({ status, categoria, busca, pagina = 1, limite = 20 }) {
  const filtro = {};
  if (status)    filtro.status    = status;
  if (categoria) filtro.categoria = categoria;
  if (busca)     filtro.titulo    = { $regex: busca, $options: 'i' };

  const skip = (Number(pagina) - 1) * Number(limite);
  const [anuncios, total] = await Promise.all([
    AnuncioRepository.findAll(filtro, skip, Number(limite)),
    AnuncioRepository.count(filtro),
  ]);

  return { anuncios, total, pagina: Number(pagina), limite: Number(limite) };
}

async function buscarPorId(id) {
  const anuncio = await AnuncioRepository.findById(id);
  if (!anuncio) throw new NotFoundException('Anúncio não encontrado.');
  return anuncio;
}

async function criar({ titulo, descricao, categoria, condicao, preco, estoque, fotos, atributos }) {
  const categoryId = await detectarCategoria(titulo, categoria);
  const [attributes, categoria_nome] = await Promise.all([
    montarAtributos(categoryId, titulo),
    buscarNomeCategoria(categoryId),
  ]);

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
    throw new MercadoLivreException(
      'Erro ao criar anúncio no Mercado Livre.',
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
    return await AnuncioRepository.create({
      ml_id: mlResposta.id,
      titulo,
      descricao,
      preco: Number(preco),
      estoque: Number(estoque),
      categoria: categoryId,
      categoria_nome,
      condicao: condicao || 'new',
      tipo_listagem: mlPayload.listing_type_id,
      fotos: (fotos || []).filter(u => u?.trim()),
      status: mlResposta.status,
    });
  } catch (dbError) {
    if (dbError.code === 11000)
      throw new ConflictException('Já existe um anúncio com esse ID do Mercado Livre no banco de dados.');
    throw dbError;
  }
}

async function editar(id, { titulo, preco, estoque, descricao, condicao, fotos }) {
  const anuncio = await AnuncioRepository.findById(id);
  if (!anuncio) throw new NotFoundException('Anúncio não encontrado.');

  const mlPayload = {};
  if (titulo   !== undefined) mlPayload.title              = titulo;
  if (preco    !== undefined) mlPayload.price              = Number(preco);
  if (estoque  !== undefined) mlPayload.available_quantity = Number(estoque);
  if (condicao !== undefined) mlPayload.condition          = condicao;
  if (fotos    !== undefined) mlPayload.pictures           = fotos.filter(u => u?.trim()).map(u => ({ source: u }));

  if (anuncio.ml_id && Object.keys(mlPayload).length > 0) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, mlPayload);
    } catch (mlError) {
      throw new MercadoLivreException(
        'Erro ao editar anúncio no Mercado Livre.',
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

  const atualizado = await AnuncioRepository.updateWithLock(id, anuncio.versao, campos);
  if (!atualizado) throw new ConflictException(
    'Conflito de atualização. O anúncio foi modificado por outra operação simultânea. Tente novamente.'
  );
  return atualizado;
}

async function atualizarPreco(id, preco) {
  if (isNaN(preco) || Number(preco) <= 0) throw new ValidationException('Preço inválido.');
  const anuncio = await AnuncioRepository.findById(id);
  if (!anuncio) throw new NotFoundException('Anúncio não encontrado.');

  if (anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, {
        price: Number(preco),
        available_quantity: anuncio.estoque,
      });
    } catch (mlError) {
      const itemFechado = mlError.response?.data?.message?.includes('status:closed');
      if (!itemFechado) {
        throw new MercadoLivreException(
          'Erro ao atualizar preço no Mercado Livre.',
          mlError.response?.data || mlError.message
        );
      }
      console.warn(`[ML] Item ${anuncio.ml_id} fechado — preço atualizado apenas localmente.`);
    }
  }

  const atualizado = await AnuncioRepository.updateWithLock(id, anuncio.versao, { preco: Number(preco) });
  if (!atualizado) throw new ConflictException(
    'Conflito de atualização. O anúncio foi modificado por outra operação simultânea. Tente novamente.'
  );
  return atualizado;
}

async function atualizarEstoque(id, estoque) {
  if (isNaN(estoque) || Number(estoque) < 0) throw new ValidationException('Estoque inválido.');
  const anuncio = await AnuncioRepository.findById(id);
  if (!anuncio) throw new NotFoundException('Anúncio não encontrado.');

  if (anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, { available_quantity: Number(estoque) });
    } catch (mlError) {
      const itemFechado = mlError.response?.data?.message?.includes('status:closed');
      if (!itemFechado) {
        throw new MercadoLivreException(
          'Erro ao atualizar estoque no Mercado Livre.',
          mlError.response?.data || mlError.message
        );
      }
      console.warn(`[ML] Item ${anuncio.ml_id} fechado — estoque atualizado apenas localmente.`);
    }
  }

  const atualizado = await AnuncioRepository.updateWithLock(id, anuncio.versao, { estoque: Number(estoque) });
  if (!atualizado) throw new ConflictException(
    'Conflito de atualização. O anúncio foi modificado por outra operação simultânea. Tente novamente.'
  );
  return atualizado;
}

async function sincronizar() {
  const token = await TokenRepository.findFirst();
  if (!token) throw new NotFoundException('Usuário não autenticado.');

  const resultado = await mlRequest('get', `/users/${token.ml_user_id}/items/search?limit=100`);
  const ids = resultado.results || [];

  if (ids.length === 0)
    return { mensagem: 'Nenhum anúncio encontrado no Mercado Livre.', sincronizados: 0 };

  let sincronizados = 0;
  for (let i = 0; i < ids.length; i += 20) {
    let detalhes;
    try {
      detalhes = await mlRequest('get', `/items?ids=${ids.slice(i, i + 20).join(',')}`);
    } catch (mlError) {
      console.warn('Erro ao buscar lote de itens:', mlError.response?.data || mlError.message);
      continue;
    }

    const itensValidos = detalhes.filter(item => item.code === 200);
    const categoryIds = [...new Set(itensValidos.map(item => item.body.category_id))];
    const nomesPorCategoria = {};
    await Promise.all(categoryIds.map(async (catId) => {
      nomesPorCategoria[catId] = await buscarNomeCategoria(catId);
    }));

    for (const item of itensValidos) {
      const { id, title, price, available_quantity, status, category_id, condition, listing_type_id } = item.body;
      await AnuncioRepository.upsertByMlId(id, {
        ml_id: id, titulo: title, preco: price, estoque: available_quantity,
        status, categoria: category_id, categoria_nome: nomesPorCategoria[category_id],
        condicao: condition, tipo_listagem: listing_type_id,
      });
      sincronizados++;
    }
  }

  return { mensagem: 'Sincronização concluída.', sincronizados };
}

async function excluir(id) {
  const anuncio = await AnuncioRepository.findById(id);
  if (!anuncio) throw new NotFoundException('Anúncio não encontrado.');

  if (anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, { status: 'closed' });
    } catch (mlError) {
      console.warn('Aviso: falha ao fechar no ML antes de excluir:', mlError.response?.data || mlError.message);
    }
  }

  await AnuncioRepository.deleteById(id);
}

async function alterarStatus(id, status) {
  const statusValidos = ['active', 'paused'];
  if (!statusValidos.includes(status))
    throw new ValidationException('Status inválido. Use "active" ou "paused".');

  const anuncio = await AnuncioRepository.findById(id);
  if (!anuncio) throw new NotFoundException('Anúncio não encontrado.');

  if (anuncio.status === 'closed')
    throw new ValidationException('Anúncios fechados não podem ser reativados por esta interface.');

  if (anuncio.ml_id) {
    try {
      await mlRequest('put', `/items/${anuncio.ml_id}`, { status });
    } catch (mlError) {
      throw new MercadoLivreException(
        'Erro ao alterar status no Mercado Livre.',
        mlError.response?.data || mlError.message
      );
    }
  }

  const atualizado = await AnuncioRepository.updateWithLock(id, anuncio.versao, { status });
  if (!atualizado) throw new ConflictException(
    'Conflito de atualização. Tente novamente.'
  );

  return atualizado;
}

module.exports = { listar, buscarPorId, criar, editar, atualizarPreco, atualizarEstoque, sincronizar, alterarStatus, excluir };

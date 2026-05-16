const Anuncio = require('../models/Anuncio');
const Token = require('../models/Token');
const { mlRequest, getValidToken } = require('../services/mlApi.service');

async function listar(req, res) {
  try {
    const { status, categoria, busca, pagina = 1, limite = 20 } = req.query;
    const filtro = {};

    if (status) filtro.status = status;
    if (categoria) filtro.categoria = categoria;
    if (busca) filtro.titulo = { $regex: busca, $options: 'i' };

    const skip = (Number(pagina) - 1) * Number(limite);
    const [anuncios, total] = await Promise.all([
      Anuncio.find(filtro).skip(skip).limit(Number(limite)).sort({ createdAt: -1 }),
      Anuncio.countDocuments(filtro),
    ]);

    res.json({ anuncios, total, pagina: Number(pagina), limite: Number(limite) });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar anúncios.', detalhe: error.message });
  }
}

const axios = require('axios');

async function detectarCategoria(titulo, categoriaFallback) {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(titulo)}&limit=1`;
    const { data } = await axios.get(url);
    if (data && data[0]?.category_id) return data[0].category_id;
  } catch {
    // se falhar, usa a categoria enviada pelo frontend
  }
  return categoriaFallback;
}

async function montarAtributos(categoryId, titulo) {
  try {
    const { data: attrs } = await axios.get(`https://api.mercadolibre.com/categories/${categoryId}/attributes`);
    const obrigatorios = attrs.filter(a => a.tags?.required);

    return obrigatorios.map(attr => {
      // Para atributos do tipo lista, usa o primeiro valor disponível
      if (attr.value_type === 'list' && attr.values?.length > 0) {
        return { id: attr.id, value_id: attr.values[0].id, value_name: attr.values[0].name };
      }
      // Para boolean, usa false
      if (attr.value_type === 'boolean') {
        const falso = attr.values?.find(v => v.name === 'Não' || v.name === 'No');
        return falso
          ? { id: attr.id, value_id: falso.id, value_name: falso.name }
          : { id: attr.id, value_name: 'Não' };
      }
      // Para number, usa 0
      if (attr.value_type === 'number') {
        return { id: attr.id, value_name: '0' };
      }
      // Para string (BRAND, MODEL, etc.), extrai do título
      return { id: attr.id, value_name: titulo };
    });
  } catch {
    return [];
  }
}

async function criar(req, res) {
  try {
    const { titulo, descricao, categoria, condicao, preco, estoque, fotos } = req.body;

    // PASSO 1 — Detectar categoria folha pelo título (domain_discovery)
    const categoryId = await detectarCategoria(titulo, categoria);

    // PASSO 2 — Buscar e preencher atributos obrigatórios da categoria
    const attributes = await montarAtributos(categoryId, titulo);

    // PASSO 3 — Montar payload principal (sem descrição)
    const payload = {
      title: titulo,
      category_id: categoryId,
      price: Number(preco),
      currency_id: 'BRL',
      available_quantity: 1, // tipo free permite máx 1 unidade
      buying_mode: 'buy_it_now',
      listing_type_id: 'free',
      condition: condicao || 'new',
      pictures: (fotos || [])
        .filter((url) => url && url.trim() !== '')
        .map((url) => ({ source: url })),
      ...(attributes.length > 0 && { attributes }),
    };

    // PASSO 3 — Criar o item no ML
    let mlResposta;
    try {
      mlResposta = await mlRequest('post', '/items', payload);
    } catch (mlError) {
      const detalhe = mlError.response?.data || mlError.message;
      return res.status(400).json({ erro: 'Erro ao criar anúncio no Mercado Livre.', detalhe });
    }

    // PASSO 4 — Enviar descrição separado (se houver)
    if (descricao && descricao.trim() !== '') {
      try {
        await mlRequest('post', `/items/${mlResposta.id}/description`, { plain_text: descricao });
      } catch (descError) {
        console.warn('Aviso: anúncio criado, mas falha ao salvar descrição:', descError.response?.data || descError.message);
      }
    }

    // PASSO 5 — Salvar no MongoDB
    const anuncio = await Anuncio.create({
      ml_id: mlResposta.id,
      titulo,
      descricao,
      preco: Number(preco),
      estoque: Number(estoque),
      categoria: categoryId,
      condicao: condicao || 'new',
      tipo_listagem: 'gold_special',
      fotos: (fotos || []).filter((url) => url && url.trim() !== ''),
      status: mlResposta.status,
    });

    res.status(201).json(anuncio);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    res.status(500).json({ erro: 'Erro ao criar anúncio.', detalhe });
  }
}

async function editar(req, res) {
  try {
    const { id } = req.params;
    const { titulo, preco, estoque, descricao, condicao, fotos } = req.body;

    const anuncio = await Anuncio.findById(id);
    if (!anuncio) return res.status(404).json({ erro: 'Anúncio não encontrado.' });

    // Payload para o ML
    const payload = {};
    if (titulo !== undefined)   payload.title              = titulo;
    if (preco !== undefined)    payload.price              = Number(preco);
    if (estoque !== undefined)  payload.available_quantity = Number(estoque);
    if (condicao !== undefined) payload.condition          = condicao;
    if (fotos !== undefined)    payload.pictures           = fotos
      .filter((url) => url && url.trim() !== '')
      .map((url) => ({ source: url }));

    if (anuncio.ml_id && Object.keys(payload).length > 0) {
      try {
        await mlRequest('put', `/items/${anuncio.ml_id}`, payload);
      } catch (mlError) {
        const detalhe = mlError.response?.data || mlError.message;
        return res.status(400).json({ erro: 'Erro ao editar anúncio no Mercado Livre.', detalhe });
      }
    }

    // Descrição: chamada separada
    if (descricao !== undefined && anuncio.ml_id) {
      try {
        await mlRequest('put', `/items/${anuncio.ml_id}/description`, { plain_text: descricao });
      } catch (descError) {
        console.warn('Aviso: falha ao atualizar descrição:', descError.response?.data || descError.message);
      }
    }

    const atualizado = await Anuncio.findByIdAndUpdate(
      id,
      { titulo, preco: Number(preco), estoque: Number(estoque), descricao, condicao, fotos },
      { new: true }
    );

    res.json(atualizado);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    res.status(500).json({ erro: 'Erro ao editar anúncio.', detalhe });
  }
}

async function atualizarPreco(req, res) {
  try {
    const { id } = req.params;
    const { preco } = req.body;

    if (preco === undefined || isNaN(preco)) {
      return res.status(400).json({ erro: 'Preço inválido.' });
    }

    const anuncio = await Anuncio.findById(id);
    if (!anuncio) return res.status(404).json({ erro: 'Anúncio não encontrado.' });

    if (anuncio.ml_id) {
      try {
        // price + available_quantity obrigatórios juntos (exigência ML desde mar/2026)
        await mlRequest('put', `/items/${anuncio.ml_id}`, {
          price: Number(preco),
          available_quantity: anuncio.estoque,
        });
      } catch (mlError) {
        const detalhe = mlError.response?.data || mlError.message;
        return res.status(400).json({ erro: 'Erro ao atualizar preço no Mercado Livre.', detalhe });
      }
    }

    anuncio.preco = Number(preco);
    await anuncio.save();

    res.json(anuncio);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    res.status(500).json({ erro: 'Erro ao atualizar preço.', detalhe });
  }
}

async function atualizarEstoque(req, res) {
  try {
    const { id } = req.params;
    const { estoque } = req.body;

    if (estoque === undefined || isNaN(estoque)) {
      return res.status(400).json({ erro: 'Estoque inválido.' });
    }

    const anuncio = await Anuncio.findById(id);
    if (!anuncio) return res.status(404).json({ erro: 'Anúncio não encontrado.' });

    if (anuncio.ml_id) {
      try {
        await mlRequest('put', `/items/${anuncio.ml_id}`, { available_quantity: Number(estoque) });
      } catch (mlError) {
        const detalhe = mlError.response?.data || mlError.message;
        return res.status(400).json({ erro: 'Erro ao atualizar estoque no Mercado Livre.', detalhe });
      }
    }

    anuncio.estoque = Number(estoque);
    await anuncio.save();

    res.json(anuncio);
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    res.status(500).json({ erro: 'Erro ao atualizar estoque.', detalhe });
  }
}

async function sincronizar(req, res) {
  try {
    // Usa ml_user_id direto do Token salvo no MongoDB
    const token = await Token.findOne();
    if (!token) return res.status(401).json({ erro: 'Usuário não autenticado.' });

    const userId = token.ml_user_id;

    // Busca todos os IDs (sem filtro de status)
    const resultado = await mlRequest('get', `/users/${userId}/items/search?limit=100`);
    const ids = resultado.results || [];

    if (ids.length === 0) {
      return res.json({ mensagem: 'Nenhum anúncio encontrado no Mercado Livre.', sincronizados: 0 });
    }

    // Busca detalhes em lotes de 20
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
          {
            ml_id: id,
            titulo: title,
            preco: price,
            estoque: available_quantity,
            status,
            categoria: category_id,
            condicao: condition,
            tipo_listagem: listing_type_id,
          },
          { upsert: true, new: true }
        );
        sincronizados++;
      }
    }

    res.json({ mensagem: 'Sincronização concluída.', sincronizados });
  } catch (error) {
    const detalhe = error.response?.data || error.message;
    res.status(500).json({ erro: 'Erro ao sincronizar anúncios.', detalhe });
  }
}

async function buscarPorId(req, res) {
  try {
    const anuncio = await Anuncio.findById(req.params.id);
    if (!anuncio) return res.status(404).json({ erro: 'Anúncio não encontrado.' });
    res.json(anuncio);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar anúncio.', detalhe: error.message });
  }
}

module.exports = { listar, buscarPorId, criar, editar, atualizarPreco, atualizarEstoque, sincronizar };

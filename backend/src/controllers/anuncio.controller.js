const Anuncio = require('../models/Anuncio');
const { mlRequest } = require('../services/mlApi.service');

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

async function criar(req, res) {
  try {
    const { titulo, preco, estoque, categoria, descricao, condicao, tipo_listagem, fotos } = req.body;

    const payload = {
      title: titulo,
      price: preco,
      available_quantity: estoque,
      category_id: categoria,
      description: { plain_text: descricao },
      condition: condicao || 'new',
      listing_type_id: tipo_listagem || 'gold_special',
      pictures: (fotos || []).map((url) => ({ source: url })),
    };

    const mlResposta = await mlRequest('post', '/items', payload);

    const anuncio = await Anuncio.create({
      ml_id: mlResposta.id,
      titulo,
      preco,
      estoque,
      categoria,
      descricao,
      condicao: condicao || 'new',
      tipo_listagem: tipo_listagem || 'gold_special',
      fotos: fotos || [],
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

    const payload = {};
    if (titulo) payload.title = titulo;
    if (preco) payload.price = preco;
    if (estoque !== undefined) payload.available_quantity = estoque;
    if (condicao) payload.condition = condicao;
    if (fotos) payload.pictures = fotos.map((url) => ({ source: url }));

    if (anuncio.ml_id) {
      await mlRequest('put', `/items/${anuncio.ml_id}`, payload);
    }

    if (descricao && anuncio.ml_id) {
      await mlRequest('put', `/items/${anuncio.ml_id}/description`, { plain_text: descricao });
    }

    const atualizado = await Anuncio.findByIdAndUpdate(
      id,
      { titulo, preco, estoque, descricao, condicao, fotos },
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

    if (!preco || isNaN(preco)) {
      return res.status(400).json({ erro: 'Preço inválido.' });
    }

    const anuncio = await Anuncio.findById(id);
    if (!anuncio) return res.status(404).json({ erro: 'Anúncio não encontrado.' });

    if (anuncio.ml_id) {
      await mlRequest('put', `/items/${anuncio.ml_id}`, { price: Number(preco) });
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
      await mlRequest('put', `/items/${anuncio.ml_id}`, { available_quantity: Number(estoque) });
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
    const token = await require('../services/mlApi.service').getValidToken();
    const mlUser = await require('../services/mlApi.service').mlRequest('get', '/users/me');
    const userId = mlUser.id;

    // Busca IDs de todos os anuncios do usuario no ML
    const resultado = await mlRequest('get', `/users/${userId}/items/search?status=active&limit=100`);
    const ids = resultado.results || [];

    if (ids.length === 0) return res.json({ mensagem: 'Nenhum anúncio encontrado no Mercado Livre.', sincronizados: 0 });

    // Busca detalhes em lote (max 20 por requisicao)
    const lotes = [];
    for (let i = 0; i < ids.length; i += 20) {
      lotes.push(ids.slice(i, i + 20));
    }

    let sincronizados = 0;
    for (const lote of lotes) {
      const detalhes = await mlRequest('get', `/items?ids=${lote.join(',')}`);
      for (const item of detalhes) {
        if (item.code !== 200) continue;
        const { id, title, price, available_quantity, status, category_id, condition, listing_type_id } = item.body;
        await Anuncio.findOneAndUpdate(
          { ml_id: id },
          { ml_id: id, titulo: title, preco: price, estoque: available_quantity, status, categoria: category_id, condicao: condition, tipo_listagem: listing_type_id },
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

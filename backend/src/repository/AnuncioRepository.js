const Anuncio = require('../domain/entity/Anuncio');

async function findAll(filtro, skip, limite) {
  return Anuncio.find(filtro).skip(skip).limit(limite).sort({ createdAt: -1 });
}

async function count(filtro) {
  return Anuncio.countDocuments(filtro);
}

async function findById(id) {
  return Anuncio.findById(id);
}

async function create(data) {
  return Anuncio.create(data);
}

// Atualização com optimistic locking — só persiste se a versão bater
async function updateWithLock(id, versao, campos) {
  return Anuncio.findOneAndUpdate(
    { _id: id, versao },
    { ...campos, $inc: { versao: 1 } },
    { new: true }
  );
}

// Upsert por ml_id — usado na sincronização
async function upsertByMlId(mlId, data) {
  return Anuncio.findOneAndUpdate(
    { ml_id: mlId },
    data,
    { upsert: true, new: true }
  );
}

async function adicionarCampoVersaoSeAusente() {
  return Anuncio.updateMany(
    { versao: { $exists: false } },
    { $set: { versao: 0 } }
  );
}

module.exports = { findAll, count, findById, create, updateWithLock, upsertByMlId, adicionarCampoVersaoSeAusente };

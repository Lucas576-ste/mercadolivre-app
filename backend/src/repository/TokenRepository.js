const Token = require('../domain/entity/Token');

async function findFirst() {
  return Token.findOne();
}

async function upsert(userId, data) {
  return Token.findOneAndUpdate(
    { ml_user_id: userId },
    data,
    { upsert: true, new: true }
  );
}

async function save(token) {
  return token.save();
}

async function deleteAll() {
  return Token.deleteMany({});
}

module.exports = { findFirst, upsert, save, deleteAll };

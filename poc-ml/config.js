const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Rodolfo:91605931@users2.l3yydyk.mongodb.net/mlgestor?appName=Users2';

const TokenSchema = new mongoose.Schema({
  ml_user_id: String,
  access_token: String,
  refresh_token: String,
  expires_at: Date,
});

async function getToken() {
  await mongoose.connect(MONGODB_URI);
  const Token = mongoose.model('Token', TokenSchema);
  const token = await Token.findOne();
  await mongoose.disconnect();
  return token;
}

module.exports = { getToken };

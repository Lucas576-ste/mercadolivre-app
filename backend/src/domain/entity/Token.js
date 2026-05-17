const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  ml_user_id:    { type: String, required: true, unique: true },
  access_token:  { type: String, required: true },
  refresh_token: { type: String, required: true },
  expires_at:    { type: Date, required: true },
}, { timestamps: true });

tokenSchema.methods.isExpired = function () {
  return new Date() >= this.expires_at;
};

module.exports = mongoose.model('Token', tokenSchema);

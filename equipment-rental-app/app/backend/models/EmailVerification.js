// models/EmailVerification.js
const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  code:      { type: String, required: true },
  verified:  { type: Boolean, default: false },
  expiresAt: { type: Date,   required: true },
}, { timestamps: true });

// TTL 인덱스 — expiresAt 지나면 MongoDB가 자동 삭제
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);

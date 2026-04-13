const mongoose = require("mongoose");

const pushTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    platform: {
      type: String,
      enum: ["ANDROID", "IOS", "WEB"],
      default: "ANDROID"
    },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    collection: "pushTokens"
  }
);

module.exports = mongoose.model("PushToken", pushTokenSchema);

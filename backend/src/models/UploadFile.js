const mongoose = require("mongoose");

const uploadFileSchema = new mongoose.Schema(
  {
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    purpose: { type: String, default: "GENERAL" }
  },
  {
    timestamps: true,
    collection: "uploadFiles"
  }
);

module.exports = mongoose.model("UploadFile", uploadFileSchema);

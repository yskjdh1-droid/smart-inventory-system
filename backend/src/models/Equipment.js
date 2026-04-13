const mongoose = require("mongoose");

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    categoryName: { type: String, default: "" },
    model: { type: String, default: "" },
    serialNumber: { type: String, required: true, unique: true },
    qrCode: { type: String, required: true, unique: true },
    qrUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["AVAILABLE", "BORROWED", "REPAIR", "LOST"],
      default: "AVAILABLE"
    },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: "equipment" }
);

equipmentSchema.index({ categoryId: 1, status: 1 });

module.exports = mongoose.model("Equipment", equipmentSchema);

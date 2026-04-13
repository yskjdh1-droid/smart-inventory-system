const mongoose = require("mongoose");

const rentalRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
    dueDate: { type: Date, required: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"], default: "PENDING" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "" }
  },
  { timestamps: true, collection: "rentalRequests" }
);

rentalRequestSchema.index({ userId: 1, status: 1 });
rentalRequestSchema.index({ equipmentId: 1, status: 1 });

module.exports = mongoose.model("RentalRequest", rentalRequestSchema);

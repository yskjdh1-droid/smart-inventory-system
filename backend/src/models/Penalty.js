const mongoose = require("mongoose");

const penaltySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
    reason: { type: String, required: true },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ["PENDING", "WAIVED", "PAID"], default: "PENDING" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, collection: "penalties" }
);

penaltySchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("Penalty", penaltySchema);

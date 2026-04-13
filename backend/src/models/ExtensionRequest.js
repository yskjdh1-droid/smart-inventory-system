const mongoose = require("mongoose");

const extensionRequestSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedDueDate: { type: Date, required: true },
    reason: { type: String, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, collection: "extensionRequests" }
);

extensionRequestSchema.index({ loanId: 1, status: 1 });

module.exports = mongoose.model("ExtensionRequest", extensionRequestSchema);

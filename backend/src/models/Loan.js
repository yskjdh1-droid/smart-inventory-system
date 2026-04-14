const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true },
    borrowedAt: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    returnedAt: { type: Date, default: null },
    dueReminder3dSentAt: { type: Date, default: null },
    dueReminder24hSentAt: { type: Date, default: null },
    dueReminderMorningSentAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "RETURNED", "OVERDUE", "LOST", "DAMAGED"],
      default: "ACTIVE"
    },
    notes: { type: String, default: "" },
    forceReturned: { type: Boolean, default: false }
  },
  { timestamps: true, collection: "loans" }
);

loanSchema.index({ userId: 1, status: 1 });
loanSchema.index({ equipmentId: 1, status: 1 });
loanSchema.index({ equipmentId: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" } });
loanSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model("Loan", loanSchema);

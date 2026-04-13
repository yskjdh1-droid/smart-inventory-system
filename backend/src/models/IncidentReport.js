const mongoose = require("mongoose");

const incidentReportSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan", required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportType: { type: String, enum: ["LOSS", "DAMAGE"], required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },
    status: { type: String, enum: ["REPORTED", "CONFIRMED", "RESOLVED", "REJECTED"], default: "REPORTED" },
    adminNote: { type: String, default: "" },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, collection: "incidentReports" }
);

incidentReportSchema.index({ loanId: 1, reportType: 1, status: 1 });

module.exports = mongoose.model("IncidentReport", incidentReportSchema);

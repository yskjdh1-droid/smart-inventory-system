const express = require("express");
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const Equipment = require("../models/Equipment");
const ExtensionRequest = require("../models/ExtensionRequest");
const IncidentReport = require("../models/IncidentReport");
const Penalty = require("../models/Penalty");
const { LoanScanService } = require("../services/loan-scan.service");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

async function applyIncidentEquipmentStatus({ loan, equipment, reportType, session }) {
	if (reportType === "LOSS") {
		loan.status = "LOST";
		equipment.status = "LOST";
		await loan.save({ session });
		await equipment.save({ session });
		return;
	}

	equipment.status = "REPAIR";
	await equipment.save({ session });
}

router.post("/scan", requireAuth, async (req, res, next) => {
	try {
		const { qrCode, notes = "" } = req.body;
		if (!qrCode) {
			const e = new Error("qrCode is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const data = await LoanScanService.processScan({ userId: req.user.id, qrCode, notes });
		const status = data.action === "BORROW" ? 201 : 200;
		return ok(res, data, "Scan processed", status);
	} catch (err) {
		return next(err);
	}
});

router.post("/:loanId/return", requireAuth, async (req, res, next) => {
	try {
		const loan = await Loan.findById(req.params.loanId);
		if (!loan) {
			const e = new Error("Loan not found");
			e.status = 404;
			e.code = "LOAN_NOT_FOUND";
			throw e;
		}
		if (loan.userId.toString() !== req.user.id && req.user.role !== "ADMIN") {
			const e = new Error("Forbidden");
			e.status = 403;
			e.code = "FORBIDDEN";
			throw e;
		}
		if (loan.status !== "ACTIVE") {
			const e = new Error("Return not allowed");
			e.status = 400;
			e.code = "RETURN_NOT_ALLOWED";
			throw e;
		}

		loan.status = "RETURNED";
		loan.returnedAt = new Date();
		if (req.body.notes) {
			loan.notes = req.body.notes;
		}
		await loan.save();
		const borrowBlock = await LoanScanService.applyLateReturnBorrowBlock({ userId: loan.userId, loan });
		const equipment = await Equipment.findById(loan.equipmentId);
		const nextEquipmentStatus = equipment && ["REPAIR", "LOST"].includes(equipment.status) ? equipment.status : "AVAILABLE";
		await Equipment.findByIdAndUpdate(loan.equipmentId, { status: nextEquipmentStatus });

		return ok(
			res,
			{
				loanId: loan._id,
				status: loan.status,
				returnedAt: loan.returnedAt,
				borrowBlock: borrowBlock
					? { blockedUntil: borrowBlock.blockedUntil, overdueDays: borrowBlock.overdueDays }
					: null
			},
			"Returned"
		);
	} catch (err) {
		return next(err);
	}
});

router.post("/:loanId/force-return", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const loan = await Loan.findById(req.params.loanId);
		if (!loan) {
			const e = new Error("Loan not found");
			e.status = 404;
			e.code = "LOAN_NOT_FOUND";
			throw e;
		}
		if (loan.status !== "ACTIVE") {
			const e = new Error("Force return not allowed");
			e.status = 400;
			e.code = "FORCE_RETURN_NOT_ALLOWED";
			throw e;
		}

		loan.status = "RETURNED";
		loan.returnedAt = new Date();
		loan.forceReturned = true;
		await loan.save();
		const borrowBlock = await LoanScanService.applyLateReturnBorrowBlock({ userId: loan.userId, loan });
		const equipment = await Equipment.findById(loan.equipmentId);
		const nextEquipmentStatus = equipment && ["REPAIR", "LOST"].includes(equipment.status) ? equipment.status : "AVAILABLE";
		await Equipment.findByIdAndUpdate(loan.equipmentId, { status: nextEquipmentStatus });

		return ok(
			res,
			{
				loanId: loan._id,
				status: loan.status,
				returnedAt: loan.returnedAt,
				borrowBlock: borrowBlock
					? { blockedUntil: borrowBlock.blockedUntil, overdueDays: borrowBlock.overdueDays }
					: null
			},
			"Force return processed"
		);
	} catch (err) {
		return next(err);
	}
});

router.post("/:loanId/extension-requests", requireAuth, async (req, res, next) => {
	try {
		const { requestedDueDate, reason = "" } = req.body;
		if (!requestedDueDate) {
			const e = new Error("requestedDueDate is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}

		const loan = await Loan.findById(req.params.loanId);
		if (!loan) {
			const e = new Error("Loan not found");
			e.status = 404;
			e.code = "LOAN_NOT_FOUND";
			throw e;
		}
		if (loan.userId.toString() !== req.user.id) {
			const e = new Error("Forbidden");
			e.status = 403;
			e.code = "FORBIDDEN";
			throw e;
		}
		if (loan.status !== "ACTIVE") {
			const e = new Error("Extension not allowed");
			e.status = 400;
			e.code = "EXTENSION_NOT_ALLOWED";
			throw e;
		}

		const pending = await ExtensionRequest.findOne({ loanId: loan._id, status: "PENDING" });
		if (pending) {
			const e = new Error("Pending extension exists");
			e.status = 409;
			e.code = "EXTENSION_ALREADY_PENDING";
			throw e;
		}

		const extension = await ExtensionRequest.create({
			loanId: loan._id,
			requestedBy: req.user.id,
			requestedDueDate,
			reason,
			status: "PENDING"
		});

		return ok(res, { requestId: extension._id, loanId: loan._id, status: extension.status }, "Extension request created", 201);
	} catch (err) {
		return next(err);
	}
});

router.get("/:loanId/extension-requests", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const requests = await ExtensionRequest.find({ loanId: req.params.loanId }).sort({ createdAt: -1 });
		return ok(res, { requests });
	} catch (err) {
		return next(err);
	}
});

router.patch("/:loanId/extension-requests/:requestId", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const { status, reviewNote = "" } = req.body;
		const request = await ExtensionRequest.findById(req.params.requestId);
		if (!request) {
			const e = new Error("Extension request not found");
			e.status = 404;
			e.code = "EXTENSION_REQUEST_NOT_FOUND";
			throw e;
		}
		request.status = status;
		request.reviewNote = reviewNote;
		request.reviewedBy = req.user.id;
		await request.save();

		if (status === "APPROVED") {
			const loan = await Loan.findById(request.loanId);
			if (loan) {
				loan.dueDate = request.requestedDueDate;
				loan.dueReminder24hSentAt = null;
				loan.dueReminderMorningSentAt = null;
				await loan.save();
			}
		}
		return ok(res, { requestId: request._id, status: request.status }, "Extension request processed");
	} catch (err) {
		return next(err);
	}
});

router.post("/:loanId/report-loss", requireAuth, async (req, res, next) => {
	try {
		const { description } = req.body;
		if (!description) {
			const e = new Error("description is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const session = await mongoose.startSession();
		try {
			let payload;
			await session.withTransaction(async () => {
				const loan = await Loan.findById(req.params.loanId).session(session);
				if (!loan) {
					const e = new Error("Loan not found");
					e.status = 404;
					e.code = "LOAN_NOT_FOUND";
					throw e;
				}
				if (loan.userId.toString() !== req.user.id && req.user.role !== "ADMIN") {
					const e = new Error("Forbidden");
					e.status = 403;
					e.code = "FORBIDDEN";
					throw e;
				}
				const equipment = await Equipment.findById(loan.equipmentId).session(session);
				if (!equipment) {
					const e = new Error("Equipment not found");
					e.status = 404;
					e.code = "EQUIPMENT_NOT_FOUND";
					throw e;
				}
				const report = new IncidentReport({
					loanId: loan._id,
					reportedBy: req.user.id,
					reportType: "LOSS",
					description,
					severity: "HIGH"
				});
				await report.save({ session });
				await applyIncidentEquipmentStatus({ loan, equipment, reportType: "LOSS", session });
				payload = { reportId: report._id, reportType: report.reportType, status: report.status, equipmentStatus: equipment.status, loanStatus: loan.status };
			});
			return ok(res, payload, "Report submitted", 201);
		} finally {
			session.endSession();
		}
	} catch (err) {
		return next(err);
	}
});

router.post("/:loanId/report-damage", requireAuth, async (req, res, next) => {
	try {
		const { description, severity = "MEDIUM" } = req.body;
		if (!description) {
			const e = new Error("description is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const session = await mongoose.startSession();
		try {
			let payload;
			await session.withTransaction(async () => {
				const loan = await Loan.findById(req.params.loanId).session(session);
				if (!loan) {
					const e = new Error("Loan not found");
					e.status = 404;
					e.code = "LOAN_NOT_FOUND";
					throw e;
				}
				if (loan.userId.toString() !== req.user.id && req.user.role !== "ADMIN") {
					const e = new Error("Forbidden");
					e.status = 403;
					e.code = "FORBIDDEN";
					throw e;
				}
				const equipment = await Equipment.findById(loan.equipmentId).session(session);
				if (!equipment) {
					const e = new Error("Equipment not found");
					e.status = 404;
					e.code = "EQUIPMENT_NOT_FOUND";
					throw e;
				}
				const report = new IncidentReport({
					loanId: loan._id,
					reportedBy: req.user.id,
					reportType: "DAMAGE",
					description,
					severity
				});
				await report.save({ session });
				await applyIncidentEquipmentStatus({ loan, equipment, reportType: "DAMAGE", session });
				payload = { reportId: report._id, reportType: report.reportType, status: report.status, equipmentStatus: equipment.status, loanStatus: loan.status };
			});
			return ok(res, payload, "Report submitted", 201);
		} finally {
			session.endSession();
		}
	} catch (err) {
		return next(err);
	}
});

router.patch("/:loanId/report-loss/:reportId", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const report = await IncidentReport.findById(req.params.reportId);
		if (!report) {
			const e = new Error("Incident report not found");
			e.status = 404;
			e.code = "INCIDENT_REPORT_NOT_FOUND";
			throw e;
		}
		report.status = req.body.status || report.status;
		report.adminNote = req.body.adminNote || report.adminNote;
		report.handledBy = req.user.id;
		await report.save();
		return ok(res, { reportId: report._id, status: report.status }, "Incident updated");
	} catch (err) {
		return next(err);
	}
});

router.patch("/:loanId/report-damage/:reportId", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const report = await IncidentReport.findById(req.params.reportId);
		if (!report) {
			const e = new Error("Incident report not found");
			e.status = 404;
			e.code = "INCIDENT_REPORT_NOT_FOUND";
			throw e;
		}
		report.status = req.body.status || report.status;
		report.adminNote = req.body.adminNote || report.adminNote;
		report.handledBy = req.user.id;
		await report.save();
		return ok(res, { reportId: report._id, status: report.status }, "Incident updated");
	} catch (err) {
		return next(err);
	}
});

router.get("/my-loans", requireAuth, async (req, res, next) => {
	try {
		const { status, page = 1, limit = 10 } = req.query;
		const filter = { userId: req.user.id };
		if (status) {
			filter.status = status;
		}
		const p = Number(page);
		const l = Number(limit);
		const [items, total] = await Promise.all([
			Loan.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
			Loan.countDocuments(filter)
		]);
		return ok(res, { loans: items, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) || 1 } });
	} catch (err) {
		return next(err);
	}
});

router.get("/overdue", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const now = new Date();
		const overdueLoans = await Loan.find({ status: "ACTIVE", dueDate: { $lt: now } }).sort({ dueDate: 1 });
		return ok(res, { overdueLoans, total: overdueLoans.length });
	} catch (err) {
		return next(err);
	}
});

router.get("/penalties", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const penalties = await Penalty.find({}).sort({ createdAt: -1 });
		return ok(res, { penalties });
	} catch (err) {
		return next(err);
	}
});

router.get("/", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const { status, userId, equipmentId, page = 1, limit = 10 } = req.query;
		const filter = {};
		if (status) {
			filter.status = status;
		}
		if (userId) {
			filter.userId = userId;
		}
		if (equipmentId) {
			filter.equipmentId = equipmentId;
		}
		const p = Number(page);
		const l = Number(limit);
		const [items, total] = await Promise.all([
			Loan.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
			Loan.countDocuments(filter)
		]);
		return ok(res, { loans: items, pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) || 1 } });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

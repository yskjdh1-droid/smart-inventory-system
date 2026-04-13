const express = require("express");
const RentalRequest = require("../models/RentalRequest");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.post("/", requireAuth, async (req, res, next) => {
	try {
		const { equipmentId, dueDate, reason = "" } = req.body;
		if (!equipmentId || !dueDate) {
			const e = new Error("equipmentId and dueDate are required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const request = await RentalRequest.create({
			userId: req.user.id,
			equipmentId,
			dueDate,
			reason,
			status: "PENDING"
		});
		return ok(res, { request }, "Rental request created", 201);
	} catch (err) {
		return next(err);
	}
});

router.get("/", requireAuth, async (req, res, next) => {
	try {
		const filter = {};
		if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
			filter.userId = req.user.id;
		}
		if (req.query.status) {
			filter.status = req.query.status;
		}
		const requests = await RentalRequest.find(filter).sort({ createdAt: -1 });
		return ok(res, { requests });
	} catch (err) {
		return next(err);
	}
});

router.patch("/:id/approve", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
	try {
		const request = await RentalRequest.findById(req.params.id);
		if (!request) {
			const e = new Error("Rental request not found");
			e.status = 404;
			e.code = "RENTAL_REQUEST_NOT_FOUND";
			throw e;
		}
		request.status = "APPROVED";
		request.approvedBy = req.user.id;
		await request.save();
		return ok(res, { request }, "Rental request approved");
	} catch (err) {
		return next(err);
	}
});

router.patch("/:id/reject", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
	try {
		const request = await RentalRequest.findById(req.params.id);
		if (!request) {
			const e = new Error("Rental request not found");
			e.status = 404;
			e.code = "RENTAL_REQUEST_NOT_FOUND";
			throw e;
		}
		request.status = "REJECTED";
		request.approvedBy = req.user.id;
		request.rejectionReason = req.body.rejectionReason || "";
		await request.save();
		return ok(res, { request }, "Rental request rejected");
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

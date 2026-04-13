const express = require("express");
const Equipment = require("../models/Equipment");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

const repairRecords = [];

router.post("/", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const { equipmentId, issue, cost = 0, notes = "" } = req.body;
		if (!equipmentId || !issue) {
			const e = new Error("equipmentId and issue are required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const record = {
			id: `${Date.now()}`,
			equipmentId,
			issue,
			cost,
			notes,
			startDate: new Date(),
			endDate: null,
			status: "IN_PROGRESS"
		};
		repairRecords.push(record);
		await Equipment.findByIdAndUpdate(equipmentId, { status: "REPAIR" });
		return ok(res, { record }, "Repair record created", 201);
	} catch (err) {
		return next(err);
	}
});

router.patch("/:id/complete", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const target = repairRecords.find((r) => r.id === req.params.id);
		if (!target) {
			const e = new Error("Repair record not found");
			e.status = 404;
			e.code = "REPAIR_NOT_FOUND";
			throw e;
		}
		target.endDate = new Date();
		target.status = "COMPLETED";
		await Equipment.findByIdAndUpdate(target.equipmentId, { status: "AVAILABLE" });
		return ok(res, { record: target }, "Repair completed");
	} catch (err) {
		return next(err);
	}
});

router.get("/equipment/:equipmentId", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
	const records = repairRecords.filter((r) => r.equipmentId === req.params.equipmentId);
	return ok(res, { records });
});

module.exports = router;

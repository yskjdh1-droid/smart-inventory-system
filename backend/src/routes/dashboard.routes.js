const express = require("express");
const Equipment = require("../models/Equipment");
const Loan = require("../models/Loan");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/equipment-stats", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const [totalEquipment, available, borrowed, inRepair, lost] = await Promise.all([
			Equipment.countDocuments({ deletedAt: null }),
			Equipment.countDocuments({ status: "AVAILABLE", deletedAt: null }),
			Equipment.countDocuments({ status: "BORROWED", deletedAt: null }),
			Equipment.countDocuments({ status: "REPAIR", deletedAt: null }),
			Equipment.countDocuments({ status: "LOST", deletedAt: null })
		]);

		return ok(res, { totalEquipment, available, borrowed, inRepair, lost });
	} catch (err) {
		return next(err);
	}
});

router.get("/rental-stats", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const [totalRentals, activeRentals, completedRentals, overdueRentals] = await Promise.all([
			Loan.countDocuments({}),
			Loan.countDocuments({ status: "ACTIVE" }),
			Loan.countDocuments({ status: "RETURNED" }),
			Loan.countDocuments({ status: "OVERDUE" })
		]);
		return ok(res, { totalRentals, activeRentals, completedRentals, overdueRentals });
	} catch (err) {
		return next(err);
	}
});

router.get("/monthly-trends", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const months = Number(req.query.months || 6);
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

		const trends = await Loan.aggregate([
			{ $match: { createdAt: { $gte: start } } },
			{
				$group: {
					_id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
					rentals: { $sum: 1 },
					returns: { $sum: { $cond: [{ $eq: ["$status", "RETURNED"] }, 1, 0] } },
					overdue: { $sum: { $cond: [{ $eq: ["$status", "OVERDUE"] }, 1, 0] } }
				}
			},
			{ $sort: { _id: 1 } }
		]);

		return ok(
			res,
			{
				trends: trends.map((t) => ({
					month: t._id,
					rentals: t.rentals,
					returns: t.returns,
					overdue: t.overdue
				}))
			},
			"Monthly trends"
		);
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

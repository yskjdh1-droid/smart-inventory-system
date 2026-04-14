const express = require("express");
const NotificationSetting = require("../models/NotificationSetting");
const Penalty = require("../models/Penalty");
const { FcmService } = require("../services/fcm.service");
const { runDueReminderSweep } = require("../services/loan-reminder.service");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/notification-settings", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		let setting = await NotificationSetting.findOne({ scope: "ADMIN", userId: null });
		if (!setting) {
			setting = await NotificationSetting.create({ scope: "ADMIN", userId: null });
		}
		return ok(res, {
			overdueAlertEnabled: setting.overdueAlertEnabled,
			incidentAlertEnabled: setting.incidentAlertEnabled,
			digestTime: setting.digestTime
		});
	} catch (err) {
		return next(err);
	}
});

router.patch("/notification-settings", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const setting = await NotificationSetting.findOneAndUpdate(
			{ scope: "ADMIN", userId: null },
			{
				overdueAlertEnabled: req.body.overdueAlertEnabled,
				incidentAlertEnabled: req.body.incidentAlertEnabled,
				digestTime: req.body.digestTime
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);
		return ok(
			res,
			{
				overdueAlertEnabled: setting.overdueAlertEnabled,
				incidentAlertEnabled: setting.incidentAlertEnabled,
				digestTime: setting.digestTime
			},
			"Admin notification settings updated"
		);
	} catch (err) {
		return next(err);
	}
});

router.patch("/penalties/:penaltyId", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const penalty = await Penalty.findById(req.params.penaltyId);
		if (!penalty) {
			const e = new Error("Penalty not found");
			e.status = 404;
			e.code = "PENALTY_NOT_FOUND";
			throw e;
		}
		penalty.status = req.body.status || penalty.status;
		penalty.reviewedBy = req.user.id;
		await penalty.save();
		return ok(res, { penalty }, "Penalty updated");
	} catch (err) {
		return next(err);
	}
});

router.post("/notifications/broadcast", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const { title = "관리자 공지", body = "알림 테스트", userIds = [] } = req.body;
		if (!Array.isArray(userIds) || userIds.length === 0) {
			const e = new Error("userIds array is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}

		const result = await FcmService.sendToUsers(userIds, {
			notification: { title, body },
			data: { type: "ADMIN_BROADCAST", at: new Date().toISOString() }
		});

		return ok(res, result, "Broadcast processed");
	} catch (err) {
		return next(err);
	}
});

router.post("/notifications/due-reminders/run", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const result = await runDueReminderSweep();
		return ok(res, result, "Due reminder sweep executed");
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const NotificationSetting = require("../models/NotificationSetting");
const PushToken = require("../models/PushToken");
const { FcmService } = require("../services/fcm.service");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const DEFAULT_DUE_REMINDER_SCHEDULE = ["D-3", "D-1", "SAME_DAY_09"];

const router = express.Router();

router.get("/", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const users = await User.find({}).select("email name phone role createdAt").sort({ createdAt: -1 });
		return ok(res, { users });
	} catch (err) {
		return next(err);
	}
});

router.get("/notification-settings", requireAuth, async (req, res, next) => {
	try {
		let setting = await NotificationSetting.findOne({ scope: "USER", userId: req.user.id });
		if (!setting) {
			setting = await NotificationSetting.create({ scope: "USER", userId: req.user.id });
		}
		return ok(res, {
			pushEnabled: setting.pushEnabled,
			emailEnabled: setting.emailEnabled,
			dueReminderEnabled: setting.dueReminderEnabled,
			dueReminderSchedule: setting.dueReminderSchedule?.length ? setting.dueReminderSchedule : DEFAULT_DUE_REMINDER_SCHEDULE
		});
	} catch (err) {
		return next(err);
	}
});

router.patch("/notification-settings", requireAuth, async (req, res, next) => {
	try {
		const setting = await NotificationSetting.findOneAndUpdate(
			{ scope: "USER", userId: req.user.id },
			{
				pushEnabled: req.body.pushEnabled,
				emailEnabled: req.body.emailEnabled,
				dueReminderEnabled: req.body.dueReminderEnabled
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);

		return ok(
			res,
			{
				pushEnabled: setting.pushEnabled,
				emailEnabled: setting.emailEnabled,
				dueReminderEnabled: setting.dueReminderEnabled,
				dueReminderSchedule: setting.dueReminderSchedule?.length ? setting.dueReminderSchedule : DEFAULT_DUE_REMINDER_SCHEDULE
			},
			"Notification settings updated"
		);
	} catch (err) {
		return next(err);
	}
});

router.get("/push-tokens", requireAuth, async (req, res, next) => {
	try {
		const tokens = await PushToken.find({ userId: req.user.id, isActive: true })
			.select("token platform createdAt updatedAt")
			.sort({ updatedAt: -1 });
		return ok(res, { tokens });
	} catch (err) {
		return next(err);
	}
});

router.post("/push-tokens", requireAuth, async (req, res, next) => {
	try {
		const { token, platform = "ANDROID" } = req.body;
		if (!token) {
			const e = new Error("token is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}

		const saved = await PushToken.findOneAndUpdate(
			{ token },
			{ userId: req.user.id, platform, isActive: true, lastUsedAt: new Date() },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		).select("token platform isActive updatedAt");

		return ok(res, { pushToken: saved }, "Push token registered", 201);
	} catch (err) {
		return next(err);
	}
});

router.delete("/push-tokens", requireAuth, async (req, res, next) => {
	try {
		const { token } = req.body;
		if (!token) {
			const e = new Error("token is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}

		await PushToken.findOneAndUpdate({ token, userId: req.user.id }, { isActive: false });
		return ok(res, {}, "Push token deactivated");
	} catch (err) {
		return next(err);
	}
});

router.post("/push-test", requireAuth, async (req, res, next) => {
	try {
		const { title = "테스트 알림", body = "FCM 연동 테스트" } = req.body;
		const result = await FcmService.sendToUser(req.user.id, {
			notification: { title, body },
			data: { type: "TEST", at: new Date().toISOString() }
		});
		return ok(res, result, "Push test processed");
	} catch (err) {
		return next(err);
	}
});

router.patch("/profile", requireAuth, async (req, res, next) => {
	try {
		const user = await User.findByIdAndUpdate(
			req.user.id,
			{
				name: req.body.name,
				phone: req.body.phone
			},
			{ new: true }
		).select("email name phone role");
		return ok(res, { user }, "Profile updated");
	} catch (err) {
		return next(err);
	}
});

router.patch("/password", requireAuth, async (req, res, next) => {
	try {
		const { currentPassword, newPassword } = req.body;
		if (!currentPassword || !newPassword) {
			const e = new Error("currentPassword and newPassword are required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const user = await User.findById(req.user.id);
		const matched = await bcrypt.compare(currentPassword, user.passwordHash);
		if (!matched) {
			const e = new Error("Current password mismatch");
			e.status = 400;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		user.passwordHash = await bcrypt.hash(newPassword, 10);
		await user.save();
		return ok(res, {}, "Password updated");
	} catch (err) {
		return next(err);
	}
});

router.get("/:id", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const user = await User.findById(req.params.id).select("email name phone role createdAt");
		if (!user) {
			const e = new Error("User not found");
			e.status = 404;
			e.code = "USER_NOT_FOUND";
			throw e;
		}
		return ok(res, { user });
	} catch (err) {
		return next(err);
	}
});

router.patch("/:id/role", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const { role } = req.body;
		if (!["STUDENT", "ADMIN"].includes(role)) {
			const e = new Error("Invalid role");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("email name role");
		if (!user) {
			const e = new Error("User not found");
			e.status = 404;
			e.code = "USER_NOT_FOUND";
			throw e;
		}
		return ok(res, { user }, "Role updated");
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

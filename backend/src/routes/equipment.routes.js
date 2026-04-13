const express = require("express");
const Equipment = require("../models/Equipment");
const Category = require("../models/Category");
const { QRCodeService } = require("../services/qr-code.service");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
	try {
		const { category, status, search, page = 1, limit = 10 } = req.query;
		const filter = { deletedAt: null };
		if (category) {
			filter.categoryName = category;
		}
		if (status) {
			filter.status = status;
		}
		if (search) {
			filter.name = { $regex: search, $options: "i" };
		}

		const p = Number(page);
		const l = Number(limit);
		const [items, total] = await Promise.all([
			Equipment.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
			Equipment.countDocuments(filter)
		]);

		return ok(res, {
			equipment: items,
			pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) || 1 }
		});
	} catch (err) {
		return next(err);
	}
});

router.get("/:id", requireAuth, async (req, res, next) => {
	try {
		const equipment = await Equipment.findOne({ _id: req.params.id, deletedAt: null });
		if (!equipment) {
			const e = new Error("Equipment not found");
			e.status = 404;
			e.code = "EQUIPMENT_NOT_FOUND";
			throw e;
		}
		return ok(res, { equipment });
	} catch (err) {
		return next(err);
	}
});

router.post("/", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
	try {
		const { name, categoryId, model = "", serialNumber, description = "", location = "", quantity = 1 } = req.body;
		if (!name || !serialNumber) {
			const e = new Error("name and serialNumber are required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}

		let categoryName = "";
		if (categoryId) {
			const category = await Category.findById(categoryId);
			if (category) {
				categoryName = category.name;
			}
		}

		const equipment = await Equipment.create({
			name,
			categoryId: categoryId || null,
			categoryName,
			model,
			serialNumber,
			description,
			location,
			quantity,
			qrCode: QRCodeService.generatePermanentCode(serialNumber, serialNumber),
			qrUrl: "",
			status: "AVAILABLE",
			deletedAt: null
		});

		equipment.qrUrl = QRCodeService.buildQrImageUrl(equipment.qrCode);
		await equipment.save();

		return ok(res, { equipment }, "Equipment created", 201);
	} catch (err) {
		if (err.code === 11000) {
			err.status = 409;
			err.code = "EQUIPMENT_DUPLICATED";
			err.message = "Duplicated serialNumber or qrCode";
		}
		return next(err);
	}
});

router.patch("/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
	try {
		const payload = { ...req.body };
		if (payload.categoryId) {
			const category = await Category.findById(payload.categoryId);
			payload.categoryName = category ? category.name : "";
		}
		const equipment = await Equipment.findByIdAndUpdate(req.params.id, payload, { new: true });
		if (!equipment) {
			const e = new Error("Equipment not found");
			e.status = 404;
			e.code = "EQUIPMENT_NOT_FOUND";
			throw e;
		}
		return ok(res, { equipment }, "Equipment updated");
	} catch (err) {
		return next(err);
	}
});

router.delete("/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
	try {
		const equipment = await Equipment.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
		if (!equipment) {
			const e = new Error("Equipment not found");
			e.status = 404;
			e.code = "EQUIPMENT_NOT_FOUND";
			throw e;
		}
		return ok(res, {}, "Equipment deleted");
	} catch (err) {
		return next(err);
	}
});

router.post("/:id/generate-qr", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
	try {
		const equipment = await Equipment.findById(req.params.id);
		if (!equipment) {
			const e = new Error("Equipment not found");
			e.status = 404;
			e.code = "EQUIPMENT_NOT_FOUND";
			throw e;
		}

		const qrCode = equipment.qrCode || QRCodeService.generatePermanentCode(equipment._id.toString(), equipment.serialNumber);
		equipment.qrCode = qrCode;
		equipment.qrUrl = QRCodeService.buildQrImageUrl(qrCode);
		await equipment.save();
		const qrImage = await QRCodeService.generateDataUrl(qrCode);
		return ok(res, { equipmentId: equipment._id, qrCode, qrUrl: equipment.qrUrl, qrImage });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

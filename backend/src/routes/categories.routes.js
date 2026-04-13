const express = require("express");
const Category = require("../models/Category");
const Equipment = require("../models/Equipment");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
	try {
		const categories = await Category.find({}).sort({ displayOrder: 1, name: 1 });
		return ok(res, { categories });
	} catch (err) {
		return next(err);
	}
});

router.post("/", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const { name, description = "", displayOrder = 0 } = req.body;
		if (!name) {
			const e = new Error("name is required");
			e.status = 422;
			e.code = "VALIDATION_ERROR";
			throw e;
		}
		const category = await Category.create({ name, description, displayOrder, isActive: true });
		return ok(res, { category }, "Category created", 201);
	} catch (err) {
		if (err.code === 11000) {
			err.status = 409;
			err.code = "CATEGORY_DUPLICATED";
			err.message = "Category already exists";
		}
		return next(err);
	}
});

router.patch("/:categoryId", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const category = await Category.findByIdAndUpdate(req.params.categoryId, req.body, { new: true });
		if (!category) {
			const e = new Error("Category not found");
			e.status = 404;
			e.code = "CATEGORY_NOT_FOUND";
			throw e;
		}
		return ok(res, { category }, "Category updated");
	} catch (err) {
		return next(err);
	}
});

router.delete("/:categoryId", requireAuth, requireRole(["ADMIN"]), async (req, res, next) => {
	try {
		const inUse = await Equipment.exists({ categoryId: req.params.categoryId, deletedAt: null });
		if (inUse) {
			const e = new Error("Category in use");
			e.status = 409;
			e.code = "CATEGORY_IN_USE";
			throw e;
		}
		const category = await Category.findByIdAndDelete(req.params.categoryId);
		if (!category) {
			const e = new Error("Category not found");
			e.status = 404;
			e.code = "CATEGORY_NOT_FOUND";
			throw e;
		}
		return ok(res, {}, "Category deleted");
	} catch (err) {
		return next(err);
	}
});

module.exports = router;

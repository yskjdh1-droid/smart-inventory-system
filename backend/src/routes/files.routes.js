const express = require("express");
const UploadFile = require("../models/UploadFile");
const { upload, buildPublicUrl } = require("../services/file-storage.service");
const { ok } = require("../utils/response");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();

router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      const e = new Error("file is required");
      e.status = 422;
      e.code = "VALIDATION_ERROR";
      throw e;
    }

    const purpose = req.body.purpose || "GENERAL";
    const url = buildPublicUrl(req.file.filename);

    const saved = await UploadFile.create({
      uploaderId: req.user.id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
      purpose
    });

    return ok(
      res,
      {
        fileId: saved._id,
        originalName: saved.originalName,
        mimeType: saved.mimeType,
        size: saved.size,
        url: saved.url,
        purpose: saved.purpose
      },
      "File uploaded",
      201
    );
  } catch (err) {
    return next(err);
  }
});

router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const files = await UploadFile.find({ uploaderId: req.user.id })
      .select("originalName mimeType size url purpose createdAt")
      .sort({ createdAt: -1 });
    return ok(res, { files });
  } catch (err) {
    return next(err);
  }
});

router.get("/all", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req, res, next) => {
  try {
    const files = await UploadFile.find({})
      .populate("uploaderId", "name email role")
      .select("originalName mimeType size url purpose uploaderId createdAt")
      .sort({ createdAt: -1 });
    return ok(res, { files });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

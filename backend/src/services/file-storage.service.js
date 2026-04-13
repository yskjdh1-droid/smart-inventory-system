const fs = require("fs");
const path = require("path");
const multer = require("multer");
const env = require("../config/env");

function sanitizeName(name) {
  return String(name || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
}

function buildStoredName(originalName) {
  const ext = path.extname(originalName || "");
  const base = sanitizeName(path.basename(originalName || "file", ext));
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
}

function ensureUploadDir() {
  const absolute = path.resolve(process.cwd(), env.uploadDir);
  if (!fs.existsSync(absolute)) {
    fs.mkdirSync(absolute, { recursive: true });
  }
  return absolute;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureUploadDir());
  },
  filename: (req, file, cb) => {
    cb(null, buildStoredName(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxFileSizeMb * 1024 * 1024
  }
});

function buildPublicUrl(storedName) {
  return `${env.appBaseUrl.replace(/\/$/, "")}/uploads/${storedName}`;
}

module.exports = {
  upload,
  buildPublicUrl
};

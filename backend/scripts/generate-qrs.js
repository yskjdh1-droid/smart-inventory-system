/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const QRCode = require("qrcode");

const env = require("../src/config/env");
const { connectMongo } = require("../src/config/db");
const Equipment = require("../src/models/Equipment");
const { QRCodeService } = require("../src/services/qr-code.service");

function sanitizeFileName(input) {
  return String(input).replace(/[\\/:*?"<>|\s]+/g, "_");
}

async function ensureOutputDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readItems(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("items file must be a JSON array");
  }
  return parsed;
}

async function upsertEquipment(item) {
  if (!item.name || !item.serialNumber) {
    throw new Error("Each item needs name and serialNumber");
  }

  const existing = await Equipment.findOne({ serialNumber: item.serialNumber });
  if (existing) {
    if (!existing.qrCode) {
      existing.qrCode = QRCodeService.generatePermanentCode(existing._id.toString(), existing.serialNumber);
    }
    existing.qrUrl = QRCodeService.buildQrImageUrl(existing.qrCode);
    existing.name = item.name;
    existing.categoryName = item.categoryName || existing.categoryName || "";
    existing.model = item.model || existing.model || "";
    existing.description = item.description || existing.description || "";
    existing.location = item.location || existing.location || "";
    existing.quantity = Number(item.quantity || existing.quantity || 1);
    existing.deletedAt = null;
    await existing.save();
    return { equipment: existing, created: false };
  }

  const eq = await Equipment.create({
    name: item.name,
    categoryName: item.categoryName || "",
    model: item.model || "",
    serialNumber: item.serialNumber,
    description: item.description || "",
    location: item.location || "",
    quantity: Number(item.quantity || 1),
    status: "AVAILABLE",
    qrCode: QRCodeService.generatePermanentCode(item.serialNumber, item.serialNumber),
    qrUrl: "",
    deletedAt: null
  });

  eq.qrUrl = QRCodeService.buildQrImageUrl(eq.qrCode);
  await eq.save();

  return { equipment: eq, created: true };
}

async function exportQrPng(equipment, outputDir) {
  const fileName = `${sanitizeFileName(equipment.serialNumber)}__${sanitizeFileName(equipment.name)}.png`;
  const filePath = path.join(outputDir, fileName);
  await QRCode.toFile(filePath, equipment.qrCode, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 320
  });
  return filePath;
}

async function main() {
  const itemsArg = process.argv[2] || path.join(__dirname, "items.example.json");
  const outputArg = process.argv[3] || path.join(__dirname, "..", "qr-output");

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is required (.env)");
  }

  const itemsPath = path.resolve(itemsArg);
  const outputDir = path.resolve(outputArg);

  await ensureOutputDir(outputDir);
  const items = readItems(itemsPath);

  await connectMongo();

  let createdCount = 0;
  let updatedCount = 0;
  let exportedCount = 0;

  for (const item of items) {
    const { equipment, created } = await upsertEquipment(item);
    if (created) {
      createdCount += 1;
    } else {
      updatedCount += 1;
    }
    await exportQrPng(equipment, outputDir);
    exportedCount += 1;
    console.log(`[QR] ${equipment.serialNumber} -> ${equipment.qrCode}`);
  }

  console.log("\nDone");
  console.log(`- total items: ${items.length}`);
  console.log(`- created: ${createdCount}`);
  console.log(`- updated: ${updatedCount}`);
  console.log(`- png exported: ${exportedCount}`);
  console.log(`- output dir: ${outputDir}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("[ERROR]", err.message);
  try {
    await mongoose.disconnect();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});

const crypto = require("crypto");
const QRCode = require("qrcode");

class QRCodeService {
  static generatePermanentCode(equipmentId, serialNumber) {
    const seed = `${equipmentId}:${serialNumber}:${Date.now()}:${Math.random()}`;
    const hash = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12).toUpperCase();
    return `EQ-${hash}`;
  }

  static async generateDataUrl(qrValue) {
    return QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 240
    });
  }

  static buildQrImageUrl(qrValue) {
    const encoded = encodeURIComponent(qrValue);
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}`;
  }

  static extractQrCode(rawValue) {
    if (!rawValue) {
      return "";
    }

    const trimmed = String(rawValue).trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return trimmed;
    }

    try {
      const parsed = new URL(trimmed);
      const dataParam = parsed.searchParams.get("data");
      if (dataParam) {
        return decodeURIComponent(dataParam);
      }
      const codeParam = parsed.searchParams.get("code");
      if (codeParam) {
        return decodeURIComponent(codeParam);
      }
      return trimmed;
    } catch (err) {
      return trimmed;
    }
  }
}

module.exports = { QRCodeService };

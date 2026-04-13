const admin = require("firebase-admin");
const env = require("../config/env");
const PushToken = require("../models/PushToken");

let initialized = false;

function ensureFirebaseInitialized() {
  if (initialized) {
    return;
  }

  if (!env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebaseProjectId,
        clientEmail: env.firebaseClientEmail,
        privateKey: env.firebasePrivateKey
      })
    });
  }

  initialized = true;
}

class FcmService {
  static isEnabled() {
    ensureFirebaseInitialized();
    return initialized;
  }

  static async sendToUser(userId, payload) {
    const tokens = await PushToken.find({ userId, isActive: true }).select("token");
    return FcmService.sendToTokens(tokens.map((t) => t.token), payload);
  }

  static async sendToUsers(userIds, payload) {
    const tokens = await PushToken.find({ userId: { $in: userIds }, isActive: true }).select("token");
    return FcmService.sendToTokens(tokens.map((t) => t.token), payload);
  }

  static async sendToTokens(tokens, payload) {
    const dedupedTokens = [...new Set(tokens.filter(Boolean))];
    if (dedupedTokens.length === 0) {
      return { sent: 0, failed: 0, disabled: !FcmService.isEnabled(), message: "No active tokens" };
    }

    if (!FcmService.isEnabled()) {
      return {
        sent: 0,
        failed: dedupedTokens.length,
        disabled: true,
        message: "FCM is not configured. Set FIREBASE_* env vars."
      };
    }

    const message = {
      tokens: dedupedTokens,
      notification: payload.notification,
      data: payload.data || {}
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const invalidTokens = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-argument") {
          invalidTokens.push(dedupedTokens[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await PushToken.updateMany({ token: { $in: invalidTokens } }, { isActive: false });
    }

    return {
      sent: response.successCount,
      failed: response.failureCount,
      disabled: false,
      invalidatedTokens: invalidTokens.length
    };
  }
}

module.exports = { FcmService };

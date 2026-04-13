const express = require("express");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { ok } = require("../utils/response");
const verificationService = require("../services/verification.service");
const authService = require("../services/auth.service");

const router = express.Router();

router.post("/send-verification-code", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      const e = new Error("email is required");
      e.status = 422;
      e.code = "VALIDATION_ERROR";
      throw e;
    }

    const data = await verificationService.sendVerificationCode(email);
    return ok(res, data, "Verification code sent");
  } catch (err) {
    return next(err);
  }
});

router.post("/verify-code", async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      const e = new Error("email and code are required");
      e.status = 422;
      e.code = "VALIDATION_ERROR";
      throw e;
    }

    const data = await verificationService.verifyCode(email, code);
    return ok(res, data, "Email verified");
  } catch (err) {
    return next(err);
  }
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, name, phone, password, verificationToken } = req.body;
    if (!email || !name || !phone || !password || !verificationToken) {
      const e = new Error("email, name, phone, password, verificationToken are required");
      e.status = 422;
      e.code = "VALIDATION_ERROR";
      throw e;
    }

    let decoded;
    try {
      decoded = jwt.verify(verificationToken, env.jwtSecret);
      if (decoded.purpose !== "email-verification" || decoded.email !== email.toLowerCase()) {
        throw new Error("Invalid verification token");
      }
    } catch (err) {
      const e = new Error("Verification required");
      e.status = 400;
      e.code = "VERIFICATION_REQUIRED";
      throw e;
    }

    await verificationService.assertVerified(email);
    const data = await authService.register({ email, name, phone, password });
    await verificationService.clearVerification(email);
    return ok(res, data, "Registered successfully", 201);
  } catch (err) {
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const e = new Error("email and password are required");
      e.status = 422;
      e.code = "VALIDATION_ERROR";
      throw e;
    }

    const data = await authService.login({ email, password });
    return ok(res, data, "Logged in successfully");
  } catch (err) {
    return next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const refreshToken = tokenFromHeader || req.body.refreshToken;

    if (!refreshToken) {
      const e = new Error("refreshToken is required");
      e.status = 422;
      e.code = "VALIDATION_ERROR";
      throw e;
    }

    const data = authService.refresh(refreshToken);
    return ok(res, data, "Token refreshed");
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", async (req, res) => {
  return ok(res, {}, "Logged out successfully");
});

module.exports = router;

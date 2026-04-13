const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { redis } = require("../config/redis");
const { mailer } = require("../config/mailer");

function keyForEmail(email) {
  return `email:verify:${email.toLowerCase()}`;
}

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generateNumericCode(length) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

async function sendVerificationCode(email) {
  const code = generateNumericCode(env.verificationCodeLength);
  const codeHash = hashCode(code);
  const key = keyForEmail(email);

  const payload = JSON.stringify({
    codeHash,
    attempts: 0,
    verified: false
  });

  await redis.set(key, payload, "EX", env.verificationCodeTtlSeconds);

  await mailer.sendMail({
    from: env.mailFrom,
    to: email,
    subject: "[Smart Inventory] Verification Code",
    text: `Your verification code is ${code}. It expires in ${env.verificationCodeTtlSeconds} seconds.`
  });

  return { expiresInSeconds: env.verificationCodeTtlSeconds };
}

async function verifyCode(email, code) {
  const key = keyForEmail(email);
  const saved = await redis.get(key);
  if (!saved) {
    const e = new Error("Verification code expired");
    e.status = 400;
    e.code = "VERIFICATION_CODE_EXPIRED";
    throw e;
  }

  const parsed = JSON.parse(saved);
  if (parsed.attempts >= env.verificationMaxAttempts) {
    await redis.del(key);
    const e = new Error("Too many attempts");
    e.status = 400;
    e.code = "VERIFICATION_CODE_INVALID";
    throw e;
  }

  if (parsed.codeHash !== hashCode(code)) {
    parsed.attempts += 1;
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(parsed), "EX", Math.max(ttl, 1));
    const e = new Error("Verification code invalid");
    e.status = 400;
    e.code = "VERIFICATION_CODE_INVALID";
    throw e;
  }

  parsed.verified = true;
  parsed.attempts = 0;
  const ttl = await redis.ttl(key);
  await redis.set(key, JSON.stringify(parsed), "EX", Math.max(ttl, 1));

  const verificationToken = jwt.sign(
    { email: email.toLowerCase(), purpose: "email-verification" },
    env.jwtSecret,
    { expiresIn: `${Math.max(ttl, 60)}s` }
  );

  return { verified: true, verificationToken };
}

async function assertVerified(email) {
  const key = keyForEmail(email);
  const saved = await redis.get(key);
  if (!saved) {
    const e = new Error("Verification required");
    e.status = 400;
    e.code = "VERIFICATION_REQUIRED";
    throw e;
  }
  const parsed = JSON.parse(saved);
  if (!parsed.verified) {
    const e = new Error("Verification required");
    e.status = 400;
    e.code = "VERIFICATION_REQUIRED";
    throw e;
  }
}

async function clearVerification(email) {
  await redis.del(keyForEmail(email));
}

module.exports = {
  sendVerificationCode,
  verifyCode,
  assertVerified,
  clearVerification
};

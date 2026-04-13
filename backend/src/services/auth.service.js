const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");

function signTokens(user) {
  const payload = { sub: user._id.toString(), role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtAccessExpiry });
  const refreshToken = jwt.sign({ ...payload, type: "refresh" }, env.jwtSecret, {
    expiresIn: env.jwtRefreshExpiry
  });
  return { accessToken, refreshToken };
}

async function register({ email, name, phone, password }) {
  const normalizedEmail = email.toLowerCase();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    const e = new Error("Email already exists");
    e.status = 409;
    e.code = "EMAIL_ALREADY_EXISTS";
    throw e;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: normalizedEmail,
    name,
    phone,
    passwordHash,
    emailVerified: true,
    role: "STUDENT"
  });

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const e = new Error("Login failed");
    e.status = 401;
    e.code = "LOGIN_FAILED";
    throw e;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const e = new Error("Login failed");
    e.status = 401;
    e.code = "LOGIN_FAILED";
    throw e;
  }

  const tokens = signTokens(user);
  return {
    ...tokens,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
}

function refresh(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, env.jwtSecret);
    if (decoded.type !== "refresh") {
      throw new Error("Invalid refresh token");
    }
    const payload = { _id: decoded.sub, role: decoded.role, email: decoded.email };
    return signTokens(payload);
  } catch (err) {
    const e = new Error("Token expired or invalid");
    e.status = 401;
    e.code = "TOKEN_EXPIRED";
    throw e;
  }
}

module.exports = {
  register,
  login,
  refresh
};

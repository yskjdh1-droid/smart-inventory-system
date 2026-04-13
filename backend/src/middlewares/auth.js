const jwt = require("jsonwebtoken");
const env = require("../config/env");

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      const e = new Error("Unauthorized");
      e.status = 401;
      e.code = "UNAUTHORIZED";
      throw e;
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email
    };
    return next();
  } catch (err) {
    const e = new Error("Unauthorized");
    e.status = 401;
    e.code = "UNAUTHORIZED";
    return next(e);
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const e = new Error("Forbidden");
      e.status = 403;
      e.code = "FORBIDDEN";
      return next(e);
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };

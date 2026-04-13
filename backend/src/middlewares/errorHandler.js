const { fail } = require("../utils/response");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const error = err.code || "INTERNAL_ERROR";
  const message = err.message || "Internal server error";

  return fail(res, error, message, status);
}

module.exports = { errorHandler };

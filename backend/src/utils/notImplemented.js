const { fail } = require("./response");

function notImplemented(req, res) {
  return fail(res, "NOT_IMPLEMENTED", "This endpoint is defined in spec but not implemented yet", 501);
}

module.exports = { notImplemented };

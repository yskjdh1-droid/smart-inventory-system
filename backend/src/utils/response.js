function ok(res, data = {}, message = "OK", status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
}

function fail(res, error, message, status = 400, details) {
  return res.status(status).json({
    success: false,
    error,
    message,
    details: details || null
  });
}

module.exports = { ok, fail };

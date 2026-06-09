function errorHandler(error, req, res, _next) {
  console.error(error);

  if (res.headersSent) return;

  const wantsJson = req.path.startsWith("/api/");
  if (wantsJson) {
    return res.status(500).json({ message: "Error interno del servidor." });
  }

  res.status(500).send("Error interno del servidor.");
}

module.exports = errorHandler;

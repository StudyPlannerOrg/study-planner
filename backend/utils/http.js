function missingDatabase(res) {
  return res.status(503).json({ message: "DATABASE_URL no esta configurada." });
}

module.exports = {
  missingDatabase,
};

const jwt = require("jsonwebtoken");
const config = require("../config");
const { pool } = require("../db");
const { missingDatabase } = require("../utils/http");

function authenticate(req, res, next) {
  if (!pool) return missingDatabase(res);

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Sesion invalida o vencida." });
  }
}

module.exports = authenticate;

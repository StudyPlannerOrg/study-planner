const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { pool } = require("../db");
const { missingDatabase } = require("../utils/http");
const { isValidEmail, isValidPassword } = require("../utils/validation");

const router = express.Router();

router.post("/register", async (req, res) => {
  if (!pool) return missingDatabase(res);

  const { email, password } = req.body;
  const name = normalizeName(req.body?.name);
  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ message: "Email o password invalidos." });
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "insert into users (id, name, email, password_hash) values ($1, $2, $3, $4) returning id, name, email",
      [id, name, email.toLowerCase(), passwordHash]
    );
    res.status(201).json(createAuthResponse(result.rows[0]));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }
    res.status(500).json({ message: "No se pudo registrar el usuario." });
  }
});

router.post("/login", async (req, res) => {
  if (!pool) return missingDatabase(res);

  const { email, password } = req.body;
  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: "Email o password invalidos." });
  }

  const result = await pool.query("select id, name, email, password_hash from users where email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  const matches = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!matches) {
    return res.status(401).json({ message: "Credenciales incorrectas." });
  }

  res.json(createAuthResponse(user));
});

function createAuthResponse(user) {
  const safeUser = { id: user.id, name: user.name || "", email: user.email };
  const token = jwt.sign(safeUser, config.jwtSecret, { expiresIn: "7d" });
  return { token, user: safeUser };
}

function normalizeName(name) {
  const value = String(name || "").trim().replace(/\s+/g, " ");
  return value.slice(0, 80);
}

module.exports = router;

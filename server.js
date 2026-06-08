require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || "study-planner-dev-secret";
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
    })
  : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: Boolean(pool),
  });
});

app.post("/api/auth/register", async (req, res) => {
  if (!pool) return missingDatabase(res);

  const { email, password } = req.body;
  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ message: "Email o password invalidos." });
  }

  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "insert into users (id, email, password_hash) values ($1, $2, $3) returning id, email",
      [id, email.toLowerCase(), passwordHash]
    );
    res.status(201).json(createAuthResponse(result.rows[0]));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Ya existe un usuario con ese email." });
    }
    res.status(500).json({ message: "No se pudo registrar el usuario." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!pool) return missingDatabase(res);

  const { email, password } = req.body;
  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ message: "Email o password invalidos." });
  }

  const result = await pool.query("select id, email, password_hash from users where email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  const matches = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!matches) {
    return res.status(401).json({ message: "Credenciales incorrectas." });
  }

  res.json(createAuthResponse(user));
});

app.get("/api/tasks", authenticate, async (req, res) => {
  const result = await pool.query(
    `select id, title, subject, type, due_date, hours, notes, difficulty, status
     from tasks
     where user_id = $1
     order by due_date asc, created_at asc`,
    [req.user.id]
  );

  res.json(result.rows.map(fromDatabaseTask));
});

app.post("/api/tasks", authenticate, async (req, res) => {
  const task = normalizeTask(req.body);
  if (!task) return res.status(400).json({ message: "Datos de tarea invalidos." });

  const id = crypto.randomUUID();
  const result = await pool.query(
    `insert into tasks (id, user_id, title, subject, type, due_date, hours, notes, difficulty, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id, title, subject, type, due_date, hours, notes, difficulty, status`,
    [id, req.user.id, task.title, task.subject, task.type, task.dueDate, task.hours, task.notes, task.difficulty, task.status]
  );

  res.status(201).json(fromDatabaseTask(result.rows[0]));
});

app.patch("/api/tasks/:id", authenticate, async (req, res) => {
  const allowed = ["title", "subject", "type", "dueDate", "hours", "notes", "difficulty", "status"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(updates).length) return res.status(400).json({ message: "No hay cambios validos." });

  const fields = [];
  const values = [];
  Object.entries(updates).forEach(([key, value]) => {
    const column = key === "dueDate" ? "due_date" : key;
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  });

  values.push(req.params.id, req.user.id);
  const result = await pool.query(
    `update tasks set ${fields.join(", ")}
     where id = $${values.length - 1} and user_id = $${values.length}
     returning id, title, subject, type, due_date, hours, notes, difficulty, status`,
    values
  );

  if (!result.rows[0]) return res.status(404).json({ message: "Tarea no encontrada." });
  res.json(fromDatabaseTask(result.rows[0]));
});

app.delete("/api/tasks/:id", authenticate, async (req, res) => {
  const result = await pool.query("delete from tasks where id = $1 and user_id = $2", [req.params.id, req.user.id]);
  if (!result.rowCount) return res.status(404).json({ message: "Tarea no encontrada." });
  res.status(204).end();
});

app.post("/api/tasks/demo", authenticate, async (req, res) => {
  const demoTasks = req.body.tasks;
  if (!Array.isArray(demoTasks)) return res.status(400).json({ message: "Demo invalida." });

  await pool.query("delete from tasks where user_id = $1", [req.user.id]);

  for (const rawTask of demoTasks) {
    const task = normalizeTask(rawTask);
    if (!task) continue;
    await pool.query(
      `insert into tasks (id, user_id, title, subject, type, due_date, hours, notes, difficulty, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [crypto.randomUUID(), req.user.id, task.title, task.subject, task.type, task.dueDate, task.hours, task.notes, task.difficulty, task.status]
    );
  }

  res.json({ ok: true });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

start();

async function start() {
  if (pool) {
    const schema = fs.readFileSync(path.join(__dirname, "db", "schema.sql"), "utf8");
    await pool.query(schema);
  }

  app.listen(port, () => {
    console.log(`Study Planner escuchando en http://localhost:${port}`);
  });
}

function authenticate(req, res, next) {
  if (!pool) return missingDatabase(res);

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Sesion invalida o vencida." });
  }
}

function createAuthResponse(user) {
  const safeUser = { id: user.id, email: user.email };
  const token = jwt.sign(safeUser, jwtSecret, { expiresIn: "7d" });
  return { token, user: safeUser };
}

function normalizeTask(task) {
  if (!task) return null;

  const normalized = {
    title: String(task.title || "").trim(),
    subject: String(task.subject || "").trim(),
    type: String(task.type || "").trim(),
    dueDate: String(task.dueDate || "").slice(0, 10),
    hours: Number(task.hours),
    notes: String(task.notes || "").trim(),
    difficulty: String(task.difficulty || "").trim(),
    status: String(task.status || "Pendiente").trim(),
  };

  const validDifficulty = ["Baja", "Media", "Alta"].includes(normalized.difficulty);
  const validStatus = ["Pendiente", "En progreso", "Terminada"].includes(normalized.status);
  const validType = ["Trabajo practico", "Parcial", "Final", "Lectura", "Exposicion"].includes(normalized.type);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized.dueDate);

  if (!normalized.title || !normalized.subject || !normalized.notes || !validType || !validDifficulty || !validStatus || !validDate || normalized.hours < 1) {
    return null;
  }

  return normalized;
}

function fromDatabaseTask(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    type: row.type,
    dueDate: String(row.due_date).slice(0, 10),
    hours: row.hours,
    notes: row.notes,
    difficulty: row.difficulty,
    status: row.status,
  };
}

function missingDatabase(res) {
  return res.status(503).json({ message: "DATABASE_URL no esta configurada." });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").toLowerCase());
}

function isValidPassword(password) {
  return String(password || "").length >= 6;
}

const crypto = require("node:crypto");
const express = require("express");
const authenticate = require("../middleware/authenticate");
const { pool } = require("../db");
const { fromDatabaseTask } = require("../utils/taskMapper");
const { normalizeTask } = require("../utils/validation");

const router = express.Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const result = await pool.query(
    `select id, title, subject, type, due_date, hours, notes, checklist, difficulty, status
     from tasks
     where user_id = $1
     order by due_date asc, created_at asc`,
    [req.user.id]
  );

  res.json(result.rows.map(fromDatabaseTask));
});

router.post("/", async (req, res) => {
  const task = normalizeTask(req.body);
  if (!task) return res.status(400).json({ message: "Datos de tarea invalidos." });

  const id = crypto.randomUUID();
  const result = await pool.query(
    `insert into tasks (id, user_id, title, subject, type, due_date, hours, notes, checklist, difficulty, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning id, title, subject, type, due_date, hours, notes, checklist, difficulty, status`,
    [id, req.user.id, task.title, task.subject, task.type, task.dueDate, task.hours, task.notes, JSON.stringify(task.checklist), task.difficulty, task.status]
  );

  res.status(201).json(fromDatabaseTask(result.rows[0]));
});

router.patch("/:id", async (req, res) => {
  const allowed = ["title", "subject", "type", "dueDate", "hours", "notes", "checklist", "difficulty", "status"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(updates).length) return res.status(400).json({ message: "No hay cambios validos." });

  const currentResult = await pool.query(
    `select id, title, subject, type, due_date, hours, notes, checklist, difficulty, status
     from tasks
     where id = $1 and user_id = $2`,
    [req.params.id, req.user.id]
  );

  if (!currentResult.rows[0]) return res.status(404).json({ message: "Tarea no encontrada." });

  const normalized = normalizeTask({
    ...fromDatabaseTask(currentResult.rows[0]),
    ...updates,
  });

  if (!normalized) return res.status(400).json({ message: "Datos de tarea invalidos." });

  const fields = [];
  const values = [];
  Object.keys(updates).forEach((key) => {
    const column = key === "dueDate" ? "due_date" : key;
    values.push(key === "checklist" ? JSON.stringify(normalized[key]) : normalized[key]);
    fields.push(`${column} = $${values.length}`);
  });

  values.push(req.params.id, req.user.id);
  const result = await pool.query(
    `update tasks set ${fields.join(", ")}
     where id = $${values.length - 1} and user_id = $${values.length}
     returning id, title, subject, type, due_date, hours, notes, checklist, difficulty, status`,
    values
  );

  if (!result.rows[0]) return res.status(404).json({ message: "Tarea no encontrada." });
  res.json(fromDatabaseTask(result.rows[0]));
});

router.delete("/:id", async (req, res) => {
  const result = await pool.query("delete from tasks where id = $1 and user_id = $2", [req.params.id, req.user.id]);
  if (!result.rowCount) return res.status(404).json({ message: "Tarea no encontrada." });
  res.status(204).end();
});

router.post("/demo", async (req, res) => {
  const demoTasks = req.body.tasks;
  if (!Array.isArray(demoTasks)) return res.status(400).json({ message: "Demo invalida." });

  await pool.query("delete from tasks where user_id = $1", [req.user.id]);

  for (const rawTask of demoTasks) {
    const task = normalizeTask(rawTask);
    if (!task) continue;
    await pool.query(
      `insert into tasks (id, user_id, title, subject, type, due_date, hours, notes, checklist, difficulty, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [crypto.randomUUID(), req.user.id, task.title, task.subject, task.type, task.dueDate, task.hours, task.notes, JSON.stringify(task.checklist), task.difficulty, task.status]
    );
  }

  res.json({ ok: true });
});

module.exports = router;

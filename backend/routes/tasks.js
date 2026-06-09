const crypto = require("node:crypto");
const express = require("express");
const config = require("../config");
const authenticate = require("../middleware/authenticate");
const { pool } = require("../db");
const { fromDatabaseTask } = require("../utils/taskMapper");
const { normalizeTask } = require("../utils/validation");

const router = express.Router();

router.get("/due-reminders", async (req, res) => {
  if (!isValidN8nRequest(req)) return res.status(401).json({ message: "No autorizado." });

  const result = await pool.query(
    `select tasks.id, tasks.title, tasks.subject, tasks.type, tasks.due_date, tasks.due_time, tasks.hours,
            tasks.notes, tasks.checklist, tasks.difficulty, tasks.status, users.email
     from tasks
     join users on users.id = tasks.user_id
     where tasks.status <> 'Terminada'
       and tasks.due_date between current_date and current_date + interval '1 day'
     order by tasks.due_date asc, tasks.difficulty desc, tasks.created_at asc`
  );

  res.json({
    generatedAt: new Date().toISOString(),
    reminders: result.rows.map((row) => {
      const task = fromDatabaseTask(row);
      return {
        event: "task.due_reminder",
        user: { email: row.email },
        task,
        reminder: {
          label: getReminderLabel(task.dueDate),
          dueInDays: getDueInDays(task.dueDate),
        },
      };
    }),
  });
});

router.use(authenticate);

router.get("/", async (req, res) => {
  const result = await pool.query(
    `select id, title, subject, type, due_date, due_time, hours, notes, checklist, difficulty, status
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
    `insert into tasks (id, user_id, title, subject, type, due_date, due_time, hours, notes, checklist, difficulty, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning id, title, subject, type, due_date, due_time, hours, notes, checklist, difficulty, status`,
    [id, req.user.id, task.title, task.subject, task.type, task.dueDate, task.dueTime, task.hours, task.notes, JSON.stringify(task.checklist), task.difficulty, task.status]
  );

  const createdTask = fromDatabaseTask(result.rows[0]);

  res.status(201).json(createdTask);
});

router.patch("/:id", async (req, res) => {
  const allowed = ["title", "subject", "type", "dueDate", "dueTime", "hours", "notes", "checklist", "difficulty", "status"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(updates).length) return res.status(400).json({ message: "No hay cambios validos." });

  const currentResult = await pool.query(
    `select id, title, subject, type, due_date, due_time, hours, notes, checklist, difficulty, status
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
    const column = key === "dueDate" ? "due_date" : key === "dueTime" ? "due_time" : key;
    values.push(key === "checklist" ? JSON.stringify(normalized[key]) : normalized[key]);
    fields.push(`${column} = $${values.length}`);
  });

  values.push(req.params.id, req.user.id);
  const result = await pool.query(
    `update tasks set ${fields.join(", ")}
     where id = $${values.length - 1} and user_id = $${values.length}
     returning id, title, subject, type, due_date, due_time, hours, notes, checklist, difficulty, status`,
    values
  );

  if (!result.rows[0]) return res.status(404).json({ message: "Tarea no encontrada." });

  const updatedTask = fromDatabaseTask(result.rows[0]);

  res.json(updatedTask);
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
      `insert into tasks (id, user_id, title, subject, type, due_date, due_time, hours, notes, checklist, difficulty, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [crypto.randomUUID(), req.user.id, task.title, task.subject, task.type, task.dueDate, task.dueTime, task.hours, task.notes, JSON.stringify(task.checklist), task.difficulty, task.status]
    );
  }

  res.json({ ok: true });
});

module.exports = router;

function getDueInDays(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function getReminderLabel(dueDate) {
  const dueInDays = getDueInDays(dueDate);
  if (dueInDays === 0) return "Vence hoy";
  if (dueInDays === 1) return "Vence mañana";
  return "Proximo vencimiento";
}

function isValidN8nRequest(req) {
  if (!config.n8nSharedSecret) return true;
  return req.get("x-n8n-secret") === config.n8nSharedSecret;
}

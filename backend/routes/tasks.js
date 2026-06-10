const express = require("express");
const config = require("../config");
const { pool } = require("../db");
const authenticate = require("../middleware/authenticate");
const reminderService = require("../services/reminderService");
const taskService = require("../services/taskService");
const asyncHandler = require("../utils/asyncHandler");
const { missingDatabase } = require("../utils/http");

const router = express.Router();

router.get("/due-reminders", asyncHandler(async (req, res) => {
  if (!pool) return missingDatabase(res);
  if (!isValidN8nRequest(req)) return res.status(401).json({ message: "No autorizado." });

  res.json(await reminderService.buildDueReminders());
}));

router.use(authenticate);

router.get("/", asyncHandler(async (req, res) => {
  res.json(await taskService.listTasks(req.user.id));
}));

router.post("/", asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.user.id, req.body);
  if (!task) return res.status(400).json({ message: "Datos de tarea invalidos." });

  res.status(201).json(task);
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const result = await taskService.updateTask(req.params.id, req.user.id, req.body);

  if (result.status === "empty") return res.status(400).json({ message: "No hay cambios validos." });
  if (result.status === "invalid") return res.status(400).json({ message: "Datos de tarea invalidos." });
  if (result.status === "not_found") return res.status(404).json({ message: "Tarea no encontrada." });

  res.json(result.task);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const deleted = await taskService.deleteTask(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ message: "Tarea no encontrada." });

  res.status(204).end();
}));

router.post("/demo", asyncHandler(async (req, res) => {
  const imported = await taskService.replaceDemoTasks(req.user.id, req.body);
  if (!imported) return res.status(400).json({ message: "Demo invalida." });

  res.json({ ok: true });
}));

module.exports = router;

function isValidN8nRequest(req) {
  return Boolean(config.n8nSharedSecret) && req.get("x-n8n-secret") === config.n8nSharedSecret;
}

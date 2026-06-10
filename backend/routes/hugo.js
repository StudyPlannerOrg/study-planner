const express = require("express");
const config = require("../config");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticate);

router.post("/chat", asyncHandler(async (req, res) => {
  if (!config.hugoN8nWebhookUrl) {
    return res.status(503).json({ message: "Hugo IA no esta configurado." });
  }

  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ message: "Mensaje requerido." });

  const payload = {
    generatedAt: new Date().toISOString(),
    message,
    tasks: normalizeTasks(req.body?.tasks),
    user: {
      email: req.user.email,
      id: req.user.id,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(config.hugoN8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.hugoN8nSecret ? { "x-hugo-secret": config.hugoN8nSecret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await readWebhookResponse(response);
    if (!response.ok) {
      return res.status(502).json({ message: "Hugo IA no pudo responder." });
    }

    const reply = extractReply(data);
    if (!reply) return res.status(502).json({ message: "Respuesta invalida de Hugo IA." });

    return res.json({ reply, source: "n8n" });
  } catch {
    return res.status(502).json({ message: "No se pudo conectar con Hugo IA." });
  } finally {
    clearTimeout(timeout);
  }
}));

module.exports = router;

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.slice(0, 30).map((task) => ({
    checklist: Array.isArray(task.checklist)
      ? task.checklist.slice(0, 12).map((item) => ({ done: Boolean(item.done), text: String(item.text || "").slice(0, 120) }))
      : [],
    difficulty: task.difficulty,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    notes: String(task.notes || "").slice(0, 300),
    status: task.status,
    title: String(task.title || "").slice(0, 140),
    type: task.type,
  }));
}

async function readWebhookResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { reply: text };
  }
}

function extractReply(data) {
  const source = Array.isArray(data) ? data[0] : data;
  const reply = source?.reply || source?.message || source?.text || source?.output;
  return typeof reply === "string" ? reply.trim().slice(0, 1200) : "";
}

const { TASK_DIFFICULTIES, TASK_STATUSES, TASK_TYPES } = require("../constants/taskOptions");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").toLowerCase());
}

function isValidPassword(password) {
  return String(password || "").length >= 6;
}

function normalizeTask(task) {
  if (!task) return null;

  const normalized = {
    title: String(task.title || "").trim(),
    type: String(task.type || "").trim(),
    dueDate: String(task.dueDate || "").slice(0, 10),
    dueTime: normalizeDueTime(task.dueTime),
    hours: normalizeHours(task.hours),
    notes: String(task.notes || "").trim(),
    checklist: normalizeChecklist(task.checklist),
    difficulty: String(task.difficulty || "").trim(),
    status: String(task.status || "Pendiente").trim(),
  };

  const validDifficulty = TASK_DIFFICULTIES.includes(normalized.difficulty);
  const validStatus = TASK_STATUSES.includes(normalized.status);
  const validType = TASK_TYPES.includes(normalized.type);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized.dueDate);
  const validHours = normalized.hours === null || normalized.hours >= 1;

  if (!normalized.title || !validType || !validDifficulty || !validStatus || !validDate || !validHours) {
    return null;
  }

  return normalized;
}

function normalizeDueTime(dueTime) {
  const value = String(dueTime || "").trim();
  return /^\d{2}:\d{2}$/.test(value) ? value : "";
}

function normalizeHours(hours) {
  if (hours === "" || hours === null || hours === undefined) return null;
  const parsed = Number(hours);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function normalizeChecklist(checklist) {
  if (!Array.isArray(checklist)) return [];

  return checklist
    .map((item) => ({
      id: String(item.id || cryptoRandomId()).trim(),
      text: String(item.text || "").trim(),
      done: Boolean(item.done),
    }))
    .filter((item) => item.text)
    .slice(0, 20);
}

function cryptoRandomId() {
  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  normalizeTask,
};

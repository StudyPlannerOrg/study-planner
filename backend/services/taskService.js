const taskRepository = require("../repositories/taskRepository");
const { fromDatabaseTask } = require("../utils/taskMapper");
const { normalizeTask } = require("../utils/validation");

const ALLOWED_TASK_UPDATES = ["title", "type", "dueDate", "dueTime", "hours", "notes", "checklist", "difficulty", "status"];

async function listTasks(userId) {
  const rows = await taskRepository.listTasksByUser(userId);
  return rows.map(fromDatabaseTask);
}

async function createTask(userId, payload) {
  const task = normalizeTask(payload);
  if (!task) return null;
  const row = await taskRepository.createTask(userId, task);
  return fromDatabaseTask(row);
}

async function updateTask(taskId, userId, payload) {
  const updates = pickAllowedUpdates(payload);
  const changedKeys = Object.keys(updates);
  if (!changedKeys.length) return { status: "empty" };

  const current = await taskRepository.findTaskByUser(taskId, userId);
  if (!current) return { status: "not_found" };

  const normalized = normalizeTask({
    ...fromDatabaseTask(current),
    ...updates,
  });
  if (!normalized) return { status: "invalid" };

  const row = await taskRepository.updateTask(taskId, userId, normalized, changedKeys);
  if (!row) return { status: "not_found" };
  return { status: "ok", task: fromDatabaseTask(row) };
}

async function deleteTask(taskId, userId) {
  return taskRepository.deleteTask(taskId, userId);
}

async function replaceDemoTasks(userId, payload) {
  if (!Array.isArray(payload.tasks)) return false;
  const tasks = payload.tasks.map(normalizeTask).filter(Boolean);
  await taskRepository.replaceDemoTasks(userId, tasks);
  return true;
}

function pickAllowedUpdates(payload) {
  return Object.fromEntries(Object.entries(payload || {}).filter(([key]) => ALLOWED_TASK_UPDATES.includes(key)));
}

module.exports = {
  createTask,
  deleteTask,
  listTasks,
  replaceDemoTasks,
  updateTask,
};

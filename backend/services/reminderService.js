const { fromDatabaseTask } = require("../utils/taskMapper");
const taskRepository = require("../repositories/taskRepository");

async function buildDueReminders() {
  const rows = await taskRepository.listDueReminderRows();
  return {
    generatedAt: new Date().toISOString(),
    reminders: rows.map(toReminder),
  };
}

function toReminder(row) {
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
}

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

module.exports = {
  buildDueReminders,
};

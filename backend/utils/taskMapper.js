const { calculatePriorityScore, explainPriority, getPriorityLabel } = require("../services/priorityService");

function fromDatabaseTask(row) {
  const task = {
    id: row.id,
    title: row.title,
    type: row.type,
    dueDate: formatDatabaseDate(row.due_date),
    hours: row.hours,
    notes: row.notes,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    difficulty: row.difficulty,
    status: row.status,
  };

  const score = calculatePriorityScore(task);
  return {
    ...task,
    priority: {
      label: getPriorityLabel(score),
      reason: explainPriority(task),
      score,
    },
  };
}

function formatDatabaseDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

module.exports = {
  fromDatabaseTask,
};

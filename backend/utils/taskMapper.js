function fromDatabaseTask(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    type: row.type,
    dueDate: formatDatabaseDate(row.due_date),
    hours: row.hours,
    notes: row.notes,
    difficulty: row.difficulty,
    status: row.status,
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

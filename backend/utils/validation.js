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

module.exports = {
  isValidEmail,
  isValidPassword,
  normalizeTask,
};

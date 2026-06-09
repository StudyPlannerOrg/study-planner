export function normalizeDateValue(value) {
  if (!value) return todayOffset(0);
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayOffset(0);
  return date.toISOString().slice(0, 10);
}

export function daysUntil(value) {
  const today = new Date(todayOffset(0));
  const due = new Date(normalizeDateValue(value));
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / 86400000);
}

export function todayOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function formatDate(value) {
  const normalized = normalizeDateValue(value);
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

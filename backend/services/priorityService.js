const { DIFFICULTY_POINTS, TYPE_POINTS } = require("../constants/taskOptions");

function calculatePriorityScore(task) {
  return getPriorityBreakdown(task).score;
}

function getPriorityBreakdown(task) {
  const days = daysUntil(task.dueDate);
  const effortHours = getEffectiveHours(task);
  const effort = Math.min(18, effortHours * 2);
  const urgency = getUrgencyPoints(days);
  const difficulty = DIFFICULTY_POINTS[task.difficulty] || 0;
  const type = TYPE_POINTS[task.type] || 0;
  const progress = getProgressPoints(task);
  const rawScore = urgency + difficulty + type + effort + progress;

  return {
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
    estimatedHours: effortHours,
    usesEstimatedEffort: !Number(task.hours),
  };
}

function explainPriority(task) {
  const days = daysUntil(task.dueDate);
  const breakdown = getPriorityBreakdown(task);
  const dueText = days < 0 ? "ya esta vencida" : days === 0 ? "vence hoy" : `vence en ${days} dia(s)`;
  const effortText = getEffortText(task, breakdown);

  if (breakdown.score >= 75) {
    return `Prioridad maxima: ${dueText}, dificultad ${task.difficulty.toLowerCase()} y ${effortText}.`;
  }

  if (breakdown.score >= 45) {
    return `Conviene reservar tiempo esta semana: ${dueText} y ${effortText}.`;
  }

  return `Puede planificarse despues de las tareas criticas: ${dueText}.`;
}

function getPriorityLabel(score) {
  if (score >= 75) return "Urgente";
  if (score >= 45) return "Alta";
  return "Normal";
}

function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${normalizeDateValue(value)}T00:00:00`);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function normalizeDateValue(value) {
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getUrgencyPoints(days) {
  if (days < 0) return 34;
  if (days === 0) return 32;
  if (days <= 2) return 26;
  if (days <= 7) return 16;
  if (days <= 14) return 8;
  return 2;
}

function getProgressPoints(task) {
  if (task.status === "Terminada") return -100;
  if (task.status === "En progreso") return -8;
  return 0;
}

function getEffectiveHours(task) {
  const provided = Number(task.hours);
  if (provided > 0) return provided;

  const byDifficulty = { Alta: 6, Media: 4, Baja: 2 };
  const byType = {
    Final: 8,
    Parcial: 6,
    "Trabajo practico": 5,
    Exposicion: 4,
    Lectura: 2,
  };

  return Math.max(byDifficulty[task.difficulty] || 3, byType[task.type] || 3);
}

function getEffortText(task, breakdown) {
  if (breakdown.usesEstimatedEffort) return "requiere atencion segun su tipo";
  const hours = Number(task.hours);
  if (hours >= 8) return "demanda alta";
  if (hours >= 5) return "demanda media";
  return "demanda baja";
}

module.exports = {
  calculatePriorityScore,
  explainPriority,
  getPriorityBreakdown,
  getPriorityLabel,
};

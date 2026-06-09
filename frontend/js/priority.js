import { daysUntil } from "./dates.js";

export function calculatePriorityScore(task) {
  const days = daysUntil(task.dueDate);
  const difficultyPoints = { Alta: 30, Media: 18, Baja: 8 };
  const typePoints = {
    Final: 30,
    Parcial: 26,
    "Trabajo practico": 20,
    Exposicion: 18,
    Lectura: 8,
  };

  let score = difficultyPoints[task.difficulty] + typePoints[task.type] + Number(task.hours) * 3;

  if (days < 0) score += 40;
  else if (days <= 1) score += 35;
  else if (days <= 3) score += 25;
  else if (days <= 7) score += 12;

  if (task.status === "En progreso") score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function explainPriority(task) {
  const days = daysUntil(task.dueDate);
  const score = calculatePriorityScore(task);
  const dueText = days < 0 ? "ya esta vencida" : days === 0 ? "vence hoy" : `vence en ${days} dia(s)`;

  if (score >= 75) {
    return `Prioridad maxima: ${dueText}, dificultad ${task.difficulty.toLowerCase()} y ${task.hours} hora(s) estimadas.`;
  }

  if (score >= 45) {
    return `Conviene reservar tiempo esta semana: ${dueText} y demanda ${task.hours} hora(s).`;
  }

  return `Puede planificarse despues de las tareas criticas: ${dueText}.`;
}

import { daysUntil, formatDate } from "./dates.js";
import { escapeHtml } from "./helpers.js";
import { calculatePriorityScore, explainPriority } from "./priority.js";

export function buildHugoReply(message, tasks, helpers) {
  const normalized = message.toLowerCase();
  const active = helpers.sortTasks(tasks.filter((task) => task.status !== "Terminada"));
  const completed = tasks.filter((task) => task.status === "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);

  if (!tasks.length) return "Todavia no hay tareas cargadas. Crea una actividad y te ayudo a priorizarla.";

  if (normalized.includes("hola") || normalized.includes("buen")) {
    return `Hola. Tenes ${active.length} tareas activas y ${completed.length} terminadas. Puedo ayudarte con prioridades, vencimientos o progreso.`;
  }

  if (normalized.includes("primero") || normalized.includes("prioridad") || normalized.includes("urgente")) {
    if (!active.length) return "No tenes tareas activas. Lo que aparece terminado queda tachado y al fondo.";
    const task = active[0];
    return `Yo empezaria por "${task.title}". Vence el ${formatDate(task.dueDate)}, dificultad ${task.difficulty}, progreso ${helpers.formatProgress(task)}. ${explainPriority(task)}`;
  }

  if (normalized.includes("semana") || normalized.includes("vence") || normalized.includes("fecha")) {
    if (!week.length) return "No veo tareas activas que venzan esta semana.";
    return `Esta semana tenes: ${week.slice(0, 4).map((task) => `"${task.title}" (${formatDate(task.dueDate)})`).join(", ")}.`;
  }

  if (normalized.includes("progreso") || normalized.includes("voy") || normalized.includes("avance")) {
    const total = tasks.length;
    const percent = total ? Math.round((completed.length / total) * 100) : 0;
    return `Vas con ${completed.length}/${total} tareas terminadas (${percent}%). Pendientes: ${active.length}.`;
  }

  if (normalized.includes("plan") || normalized.includes("organiza") || normalized.includes("estudi")) {
    if (!active.length) return "Tu agenda activa esta libre. Podrias revisar tareas terminadas o cargar la proxima entrega.";
    return `Plan corto: 1) trabaja en "${active[0].title}", 2) revisa subtareas incompletas, 3) deja preparada la siguiente entrega: ${active[1] ? `"${active[1].title}"` : "no hay otra tarea activa"}.`;
  }

  if (urgent.length) return `Detecte ${urgent.length} tarea(s) urgente(s). La primera es "${urgent[0].title}", con entrega ${formatDate(urgent[0].dueDate)}.`;
  return "Puedo responder sobre que hacer primero, que vence esta semana, como vas de progreso o ayudarte a armar un plan.";
}

export function renderRecommendations(container, tasks, chatMessages, helpers) {
  if (chatMessages.length) {
    container.innerHTML = chatMessages
      .map(
        (message) => `
          <div class="chat-message ${message.from}">
            <span>${escapeHtml(message.text)}</span>
          </div>
        `
      )
      .join("");
    container.scrollTop = container.scrollHeight;
    return;
  }

  const ranked = tasks
    .filter((task) => task.status !== "Terminada")
    .map((task) => ({
      task,
      score: calculatePriorityScore(task),
      reason: explainPriority(task),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!ranked.length) {
    container.innerHTML = `<div class="chat-message bot"><span>Soy Hugo. Crea una tarea y te ayudo a priorizarla.</span></div>`;
    return;
  }

  container.innerHTML = ranked
    .map(
      ({ task, reason }) => `
        <div class="chat-message bot">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${reason}</span>
          <small>Progreso: ${helpers.formatProgress(task)}</small>
        </div>
      `
    )
    .join("");
}

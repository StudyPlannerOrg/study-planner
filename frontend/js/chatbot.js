import { daysUntil, formatDate } from "./dates.js";
import { escapeHtml } from "./helpers.js";
import { calculatePriorityScore, explainPriority } from "./priority.js";

export function buildHugoReply(message, tasks, helpers) {
  const normalized = message.toLowerCase();
  const active = helpers.sortTasks(tasks.filter((task) => task.status !== "Terminada"));
  const completed = tasks.filter((task) => task.status === "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);

  if (!isStudyPlannerQuestion(normalized, tasks)) {
    return "Puedo ayudarte con tu agenda academica: prioridades, vencimientos, progreso, subtareas y riesgo de tus tareas.";
  }

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

  if (normalized.includes("predic") || normalized.includes("riesgo") || normalized.includes("complic")) {
    const risky = active
      .map((task) => ({ task, score: calculateRiskScore(task, helpers) }))
      .filter((item) => item.score >= 45)
      .sort((a, b) => b.score - a.score);

    if (!risky.length) return "No veo riesgo alto ahora. Mantene el avance de las tareas activas y revisa la agenda semanal.";

    const top = risky[0].task;
    const level = risky[0].score >= 80 ? "alto" : risky[0].score >= 60 ? "medio" : "moderado";
    return `Prediccion: el mayor riesgo es "${top.title}" con nivel ${level}. Vence el ${formatDate(top.dueDate)}, dificultad ${top.difficulty} y progreso ${helpers.formatProgress(top)}. Recomendacion: separa una subtarea concreta para hoy y revisa si necesitas adelantarla.`;
  }

  if (normalized.includes("plan") || normalized.includes("organiza") || normalized.includes("estudi")) {
    if (!active.length) return "Tu agenda activa esta libre. Podrias revisar tareas terminadas o cargar la proxima entrega.";
    return `Plan corto: 1) trabaja en "${active[0].title}", 2) revisa subtareas incompletas, 3) deja preparada la siguiente entrega: ${active[1] ? `"${active[1].title}"` : "no hay otra tarea activa"}.`;
  }

  return "Puedo responder sobre que hacer primero, que vence esta semana, como vas de progreso o ayudarte a armar un plan.";
}

function isStudyPlannerQuestion(normalized, tasks) {
  const academicKeywords = [
    "agenda",
    "avance",
    "complic",
    "entrega",
    "estudi",
    "fecha",
    "final",
    "organizar",
    "organizo",
    "ordenar",
    "materia",
    "parcial",
    "pendiente",
    "plan",
    "prioridad",
    "progreso",
    "riesgo",
    "semana",
    "subtarea",
    "tarea",
    "tp",
    "trabajo",
    "ayuda",
    "ayudame",
    "recomenda",
    "recomendas",
    "recomendacion",
    "urgente",
    "vence",
    "vencimiento",
    "voy",
  ];
  const greetingKeywords = ["hola", "buen", "hey", "hugo"];
  const taskTitles = tasks.map((task) => String(task.title || "").toLowerCase()).filter(Boolean);

  return (
    academicKeywords.some((keyword) => normalized.includes(keyword)) ||
    greetingKeywords.some((keyword) => normalized.includes(keyword)) ||
    taskTitles.some((title) => title && normalized.includes(title))
  );
}

function calculateRiskScore(task, helpers) {
  const days = daysUntil(task.dueDate);
  const progressText = helpers.formatProgress(task);
  const progress = Number(progressText.match(/\d+/)?.[0] || 0);
  const dueRisk = days < 0 ? 50 : days <= 1 ? 42 : days <= 3 ? 32 : days <= 7 ? 18 : 6;
  const difficultyRisk = task.difficulty === "Alta" ? 28 : task.difficulty === "Media" ? 16 : 8;
  const progressRisk = progress < 25 ? 24 : progress < 60 ? 14 : 4;
  const statusRisk = task.status === "Pendiente" ? 10 : 0;
  return dueRisk + difficultyRisk + progressRisk + statusRisk;
}

export function renderRecommendations(container, tasks, chatMessages, helpers) {
  if (chatMessages.length) {
    container.innerHTML = chatMessages
      .map(
        (message) => `
          <div class="chat-message ${message.from} ${message.thinking ? "thinking" : ""}">
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

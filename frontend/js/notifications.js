import { daysUntil, formatDate, normalizeDateValue } from "./dates.js";
import { escapeHtml, readJson } from "./helpers.js";
import { calculatePriorityScore, explainPriority } from "./priority.js";

export function buildNotifications(tasks, getChecklistProgress) {
  const active = tasks.filter((task) => task.status !== "Terminada");
  const overdue = active.filter((task) => daysUntil(task.dueDate) < 0);
  const today = active.filter((task) => daysUntil(task.dueDate) === 0);
  const tomorrow = active.filter((task) => daysUntil(task.dueDate) === 1);
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75 && daysUntil(task.dueDate) > 1);
  const incompleteSteps = active.filter((task) => {
    const progress = getChecklistProgress(task);
    return progress.total && progress.percent < 100 && daysUntil(task.dueDate) <= 2;
  });

  return [
    ...overdue.map((task) => ({
      id: `overdue-${task.id}`,
      tone: "danger",
      title: `Vencio: ${task.title}`,
      body: `${formatDate(task.dueDate)} - ${task.status}`,
      taskId: task.id,
    })),
    ...today.map((task) => ({
      id: `today-${task.id}`,
      tone: "warning",
      title: `Vence hoy: ${task.title}`,
      body: `${task.type} - ${task.difficulty}`,
      taskId: task.id,
    })),
    ...tomorrow.map((task) => ({
      id: `tomorrow-${task.id}`,
      tone: "info",
      title: `Vence mañana: ${task.title}`,
      body: `${task.type} - ${task.status}`,
      taskId: task.id,
    })),
    ...urgent.slice(0, 3).map((task) => ({
      id: `urgent-${task.id}`,
      tone: "warning",
      title: `Prioridad alta: ${task.title}`,
      body: `${formatDate(task.dueDate)} - ${explainPriority(task)}`,
      taskId: task.id,
    })),
    ...incompleteSteps.slice(0, 3).map((task) => {
      const progress = getChecklistProgress(task);
      return {
        id: `steps-${task.id}`,
        tone: "info",
        title: `Subtareas pendientes: ${task.title}`,
        body: `${progress.done}/${progress.total} pasos completos`,
        taskId: task.id,
      };
    }),
  ];
}

export function renderNotifications(elements, notifications, options = {}) {
  elements.count.textContent = String(notifications.length);
  elements.count.classList.toggle("empty", !notifications.length || options.viewed);

  elements.list.innerHTML = notifications.length
    ? notifications
        .map(
          (item) => `
            <button class="notification-item ${item.tone}" type="button" data-notification-task="${item.taskId}">
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.body)}</span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty">No hay avisos importantes por ahora.</div>`;
}

export async function requestBrowserNotifications(button, notifications, storageKey) {
  if (!("Notification" in window)) {
    button.textContent = "No disponible";
    return;
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    button.textContent = "Permiso denegado";
    return;
  }

  const sent = readJson(storageKey) || {};
  const todayKey = normalizeDateValue(new Date());
  notifications
    .filter((item) => item.tone !== "info")
    .slice(0, 4)
    .forEach((item) => {
      const sentKey = `${todayKey}-${item.id}`;
      if (sent[sentKey]) return;
      new Notification("Study Planner", { body: `${item.title}. ${item.body}` });
      sent[sentKey] = true;
    });

  localStorage.setItem(storageKey, JSON.stringify(sent));
  button.textContent = notifications.length ? "Alertas activas" : "Sin alertas";
}

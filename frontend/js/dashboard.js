import { daysUntil } from "./dates.js";
import { escapeHtml } from "./helpers.js";
import { calculatePriorityScore } from "./priority.js";
import { formatProgress, formatTaskSubtitle, getPriorityClass, sortTasks } from "./taskUtils.js";

export function renderMetrics(tasks, elements) {
  const active = tasks.filter((task) => task.status !== "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);
  const pending = tasks.filter((task) => task.status === "Pendiente");

  elements.total.textContent = active.length;
  elements.urgent.textContent = urgent.length;
  elements.week.textContent = week.length;
  elements.pending.textContent = pending.length;
}

export function renderFocus(container, tasks) {
  const active = sortTasks(tasks.filter((task) => task.status !== "Terminada")).slice(0, 3);

  if (!active.length) {
    container.innerHTML = `<div class="empty-state">No hay tareas activas. Crea una para empezar.</div>`;
    return;
  }

  container.innerHTML = active
    .map((task) => {
      const priority = getPriorityClass(task);
      return `
        <article class="focus-item" data-priority="${priority}" data-id="${task.id}" tabindex="0" role="button" aria-label="Abrir ${escapeHtml(task.title)}">
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <span>${formatTaskSubtitle(task)}</span>
          </div>
          <b>${formatProgress(task)}</b>
        </article>
      `;
    })
    .join("");
}

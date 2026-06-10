import { formatDate, normalizeDateValue } from "./dates.js";
import { escapeHtml } from "./helpers.js";
import { getPriorityClass, getTaskStateClass, sortTasks } from "./taskUtils.js";

export function prepareDayModal(elements, tasks, date) {
  const dayTasks = sortTasks(tasks.filter((task) => normalizeDateValue(task.dueDate) === date));

  elements.title.textContent = formatDate(date);
  elements.addButton.textContent = "Agregar tarea en este dia";
  elements.addButton.dataset.metricFilter = "";
  elements.tasks.innerHTML = dayTasks.length
    ? dayTasks.map((task) => renderModalTask(task, `${escapeHtml(task.type)} - ${task.status}`)).join("")
    : `<div class="empty-state compact-empty">No hay tareas para este dia.</div>`;
}

export function prepareMetricModal(elements, tasks, filter) {
  const labels = {
    active: "Tareas activas",
    urgent: "Tareas urgentes",
    week: "Vencen esta semana",
    pending: "Tareas pendientes",
  };

  elements.title.textContent = labels[filter] || "Tareas";
  elements.addButton.textContent = "Ver en agenda";
  elements.addButton.dataset.metricFilter = filter;
  elements.tasks.innerHTML = tasks.length
    ? tasks.map((task) => renderModalTask(task, `${formatDate(task.dueDate)} - ${task.status}`)).join("")
    : `<div class="empty-state compact-empty">No hay tareas en este grupo.</div>`;
}

function renderModalTask(task, subtitle) {
  return `
    <button class="modal-task ${getPriorityClass(task)} ${getTaskStateClass(task)}" type="button" data-modal-task="${task.id}">
      <strong>${escapeHtml(task.title)}</strong>
      <span>${subtitle}</span>
    </button>
  `;
}

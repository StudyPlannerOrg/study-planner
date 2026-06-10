import { escapeHtml } from "./helpers.js";
import { formatDateTime, getPriorityClass, getTaskStateClass, renderChecklistPreview } from "./taskUtils.js";

export function renderTaskCards(container, items) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">No hay tareas para los filtros seleccionados.</div>`;
    return;
  }

  container.innerHTML = items
    .map((task) => {
      const priority = getPriorityClass(task);
      return `
        <article class="task-card ${getTaskStateClass(task)}" data-priority="${priority}" data-id="${task.id}" tabindex="0" role="button" aria-label="Ver o editar ${escapeHtml(task.title)}">
          <div class="task-main">
            <div>
              <strong>${escapeHtml(task.title)}</strong>
              <div class="task-meta">
                <span>${formatDateTime(task)}</span>
                <span>${escapeHtml(task.type)}</span>
              </div>
            </div>
            <span class="tag ${priority}">${priority}</span>
          </div>
          ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ""}
          ${renderChecklistPreview(task)}
          <div class="task-footer">
            <div class="task-actions">
              <span>Dificultad: ${escapeHtml(task.difficulty)}</span>
              <button class="status-button" data-action="status" data-id="${task.id}">Estado: ${escapeHtml(task.status)}</button>
            </div>
            <button class="small-button danger-button task-delete" data-action="delete" data-id="${task.id}">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

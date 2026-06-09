import { escapeHtml } from "./helpers.js";

export function addChecklistRow(container, item = {}, options = {}) {
  const row = document.createElement("div");
  row.className = "checklist-row";
  row.draggable = true;
  row.dataset.itemId = item.id || crypto.randomUUID();
  row.innerHTML = `
    ${
      options.withDoneToggle
        ? `<label class="checklist-toggle">
            <input type="checkbox" ${item.done ? "checked" : ""} />
            <span></span>
          </label>`
        : `<span class="drag-handle" aria-hidden="true">☰</span>`
    }
    <input type="text" value="${escapeHtml(item.text || "")}" placeholder="Ej: leer consigna, resolver ejercicios, revisar entrega" />
    <button class="icon-button" type="button" data-checklist-remove aria-label="Quitar subtarea">x</button>
  `;
  container.appendChild(row);
}

export function renderChecklistEditor(container, checklist, options = {}) {
  container.innerHTML = "";
  checklist.forEach((item) => addChecklistRow(container, item, options));
}

export function readChecklist(container) {
  return [...container.querySelectorAll(".checklist-row")]
    .map((row) => ({
      id: row.dataset.itemId || crypto.randomUUID(),
      text: row.querySelector('input[type="text"]').value.trim(),
      done: Boolean(row.querySelector('input[type="checkbox"]')?.checked),
    }))
    .filter((item) => item.text);
}

export function updateChecklistProgress(container, progressElement) {
  const checklist = readChecklist(container);
  const done = checklist.filter((item) => item.done).length;
  progressElement.textContent = `${done}/${checklist.length}`;
}

export function handleChecklistDragStart(event) {
  const row = event.target.closest(".checklist-row");
  if (!row) return;
  event.dataTransfer.setData("text/plain", row.dataset.itemId);
  row.classList.add("dragging");
}

export function handleChecklistDragOver(event) {
  event.preventDefault();
  const row = event.target.closest(".checklist-row");
  const dragging = event.currentTarget.querySelector(".dragging");
  if (!row || !dragging || row === dragging) return;
  const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
  event.currentTarget.insertBefore(dragging, before ? row : row.nextSibling);
}

export function handleChecklistDrop(event) {
  event.preventDefault();
  handleChecklistDragEnd(event);
}

export function handleChecklistDragEnd(event) {
  event.currentTarget.querySelector(".dragging")?.classList.remove("dragging");
}

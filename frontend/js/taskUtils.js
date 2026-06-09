import { formatDate, normalizeDateValue } from "./dates.js";
import { escapeHtml } from "./helpers.js";
import { calculatePriorityScore } from "./priority.js";

export function collectTaskForm(formElement, checklistElement, readChecklist) {
  const data = new FormData(formElement);
  const hours = Number(data.get("hours"));

  return {
    title: data.get("title").trim(),
    type: data.get("type"),
    dueDate: data.get("dueDate"),
    dueTime: data.get("dueTime"),
    hours: hours > 0 ? hours : null,
    notes: String(data.get("notes") || "").trim(),
    checklist: readChecklist(checklistElement),
    difficulty: data.get("difficulty"),
    status: data.get("status"),
  };
}

export function sortTasks(items) {
  return items.map(normalizeTaskDates).sort((a, b) => {
    const byDone = compareCompleted(a, b);
    if (byDone !== 0) return byDone;
    const byScore = calculatePriorityScore(b) - calculatePriorityScore(a);
    if (byScore !== 0) return byScore;
    return normalizeDateValue(a.dueDate).localeCompare(normalizeDateValue(b.dueDate));
  });
}

export function normalizeTaskDates(task) {
  return {
    ...task,
    dueDate: normalizeDateValue(task.dueDate),
    dueTime: task.dueTime || "",
    hours: Number(task.hours) > 0 ? Number(task.hours) : null,
    notes: task.notes || "",
    checklist: Array.isArray(task.checklist) ? task.checklist : [],
  };
}

export function sortForView(items, sortMode) {
  const sorted = [...items];
  const difficultyOrder = { Alta: 0, Media: 1, Baja: 2 };

  if (sortMode === "dueDate") {
    return sorted.sort((a, b) => compareCompleted(a, b) || normalizeDateValue(a.dueDate).localeCompare(normalizeDateValue(b.dueDate)));
  }

  if (sortMode === "difficulty") {
    return sorted.sort((a, b) => compareCompleted(a, b) || difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] || calculatePriorityScore(b) - calculatePriorityScore(a));
  }

  if (sortMode === "progress") {
    return sorted.sort((a, b) => compareCompleted(a, b) || getChecklistProgress(b).percent - getChecklistProgress(a).percent || calculatePriorityScore(b) - calculatePriorityScore(a));
  }

  return sortTasks(sorted);
}

export function formatTaskSubtitle(task) {
  return [formatDateTime(task), task.type].filter(Boolean).map(escapeHtml).join(" - ");
}

export function formatDateTime(task) {
  return `${formatDate(task.dueDate)}${task.dueTime ? ` ${task.dueTime}` : ""}`;
}

export function getPriorityClass(task) {
  const score = calculatePriorityScore(task);
  if (score >= 75) return "Urgente";
  if (score >= 45) return "Alta";
  return "Normal";
}

export function getTaskStateClass(task) {
  return task.status === "Terminada" ? "is-completed" : "";
}

export function getNextStatus(status) {
  if (status === "Pendiente") return "En progreso";
  if (status === "En progreso") return "Terminada";
  return "Pendiente";
}

export function compareCompleted(a, b) {
  return Number(a.status === "Terminada") - Number(b.status === "Terminada");
}

export function formatProgress(task) {
  const progress = getChecklistProgress(task);
  if (progress.total) return `${progress.percent}%`;
  if (task.status === "Terminada") return "100%";
  if (task.status === "En progreso") return "50%";
  return "0%";
}

export function matchesMetricFilter(task, metricFilter) {
  if (metricFilter === "active") return task.status !== "Terminada";
  if (metricFilter === "urgent") return task.status !== "Terminada" && calculatePriorityScore(task) >= 75;
  if (metricFilter === "week") return task.status !== "Terminada" && daysUntilTask(task) <= 7;
  if (metricFilter === "pending") return task.status === "Pendiente";
  return true;
}

export function getChecklistProgress(task) {
  const checklist = task.checklist || [];
  const done = checklist.filter((item) => item.done).length;
  return {
    done,
    total: checklist.length,
    percent: checklist.length ? Math.round((done / checklist.length) * 100) : 0,
  };
}

export function renderChecklistPreview(task) {
  const checklist = task.checklist || [];
  if (!checklist.length) return "";

  const progress = getChecklistProgress(task);
  return `
    <div class="checklist-preview">
      <div class="checklist-progress">
        <span>Pasos ${progress.done}/${progress.total}</span>
        <b style="width: ${progress.percent}%"></b>
      </div>
      ${checklist
        .slice(0, 4)
        .map(
          (item) => `
            <label class="task-check">
              <input type="checkbox" data-action="toggle-check" data-id="${task.id}" data-item-id="${item.id}" ${item.done ? "checked" : ""} />
              <span>${escapeHtml(item.text)}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function daysUntilTask(task) {
  const today = new Date(normalizeDateValue(new Date()));
  const due = new Date(normalizeDateValue(task.dueDate));
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

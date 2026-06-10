import { normalizeDateValue } from "./dates.js";
import { matchesMetricFilter, sortForView } from "./taskUtils.js";

const TASKS_PER_PAGE = 6;

export function resetAgendaFilters(filters) {
  filters.search.value = "";
  filters.status.value = "Todos";
  filters.difficulty.value = "Todas";
  filters.date.value = "";
  filters.sort.value = "priority";
}

export function getFilteredTasks(tasks, filters, metricFilter) {
  const query = filters.search.value.trim().toLowerCase();
  const status = filters.status.value;
  const difficulty = filters.difficulty.value;
  const date = filters.date.value;

  const filtered = tasks.filter((task) => {
    const matchesStatus = status === "Todos" || task.status === status;
    const matchesDifficulty = difficulty === "Todas" || task.difficulty === difficulty;
    const matchesDate = !date || normalizeDateValue(task.dueDate) === date;
    const checklistText = (task.checklist || []).map((item) => item.text).join(" ");
    const text = `${task.title} ${task.type} ${task.notes || ""} ${checklistText}`.toLowerCase();

    return matchesStatus && matchesDifficulty && matchesDate && matchesMetricFilter(task, metricFilter) && text.includes(query);
  });

  return sortForView(filtered, filters.sort.value);
}

export function getPaginatedTasks(items, currentPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / TASKS_PER_PAGE));
  const page = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (page - 1) * TASKS_PER_PAGE;

  return {
    items: items.slice(start, start + TASKS_PER_PAGE),
    page,
    totalPages,
  };
}

export function renderPagination(container, totalPages, currentPage) {
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `
      <button class="${page === currentPage ? "active" : ""}" type="button" data-page="${page}" aria-label="Pagina ${page}">
        ${page}
      </button>
    `;
  }).join("");
}

import { normalizeDateValue } from "./dates.js";
import { escapeHtml } from "./helpers.js";
import { getPriorityClass, getTaskStateClass, sortTasks } from "./taskUtils.js";

export function renderCalendars(elements, tasks, calendarMonth) {
  const today = new Date();
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthName = calendarMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  elements.calendarTitle.textContent = title;
  elements.agendaCalendarTitle.textContent = title;

  const miniCells = ["L", "M", "M", "J", "V", "S", "D"].map((day) => `<div class="calendar-weekday">${day}</div>`);
  const agendaCells = [...miniCells];

  for (let i = 0; i < offset; i += 1) {
    miniCells.push(`<div class="calendar-day muted-day"></div>`);
    agendaCells.push(`<div class="calendar-day muted-day"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTasks = sortTasks(tasks.filter((task) => normalizeDateValue(task.dueDate) === dateKey));
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const pending = dayTasks.filter((task) => task.status !== "Terminada").length;
    const done = dayTasks.length - pending;
    const taskDots = dayTasks.slice(0, 4);

    miniCells.push(renderMiniCalendarDay(day, dateKey, isToday, taskDots, dayTasks.length));
    agendaCells.push(renderAgendaCalendarDay(day, dateKey, isToday, dayTasks, pending, done));
  }

  elements.calendarGrid.innerHTML = miniCells.join("");
  elements.agendaCalendarGrid.innerHTML = agendaCells.join("");
}

function renderMiniCalendarDay(day, dateKey, isToday, taskDots, taskCount) {
  return `
    <button class="calendar-day ${isToday ? "today" : ""}" type="button" data-calendar-date="${dateKey}">
      <strong>${day}</strong>
      ${
        taskDots.length
          ? `<span class="mini-task-dots" aria-label="${taskCount} tareas">${taskDots
              .map((task) => `<i class="${getPriorityClass(task)} ${getTaskStateClass(task)}"></i>`)
              .join("")}</span>`
          : ""
      }
    </button>
  `;
}

function renderAgendaCalendarDay(day, dateKey, isToday, dayTasks, pending, done) {
  return `
    <div class="calendar-day agenda-day ${isToday ? "today" : ""} ${done && !pending ? "completed-day" : ""}" data-calendar-date="${dateKey}">
      <button class="day-number" type="button" data-calendar-date="${dateKey}">${day}</button>
      <div class="calendar-task-list">
        ${dayTasks
          .slice(0, 3)
          .map(
            (task) => `
              <button class="calendar-task ${getPriorityClass(task)} ${getTaskStateClass(task)}" type="button" data-calendar-task="${task.id}">
                ${escapeHtml(task.title)}
              </button>
            `
          )
          .join("")}
        ${dayTasks.length > 3 ? `<span class="calendar-more">+${dayTasks.length - 3}</span>` : ""}
      </div>
      ${(pending || done) ? `<small>${pending} pend. / ${done} hechas</small>` : ""}
    </div>
  `;
}

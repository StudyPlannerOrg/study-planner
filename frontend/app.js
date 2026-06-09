import { apiRequest as requestApiRaw, checkApiHealth } from "./js/api.js";
import { buildHugoReply, renderRecommendations as renderChatbotRecommendations } from "./js/chatbot.js";
import {
  addChecklistRow,
  handleChecklistDragEnd,
  handleChecklistDragOver,
  handleChecklistDragStart,
  handleChecklistDrop,
  readChecklist,
  renderChecklistEditor,
  updateChecklistProgress,
} from "./js/checklist.js";
import { STORAGE_KEY, TOKEN_KEY, USER_KEY } from "./js/config.js";
import { demoTasks } from "./js/demoTasks.js";
import { daysUntil, formatDate, normalizeDateValue, todayOffset } from "./js/dates.js";
import { escapeHtml, readJson } from "./js/helpers.js";
import {
  buildNotifications,
  renderNotifications as renderNotificationList,
  requestBrowserNotifications as requestNativeNotifications,
} from "./js/notifications.js";
import { calculatePriorityScore } from "./js/priority.js";
import { loadLocalTasks as loadStoredTasks, persistLocalTasks } from "./js/storage.js";
import {
  collectTaskForm,
  formatDateTime,
  formatProgress,
  formatTaskSubtitle,
  getChecklistProgress,
  getNextStatus,
  getPriorityClass,
  getTaskStateClass,
  matchesMetricFilter,
  normalizeTaskDates,
  renderChecklistPreview,
  sortForView,
  sortTasks,
} from "./js/taskUtils.js";

const landingPage = document.querySelector("#landing-page");
const authPage = document.querySelector("#auth-page");
const appShell = document.querySelector("#app-shell");
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const mobileMenu = document.querySelector("#mobile-menu");
const form = document.querySelector("#task-form");
const editTaskForm = document.querySelector("#edit-task-form");
const list = document.querySelector("#task-list");
const focusList = document.querySelector("#focus-list");
const recommendations = document.querySelector("#ai-recommendations");
const calendarTitle = document.querySelector("#calendar-title");
const calendarGrid = document.querySelector("#calendar-grid");
const agendaCalendarTitle = document.querySelector("#agenda-calendar-title");
const agendaCalendarGrid = document.querySelector("#agenda-calendar-grid");
const calendarPrev = document.querySelector("#calendar-prev");
const calendarNext = document.querySelector("#calendar-next");
const search = document.querySelector("#search");
const difficultyFilter = document.querySelector("#difficulty-filter");
const sortFilter = document.querySelector("#sort-filter");
const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authCopy = document.querySelector("#auth-copy");
const authSubmit = document.querySelector("#auth-submit");
const authSwitch = document.querySelector("#auth-switch");
const signOutButton = document.querySelector("#sign-out");
const storageStatus = document.querySelector("#storage-status");
const notificationToggle = document.querySelector("#notification-toggle");
const notificationPanel = document.querySelector("#notification-panel");
const notificationCount = document.querySelector("#notification-count");
const notificationList = document.querySelector("#notification-list");
const browserNotifications = document.querySelector("#browser-notifications");
const chatbotToggle = document.querySelector("#chatbot-toggle");
const chatbotPanel = document.querySelector("#chatbot-panel");
const chatbotClose = document.querySelector("#chatbot-close");
const chatbotForm = document.querySelector("#chatbot-form");
const chatbotInput = document.querySelector("#chatbot-input");
const taskChecklist = document.querySelector("#task-checklist");
const editChecklist = document.querySelector("#edit-checklist");
const editChecklistProgress = document.querySelector("#edit-checklist-progress");
const dayModal = document.querySelector("#day-modal");
const dayModalTitle = document.querySelector("#day-modal-title");
const dayModalTasks = document.querySelector("#day-modal-tasks");
const dayModalAdd = document.querySelector("#day-modal-add");
const dayModalClose = document.querySelector("#day-modal-close");

const SESSION_LAST_ACTIVITY_KEY = "studyplanner.lastActivity";
const BROWSER_NOTIFICATION_KEY = "studyplanner.browserNotificationsSent";
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_ACTIVITY_EVENTS = ["click", "keydown", "mousemove", "scroll", "touchstart"];

let tasks = [];
let token = localStorage.getItem(TOKEN_KEY);
let currentUser = readJson(USER_KEY);
let apiAvailable = false;
let authAction = "login";
let activeView = "dashboard";
let selectedTaskId = null;
let sessionTimer = null;
let metricFilter = "all";
let calendarMonth = new Date();
let selectedCalendarDate = "";
let modalMode = "day";
let chatMessages = [];

init();

document.querySelectorAll("[data-auth-action]").forEach((button) => {
  button.addEventListener("click", () => showAuth(button.dataset.authAction));
});

document.querySelectorAll("[data-go-home]").forEach((button) => {
  button.addEventListener("click", showLanding);
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-back], [data-cancel]").forEach((button) => {
  button.addEventListener("click", () => setView(activeView === "detail" ? "agenda" : "dashboard"));
});

authSwitch.addEventListener("click", () => {
  setAuthMode(authAction === "login" ? "register" : "login");
});

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  appShell.classList.toggle("sidebar-collapsed");
});

mobileMenu.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

chatbotToggle.addEventListener("click", () => {
  chatbotPanel.classList.toggle("hidden");
  if (!chatbotPanel.classList.contains("hidden")) chatbotInput.focus();
});

chatbotClose.addEventListener("click", () => {
  chatbotPanel.classList.add("hidden");
});

notificationToggle.addEventListener("click", () => {
  notificationPanel.classList.toggle("hidden");
});

browserNotifications.addEventListener("click", async () => {
  await requestBrowserNotifications();
});

chatbotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendHugoMessage(chatbotInput.value);
});

document.querySelectorAll("[data-chat-prompt]").forEach((button) => {
  button.addEventListener("click", () => sendHugoMessage(button.dataset.chatPrompt));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const task = collectTaskForm(form, taskChecklist, readChecklist);

  if (isCloudMode()) {
    const created = await requestApi("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
    if (created) tasks = sortTasks([...tasks, created]);
  } else {
    tasks = sortTasks([...tasks, { ...task, id: crypto.randomUUID() }]);
    persistLocal();
  }

  form.reset();
  form.dueDate.value = todayOffset(1);
  renderChecklistEditor(taskChecklist, []);
  render();
  setView("dashboard");
});

editTaskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedTaskId) return;

  const changes = collectTaskForm(editTaskForm, editChecklist, readChecklist);
  const currentTask = tasks.find((task) => task.id === selectedTaskId);

  if (currentTask && changes.status !== currentTask.status) {
    const confirmed = confirmAction(`Cambiar el estado de "${currentTask.title}" de ${currentTask.status} a ${changes.status}?`);
    if (!confirmed) changes.status = currentTask.status;
  }

  await updateTask(selectedTaskId, changes);
  render();
  setView("agenda");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!apiAvailable) {
    authCopy.textContent = "El backend no esta disponible. Revisa el deploy o intenta nuevamente.";
    return;
  }

  const data = new FormData(authForm);
  const response = await requestApi(`/api/auth/${authAction}`, {
    method: "POST",
    body: JSON.stringify({
      email: data.get("email").trim(),
      password: data.get("password"),
    }),
  });

  if (!response) return;

  token = response.token;
  currentUser = response.user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  refreshSessionActivity();
  startSessionTimer();
  authForm.reset();
  await loadCloudTasks();
  updateSessionUi();
  showApp();
  render();
});

signOutButton.addEventListener("click", () => {
  closeSession();
});

search.addEventListener("input", render);
difficultyFilter.addEventListener("change", render);
sortFilter.addEventListener("change", render);

document.querySelectorAll("[data-metric-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    openMetricModal(button.dataset.metricFilter);
  });
});

focusList.addEventListener("click", (event) => {
  const item = event.target.closest(".focus-item[data-id]");
  if (item) openTaskDetail(item.dataset.id);
});

focusList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const item = event.target.closest(".focus-item[data-id]");
  if (!item) return;
  event.preventDefault();
  openTaskDetail(item.dataset.id);
});

calendarPrev.addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
  render();
});

calendarNext.addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  render();
});

document.querySelectorAll("[data-checklist-add]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.checklistAdd === "edit" ? editChecklist : taskChecklist;
    addChecklistRow(target, {}, { withDoneToggle: target === editChecklist });
    updateEditChecklistProgress();
  });
});

document.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("button[data-checklist-remove]");
  if (removeButton) {
    removeButton.closest(".checklist-row")?.remove();
    updateEditChecklistProgress();
  }
});

editChecklist.addEventListener("change", updateEditChecklistProgress);

taskChecklist.addEventListener("dragstart", handleChecklistDragStart);
taskChecklist.addEventListener("dragover", handleChecklistDragOver);
taskChecklist.addEventListener("drop", handleChecklistDrop);
taskChecklist.addEventListener("dragend", handleChecklistDragEnd);
editChecklist.addEventListener("dragstart", handleChecklistDragStart);
editChecklist.addEventListener("dragover", handleChecklistDragOver);
editChecklist.addEventListener("drop", handleChecklistDrop);
editChecklist.addEventListener("dragend", handleChecklistDragEnd);

dayModalClose.addEventListener("click", closeDayModal);
dayModal.addEventListener("click", (event) => {
  if (event.target === dayModal) closeDayModal();
});

dayModalAdd.addEventListener("click", () => {
  if (modalMode === "metric") {
    metricFilter = dayModalAdd.dataset.metricFilter || "all";
    closeDayModal();
    setView("agenda");
    render();
    return;
  }

  form.reset();
  form.dueDate.value = selectedCalendarDate;
  renderChecklistEditor(taskChecklist, []);
  closeDayModal();
  setView("task");
});

dayModalTasks.addEventListener("click", (event) => {
  const button = event.target.closest("[data-modal-task]");
  if (!button) return;
  closeDayModal();
  openTaskDetail(button.dataset.modalTask);
});

notificationList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-notification-task]");
  if (!button) return;
  notificationPanel.classList.add("hidden");
  openTaskDetail(button.dataset.notificationTask);
});

[calendarGrid, agendaCalendarGrid].forEach((grid) => {
  grid.addEventListener("click", (event) => {
    const taskButton = event.target.closest("[data-calendar-task]");
    if (taskButton) {
      openTaskDetail(taskButton.dataset.calendarTask);
      return;
    }

    const day = event.target.closest("[data-calendar-date]");
    if (!day) return;
    openDayModal(day.dataset.calendarDate);
  });
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    const card = event.target.closest(".task-card[data-id]");
    if (card) openTaskDetail(card.dataset.id);
    return;
  }

  const { action, id } = button.dataset;
  if (action === "toggle-check") {
    await toggleChecklistItem(id, button.dataset.itemId, button.checked);
    render();
    return;
  }

  if (action === "status") {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const nextStatus = getNextStatus(task.status);
    if (confirmAction(`Cambiar el estado de "${task.title}" de ${task.status} a ${nextStatus}?`)) {
      await updateTask(id, { status: nextStatus });
    }
  }
  if (action === "delete" && confirmAction("Eliminar esta tarea? Esta accion no se puede deshacer.")) {
    await deleteTask(id);
  }

  render();
});

list.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".task-card[data-id]");
  if (!card) return;
  event.preventDefault();
  openTaskDetail(card.dataset.id);
});

async function init() {
  form.dueDate.value = todayOffset(1);
  renderChecklistEditor(taskChecklist, []);
  expireSessionIfNeeded();
  apiAvailable = await checkApiHealth();

  if (isCloudMode()) {
    await loadCloudTasks();
    if (isCloudMode()) {
      refreshSessionActivity();
      startSessionTimer();
      showApp();
      render();
    } else {
      loadLocalMode();
    }
  } else if (!apiAvailable) {
    loadLocalMode();
  } else {
    showLanding();
  }

  updateSessionUi();
}

function showLanding() {
  landingPage.classList.remove("hidden");
  authPage.classList.add("hidden");
  appShell.classList.add("hidden");
}

function showAuth(action) {
  setAuthMode(action);
  landingPage.classList.add("hidden");
  authPage.classList.remove("hidden");
  appShell.classList.add("hidden");
  authForm.email.focus();
}

function showApp() {
  landingPage.classList.add("hidden");
  authPage.classList.add("hidden");
  appShell.classList.remove("hidden");
  setView(activeView);
}

function confirmAction(message) {
  return window.confirm(message);
}

function openTaskDetail(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  selectedTaskId = id;
  editTaskForm.title.value = task.title;
  editTaskForm.type.value = task.type;
  editTaskForm.dueDate.value = normalizeDateValue(task.dueDate);
  editTaskForm.dueTime.value = task.dueTime || "";
  editTaskForm.notes.value = task.notes || "";
  editTaskForm.difficulty.value = task.difficulty;
  editTaskForm.status.value = task.status;
  renderChecklistEditor(editChecklist, task.checklist || [], { withDoneToggle: true });
  updateEditChecklistProgress();
  setView("detail");
}

function setAuthMode(action) {
  authAction = action;
  const isRegister = action === "register";
  authTitle.textContent = isRegister ? "Crea tu cuenta" : "Ingresa a tu planner";
  authCopy.textContent = isRegister
    ? "Registrate para guardar tus tareas, prioridades y progreso."
    : "Ingresa con tu cuenta para continuar al panel.";
  authSubmit.textContent = isRegister ? "Crear cuenta" : "Ingresar";
  authSwitch.textContent = isRegister ? "Ya tengo cuenta" : "Crear cuenta";
}

function setView(view) {
  activeView = view;
  document.querySelectorAll(".view-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `view-${view}`);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  sidebar.classList.remove("open");
}

function updateSessionUi() {
  if (!apiAvailable) {
    authCopy.textContent = "El backend no esta disponible. Podes usar el modo local en este dispositivo.";
    storageStatus.textContent = "Modo local activo";
    return;
  }

  if (!token || !currentUser) {
    storageStatus.textContent = "Servicio listo";
    return;
  }

  storageStatus.textContent = "Cuenta activa";
}

function isCloudMode() {
  return Boolean(apiAvailable && token && currentUser);
}

function loadLocalMode() {
  tasks = loadLocalTasks();
  currentUser = null;
  token = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  showApp();
  render();
}

function closeSession(message = "") {
  token = null;
  currentUser = null;
  tasks = [];
  stopSessionTimer();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  if (message) authCopy.textContent = message;
  updateSessionUi();
  showLanding();
}

function refreshSessionActivity() {
  if (!token || !currentUser) return;
  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(Date.now()));
}

function expireSessionIfNeeded() {
  if (!token || !currentUser) return false;
  const lastActivity = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY));
  if (!lastActivity) {
    refreshSessionActivity();
    return false;
  }
  if (lastActivity && Date.now() - lastActivity <= SESSION_TIMEOUT_MS) return false;
  closeSession("La sesion se cerro por inactividad. Volve a ingresar.");
  return true;
}

function startSessionTimer() {
  stopSessionTimer();
  SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, refreshSessionActivity, { passive: true });
  });
  sessionTimer = window.setInterval(() => {
    if (expireSessionIfNeeded()) render();
  }, 30 * 1000);
}

function stopSessionTimer() {
  SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
    window.removeEventListener(eventName, refreshSessionActivity);
  });
  if (sessionTimer) window.clearInterval(sessionTimer);
  sessionTimer = null;
}

function loadLocalTasks() {
  return loadStoredTasks(STORAGE_KEY, demoTasks, sortTasks);
}

function persistLocal() {
  persistLocalTasks(STORAGE_KEY, tasks);
}

function updateEditChecklistProgress() {
  updateChecklistProgress(editChecklist, editChecklistProgress);
}

function openDayModal(date) {
  modalMode = "day";
  selectedCalendarDate = date;
  const dayTasks = sortTasks(tasks.filter((task) => normalizeDateValue(task.dueDate) === date));
  dayModalTitle.textContent = formatDate(date);
  dayModalAdd.textContent = "Agregar tarea en este dia";
  dayModalAdd.dataset.metricFilter = "";
  dayModalTasks.innerHTML = dayTasks.length
    ? dayTasks
        .map(
          (task) => `
            <button class="modal-task ${getPriorityClass(task)} ${getTaskStateClass(task)}" type="button" data-modal-task="${task.id}">
              <strong>${escapeHtml(task.title)}</strong>
              <span>${escapeHtml(task.type)} - ${task.status}</span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty">No hay tareas para este dia.</div>`;
  dayModal.classList.remove("hidden");
}

function openMetricModal(filter) {
  modalMode = "metric";
  const labels = {
    active: "Tareas activas",
    urgent: "Tareas urgentes",
    week: "Vencen esta semana",
    pending: "Tareas pendientes",
  };
  const previousFilter = metricFilter;
  metricFilter = filter;
  const metricTasks = getFilteredTasks();
  metricFilter = previousFilter;
  dayModalTitle.textContent = labels[filter] || "Tareas";
  dayModalAdd.textContent = "Ver en agenda";
  dayModalAdd.dataset.metricFilter = filter;
  dayModalTasks.innerHTML = metricTasks.length
    ? metricTasks
        .slice(0, 6)
        .map(
          (task) => `
            <button class="modal-task ${getPriorityClass(task)} ${getTaskStateClass(task)}" type="button" data-modal-task="${task.id}">
              <strong>${escapeHtml(task.title)}</strong>
              <span>${formatDate(task.dueDate)} - ${task.status}</span>
            </button>
          `
        )
        .join("")
    : `<div class="empty-state compact-empty">No hay tareas en este grupo.</div>`;
  dayModal.classList.remove("hidden");
}

function closeDayModal() {
  dayModal.classList.add("hidden");
}

function getCurrentNotifications() {
  return buildNotifications(tasks, getChecklistProgress);
}

function renderNotifications() {
  renderNotificationList({ count: notificationCount, list: notificationList }, getCurrentNotifications());
}

async function requestBrowserNotifications() {
  await requestNativeNotifications(browserNotifications, getCurrentNotifications(), BROWSER_NOTIFICATION_KEY);
}

function sendHugoMessage(text) {
  const message = String(text || "").trim();
  if (!message) return;

  chatMessages.push({ from: "user", text: message });
  chatMessages.push({ from: "bot", text: buildHugoReply(message, tasks, { formatProgress, sortTasks }) });
  chatMessages = chatMessages.slice(-10);
  chatbotInput.value = "";
  renderRecommendations();
}

async function loadCloudTasks() {
  const data = await requestApi("/api/tasks");
  if (data) tasks = sortTasks(data.map(normalizeTaskDates));
}

async function toggleChecklistItem(taskId, itemId, done) {
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;

  const checklist = (task.checklist || []).map((item) => (item.id === itemId ? { ...item, done } : item));
  const allDone = checklist.length && checklist.every((item) => item.done);
  const status = allDone
    ? confirmAction("Completaste todas las subtareas. Queres marcar la tarea como terminada?")
      ? "Terminada"
      : task.status
    : task.status === "Terminada"
      ? "En progreso"
      : task.status;
  await updateTask(taskId, { checklist, status });
}

async function updateTask(id, changes) {
  if (isCloudMode()) {
    const updated = await requestApi(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    if (updated) tasks = tasks.map((task) => (task.id === id ? normalizeTaskDates(updated) : task));
    return;
  }

  tasks = tasks.map((task) => (task.id === id ? { ...task, ...changes } : task));
  persistLocal();
}

async function deleteTask(id) {
  if (isCloudMode()) {
    const deleted = await requestApi(`/api/tasks/${id}`, { method: "DELETE" });
    if (deleted !== null) tasks = tasks.filter((task) => task.id !== id);
    return;
  }

  tasks = tasks.filter((task) => task.id !== id);
  persistLocal();
}


function requestApi(path, options = {}) {
  return requestApiRaw(path, options, {
    token,
    onError: (message) => {
      authCopy.textContent = message;
    },
    onAuthError: () => signOutButton.click(),
  });
}

function render() {
  renderMetrics();
  renderNotifications();
  renderCalendars();
  renderFocus();
  renderTasks(getFilteredTasks());
  renderRecommendations();
}

function getFilteredTasks() {
  const query = search.value.trim().toLowerCase();
  const difficulty = difficultyFilter.value;

  const filtered = tasks.filter((task) => {
    const matchesDifficulty = difficulty === "Todas" || task.difficulty === difficulty;
    const checklistText = (task.checklist || []).map((item) => item.text).join(" ");
    const text = `${task.title} ${task.type} ${task.notes || ""} ${checklistText}`.toLowerCase();
    return matchesDifficulty && matchesMetricFilter(task, metricFilter) && text.includes(query);
  });

  return sortForView(filtered, sortFilter.value);
}

function renderMetrics() {
  const active = tasks.filter((task) => task.status !== "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);
  const pending = tasks.filter((task) => task.status === "Pendiente");

  document.querySelector("#metric-total").textContent = active.length;
  document.querySelector("#metric-urgent").textContent = urgent.length;
  document.querySelector("#metric-week").textContent = week.length;
  document.querySelector("#metric-pending").textContent = pending.length;
}

function renderCalendars() {
  const today = new Date();
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthName = calendarMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  calendarTitle.textContent = title;
  agendaCalendarTitle.textContent = title;

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

    miniCells.push(`
      <button class="calendar-day ${isToday ? "today" : ""}" type="button" data-calendar-date="${dateKey}">
        <strong>${day}</strong>
        ${
          taskDots.length
            ? `<span class="mini-task-dots" aria-label="${dayTasks.length} tareas">${taskDots
                .map((task) => `<i class="${getPriorityClass(task)} ${getTaskStateClass(task)}"></i>`)
                .join("")}</span>`
            : ""
        }
      </button>
    `);

    agendaCells.push(`
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
    `);
  }

  calendarGrid.innerHTML = miniCells.join("");
  agendaCalendarGrid.innerHTML = agendaCells.join("");
}

function renderFocus() {
  const active = sortTasks(tasks.filter((task) => task.status !== "Terminada")).slice(0, 3);

  if (!active.length) {
    focusList.innerHTML = `<div class="empty-state">No hay tareas activas. Crea una para empezar.</div>`;
    return;
  }

  focusList.innerHTML = active
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

function renderTasks(items) {
  if (!items.length) {
    list.innerHTML = `<div class="empty-state">No hay tareas para los filtros seleccionados.</div>`;
    return;
  }

  list.innerHTML = items
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
          <div class="task-actions">
            <span>Dificultad: ${task.difficulty}</span>
            <button class="status-button" data-action="status" data-id="${task.id}">Estado: ${task.status}</button>
          </div>
          <button class="small-button danger-button task-delete" data-action="delete" data-id="${task.id}">Eliminar</button>
        </article>
      `;
    })
    .join("");
}

function renderRecommendations() {
  renderChatbotRecommendations(recommendations, tasks, chatMessages, { formatProgress });
}

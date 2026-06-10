import { apiRequest as requestApiRaw, askHugoAi, checkApiHealth } from "./js/api.js";
import { getFilteredTasks as filterAgendaTasks, getPaginatedTasks, renderPagination, resetAgendaFilters } from "./js/agenda.js";
import { renderCalendars as renderCalendarViews } from "./js/calendar.js";
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
import { CHAT_KEY, STORAGE_KEY, TOKEN_KEY, USER_KEY } from "./js/config.js";
import { renderFocus as renderDashboardFocus, renderMetrics as renderDashboardMetrics } from "./js/dashboard.js";
import { demoTasks } from "./js/demoTasks.js";
import { normalizeDateValue, todayOffset } from "./js/dates.js";
import { readJson } from "./js/helpers.js";
import {
  clearChatHistory as removeChatHistory,
  getChatStorageKey,
  loadChatHistory as readChatHistory,
  persistChatHistory as saveChatHistory,
} from "./js/chatHistory.js";
import { createHugoActionHandler } from "./js/hugoActions.js";
import { prepareDayModal, prepareMetricModal } from "./js/modals.js";
import {
  buildNotifications,
  renderNotifications as renderNotificationList,
  requestBrowserNotifications as requestNativeNotifications,
} from "./js/notifications.js";
import { loadLocalTasks as loadStoredTasks, persistLocalTasks } from "./js/storage.js";
import { renderTaskCards } from "./js/taskCards.js";
import {
  collectTaskForm,
  formatProgress,
  getChecklistProgress,
  getNextStatus,
  normalizeTaskDates,
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
const statusFilter = document.querySelector("#status-filter");
const difficultyFilter = document.querySelector("#difficulty-filter");
const dateFilter = document.querySelector("#date-filter");
const sortFilter = document.querySelector("#sort-filter");
const clearFilters = document.querySelector("#clear-filters");
const pagination = document.querySelector("#pagination");
const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authCopy = document.querySelector("#auth-copy");
const authSubmit = document.querySelector("#auth-submit");
const authSwitch = document.querySelector("#auth-switch");
const authNameField = document.querySelector("#auth-name-field");
const dashboardGreeting = document.querySelector("#dashboard-greeting");
const signOutButton = document.querySelector("#sign-out");
const storageStatus = document.querySelector("#storage-status");
const notificationToggle = document.querySelector("#notification-toggle");
const notificationPanel = document.querySelector("#notification-panel");
const notificationCount = document.querySelector("#notification-count");
const notificationList = document.querySelector("#notification-list");
const browserNotifications = document.querySelector("#browser-notifications");
const chatbotToggle = document.querySelector("#chatbot-toggle");
const chatbotPanel = document.querySelector("#chatbot-panel");
const chatbotResize = document.querySelector("#chatbot-resize");
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

const agendaFilters = {
  search,
  status: statusFilter,
  difficulty: difficultyFilter,
  date: dateFilter,
  sort: sortFilter,
};

const calendarElements = {
  calendarTitle,
  calendarGrid,
  agendaCalendarTitle,
  agendaCalendarGrid,
};

const metricElements = {
  total: document.querySelector("#metric-total"),
  urgent: document.querySelector("#metric-urgent"),
  week: document.querySelector("#metric-week"),
  pending: document.querySelector("#metric-pending"),
};

const modalElements = {
  title: dayModalTitle,
  tasks: dayModalTasks,
  addButton: dayModalAdd,
};

const SESSION_LAST_ACTIVITY_KEY = "studyplanner.lastActivity";
const BROWSER_NOTIFICATION_KEY = "studyplanner.browserNotificationsSent";
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const CHAT_TIMEOUT_MS = 10 * 60 * 1000;
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
let currentPage = 1;
let calendarMonth = new Date();
let selectedCalendarDate = "";
let modalMode = "day";
let chatMessages = [];
let notificationsViewed = false;
let notificationSignature = "";

const executeHugoAction = createHugoActionHandler({
  form,
  taskChecklist,
  openTaskDetail,
  renderChecklistEditor,
  setView,
  todayOffset,
});

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

chatbotResize.addEventListener("click", () => {
  const expanded = chatbotPanel.classList.toggle("expanded");
  chatbotResize.setAttribute("aria-label", expanded ? "Reducir chat" : "Ampliar chat");
  chatbotInput.focus();
});

notificationToggle.addEventListener("click", () => {
  const willOpen = notificationPanel.classList.contains("hidden");
  notificationPanel.classList.toggle("hidden");
  if (willOpen) {
    notificationsViewed = true;
    renderNotifications();
  }
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
  const payload = {
    email: data.get("email").trim(),
    password: data.get("password"),
  };
  if (authAction === "register") payload.name = data.get("name").trim();

  const response = await requestApi(`/api/auth/${authAction}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response) return;

  token = response.token;
  currentUser = response.user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
  loadChatHistory();
  refreshSessionActivity();
  startSessionTimer();
  authForm.reset();
  await loadCloudTasks();
  updateSessionUi();
  showApp();
  render();
});

document.addEventListener(
  "click",
  (event) => {
    if (!event.target.closest("#sign-out")) return;
    event.preventDefault();
    event.stopPropagation();
    closeSession("", { reload: true });
  },
  true
);

search.addEventListener("input", () => {
  currentPage = 1;
  render();
});
difficultyFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
statusFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
dateFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
sortFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
clearFilters.addEventListener("click", () => {
  resetAgendaFilters(agendaFilters);
  metricFilter = "all";
  currentPage = 1;
  render();
});

pagination.addEventListener("click", (event) => {
  const button = event.target.closest("[data-page]");
  if (!button) return;
  currentPage = Number(button.dataset.page);
  render();
});

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
    currentPage = 1;
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
  loadChatHistory();
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
  loadChatHistory();
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
  authNameField.classList.toggle("hidden", !isRegister);
  authForm.elements.name.required = isRegister;
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
  notificationPanel.classList.add("hidden");
  syncViewChrome();
}

function updateSessionUi() {
  if (!apiAvailable) {
    authCopy.textContent = "El backend no esta disponible. Podes usar el modo local en este dispositivo.";
    storageStatus.textContent = "Modo local activo";
    return;
  }

  if (!token || !currentUser) {
    storageStatus.textContent = "Servicio listo";
    dashboardGreeting.textContent = "Hola, organicemos lo importante";
    return;
  }

  storageStatus.textContent = "Cuenta activa";
  dashboardGreeting.textContent = `Hola, ${getUserDisplayName()}!`;
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
  loadChatHistory();
  showApp();
  render();
}

function closeSession(message = "", options = {}) {
  const chatKey = getChatStorageKey(CHAT_KEY, currentUser);
  token = null;
  currentUser = null;
  tasks = [];
  chatMessages = [];
  activeView = "dashboard";
  selectedTaskId = null;
  currentPage = 1;
  stopSessionTimer();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_LAST_ACTIVITY_KEY);
  removeChatHistory(chatKey);
  notificationPanel.classList.add("hidden");
  chatbotPanel.classList.add("hidden");
  closeDayModal();
  if (message) authCopy.textContent = message;
  updateSessionUi();
  render();
  showLanding();
  if (options.reload) window.location.replace("/");
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
  prepareDayModal(modalElements, tasks, date);
  dayModal.classList.remove("hidden");
}

function openMetricModal(filter) {
  modalMode = "metric";
  const previousFilter = metricFilter;
  metricFilter = filter;
  const metricTasks = filterAgendaTasks(tasks, agendaFilters, metricFilter);
  metricFilter = previousFilter;
  prepareMetricModal(modalElements, metricTasks, filter);
  dayModal.classList.remove("hidden");
}

function closeDayModal() {
  dayModal.classList.add("hidden");
}

function getCurrentNotifications() {
  return buildNotifications(tasks, getChecklistProgress);
}

function renderNotifications() {
  const notifications = getCurrentNotifications();
  const nextSignature = notifications.map((item) => item.id).join("|");
  if (nextSignature !== notificationSignature) {
    notificationSignature = nextSignature;
    notificationsViewed = false;
  }
  renderNotificationList({ count: notificationCount, list: notificationList }, notifications, { viewed: notificationsViewed });
}

async function requestBrowserNotifications() {
  await requestNativeNotifications(browserNotifications, getCurrentNotifications(), BROWSER_NOTIFICATION_KEY);
}

async function sendHugoMessage(text) {
  const message = String(text || "").trim();
  if (!message) return;

  chatMessages.push({ from: "user", text: message });
  const thinkingId = crypto.randomUUID();
  chatMessages.push({ from: "bot", text: "Hugo esta pensando", thinking: true, id: thinkingId });
  chatMessages = chatMessages.slice(-10);
  chatbotInput.value = "";
  renderRecommendations();

  const localAction = executeHugoAction(message, tasks);
  const localReply = buildHugoReply(message, tasks, { formatProgress, sortTasks });
  let reply = localAction?.reply || localReply;
  let source = "local";

  if (!localAction && isCloudMode()) {
    const aiReply = await askHugoAi(message, tasks, {
      token,
      onAuthError: () => closeSession("La sesion vencio. Volve a ingresar."),
    });
    if (aiReply?.reply) {
      reply = aiReply.reply;
      source = aiReply.source || "ia";
    }
  }

  chatMessages = chatMessages.map((item) => (item.id === thinkingId ? { from: "bot", text: reply, source } : item)).slice(-10);
  persistChatHistory();
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
    onAuthError: () => closeSession("La sesion vencio. Volve a ingresar."),
  });
}

function render() {
  renderMetrics();
  renderNotifications();
  renderCalendars();
  renderFocus();
  const filteredTasks = filterAgendaTasks(tasks, agendaFilters, metricFilter);
  const paginated = getPaginatedTasks(filteredTasks, currentPage);
  currentPage = paginated.page;
  renderTaskCards(list, paginated.items);
  renderPagination(pagination, paginated.totalPages, currentPage);
  renderRecommendations();
}

function renderMetrics() {
  renderDashboardMetrics(tasks, metricElements);
}

function renderCalendars() {
  renderCalendarViews(calendarElements, tasks, calendarMonth);
}

function renderFocus() {
  renderDashboardFocus(focusList, tasks);
}

function renderRecommendations() {
  renderChatbotRecommendations(recommendations, tasks, chatMessages, { formatProgress });
}

function syncViewChrome() {
  const isDashboard = activeView === "dashboard";
  document.querySelector("#dashboard").classList.toggle("hidden", !isDashboard);
  if (!isDashboard) {
    sidebar.classList.add("collapsed");
    appShell.classList.add("sidebar-collapsed");
    return;
  }

  sidebar.classList.remove("collapsed");
  appShell.classList.remove("sidebar-collapsed");
}

function getUserDisplayName() {
  const name = String(currentUser?.name || "").trim();
  if (name) return name.split(" ")[0];
  const emailName = String(currentUser?.email || "").split("@")[0];
  return emailName || "organicemos lo importante";
}

function loadChatHistory() {
  chatMessages = readChatHistory(CHAT_KEY, currentUser, CHAT_TIMEOUT_MS, readJson, removeChatHistory);
}

function persistChatHistory() {
  saveChatHistory(CHAT_KEY, currentUser, chatMessages);
}

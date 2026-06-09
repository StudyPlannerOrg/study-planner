import { STORAGE_KEY, TOKEN_KEY, USER_KEY } from "./js/config.js";
import { demoTasks } from "./js/demoTasks.js";
import { daysUntil, formatDate, normalizeDateValue, todayOffset } from "./js/dates.js";
import { escapeHtml, readJson } from "./js/helpers.js";
import { calculatePriorityScore, explainPriority } from "./js/priority.js";

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
  const task = collectTaskForm(form, taskChecklist);

  if (isCloudMode()) {
    const created = await apiRequest("/api/tasks", {
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

  const changes = collectTaskForm(editTaskForm, editChecklist);
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
  const response = await apiRequest(`/api/auth/${authAction}`, {
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
    addChecklistRow(target);
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

async function checkApiHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    return Boolean(data.ok && data.database);
  } catch {
    return false;
  }
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
  renderChecklistEditor(editChecklist, task.checklist || []);
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
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return sortTasks([...demoTasks]);

  try {
    return sortTasks(JSON.parse(saved));
  } catch {
    return sortTasks([...demoTasks]);
  }
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function collectTaskForm(formElement, checklistElement) {
  const data = new FormData(formElement);
  const hours = Number(data.get("hours"));

  return {
    title: data.get("title").trim(),
    subject: "",
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

function addChecklistRow(container, item = {}) {
  const isEdit = container === editChecklist;
  const row = document.createElement("div");
  row.className = "checklist-row";
  row.draggable = true;
  row.dataset.itemId = item.id || crypto.randomUUID();
  row.innerHTML = `
    ${
      isEdit
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

function renderChecklistEditor(container, checklist) {
  container.innerHTML = "";
  checklist.forEach((item) => addChecklistRow(container, item));
}

function readChecklist(container) {
  return [...container.querySelectorAll(".checklist-row")]
    .map((row) => ({
      id: row.dataset.itemId || crypto.randomUUID(),
      text: row.querySelector('input[type="text"]').value.trim(),
      done: Boolean(row.querySelector('input[type="checkbox"]')?.checked),
    }))
    .filter((item) => item.text);
}

function updateEditChecklistProgress() {
  const checklist = readChecklist(editChecklist);
  const done = checklist.filter((item) => item.done).length;
  editChecklistProgress.textContent = `${done}/${checklist.length}`;
}

function handleChecklistDragStart(event) {
  const row = event.target.closest(".checklist-row");
  if (!row) return;
  event.dataTransfer.setData("text/plain", row.dataset.itemId);
  row.classList.add("dragging");
}

function handleChecklistDragOver(event) {
  event.preventDefault();
  const row = event.target.closest(".checklist-row");
  const dragging = event.currentTarget.querySelector(".dragging");
  if (!row || !dragging || row === dragging) return;
  const before = event.clientY < row.getBoundingClientRect().top + row.offsetHeight / 2;
  event.currentTarget.insertBefore(dragging, before ? row : row.nextSibling);
}

function handleChecklistDrop(event) {
  event.preventDefault();
  handleChecklistDragEnd(event);
}

function handleChecklistDragEnd(event) {
  event.currentTarget.querySelector(".dragging")?.classList.remove("dragging");
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

function buildNotifications() {
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

function renderNotifications() {
  const notifications = buildNotifications();
  notificationCount.textContent = String(notifications.length);
  notificationCount.classList.toggle("empty", !notifications.length);

  notificationList.innerHTML = notifications.length
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

async function requestBrowserNotifications() {
  if (!("Notification" in window)) {
    browserNotifications.textContent = "No disponible";
    return;
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    browserNotifications.textContent = "Permiso denegado";
    return;
  }

  const sent = readJson(BROWSER_NOTIFICATION_KEY) || {};
  const todayKey = normalizeDateValue(new Date());
  const notifications = buildNotifications().filter((item) => item.tone !== "info").slice(0, 4);

  notifications.forEach((item) => {
    const sentKey = `${todayKey}-${item.id}`;
    if (sent[sentKey]) return;
    new Notification("Study Planner", { body: `${item.title}. ${item.body}` });
    sent[sentKey] = true;
  });

  localStorage.setItem(BROWSER_NOTIFICATION_KEY, JSON.stringify(sent));
  browserNotifications.textContent = notifications.length ? "Alertas activas" : "Sin alertas";
}

function sendHugoMessage(text) {
  const message = String(text || "").trim();
  if (!message) return;

  chatMessages.push({ from: "user", text: message });
  chatMessages.push({ from: "bot", text: buildHugoReply(message) });
  chatMessages = chatMessages.slice(-10);
  chatbotInput.value = "";
  renderRecommendations();
}

function buildHugoReply(message) {
  const normalized = message.toLowerCase();
  const active = sortTasks(tasks.filter((task) => task.status !== "Terminada"));
  const completed = tasks.filter((task) => task.status === "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);

  if (!tasks.length) return "Todavia no hay tareas cargadas. Crea una actividad y te ayudo a priorizarla.";

  if (normalized.includes("hola") || normalized.includes("buen")) {
    return `Hola. Tenes ${active.length} tareas activas y ${completed.length} terminadas. Puedo ayudarte con prioridades, vencimientos o progreso.`;
  }

  if (normalized.includes("primero") || normalized.includes("prioridad") || normalized.includes("urgente")) {
    if (!active.length) return "No tenes tareas activas. Lo que aparece terminado queda tachado y al fondo.";
    const task = active[0];
    return `Yo empezaria por "${task.title}". Vence el ${formatDate(task.dueDate)}, dificultad ${task.difficulty}, progreso ${formatProgress(task)}. ${explainPriority(task)}`;
  }

  if (normalized.includes("semana") || normalized.includes("vence") || normalized.includes("fecha")) {
    if (!week.length) return "No veo tareas activas que venzan esta semana.";
    return `Esta semana tenes: ${week.slice(0, 4).map((task) => `"${task.title}" (${formatDate(task.dueDate)})`).join(", ")}.`;
  }

  if (normalized.includes("progreso") || normalized.includes("voy") || normalized.includes("avance")) {
    const total = tasks.length;
    const percent = total ? Math.round((completed.length / total) * 100) : 0;
    return `Vas con ${completed.length}/${total} tareas terminadas (${percent}%). Pendientes: ${active.length}.`;
  }

  if (normalized.includes("plan") || normalized.includes("organiza") || normalized.includes("estudi")) {
    if (!active.length) return "Tu agenda activa esta libre. Podrias revisar tareas terminadas o cargar la proxima entrega.";
    return `Plan corto: 1) trabaja en "${active[0].title}", 2) revisa subtareas incompletas, 3) deja preparada la siguiente entrega: ${active[1] ? `"${active[1].title}"` : "no hay otra tarea activa"}.`;
  }

  if (urgent.length) return `Detecte ${urgent.length} tarea(s) urgente(s). La primera es "${urgent[0].title}", con entrega ${formatDate(urgent[0].dueDate)}.`;
  return "Puedo responder sobre que hacer primero, que vence esta semana, como vas de progreso o ayudarte a armar un plan.";
}

async function loadCloudTasks() {
  const data = await apiRequest("/api/tasks");
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
    const updated = await apiRequest(`/api/tasks/${id}`, {
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
    const deleted = await apiRequest(`/api/tasks/${id}`, { method: "DELETE" });
    if (deleted !== null) tasks = tasks.filter((task) => task.id !== id);
    return;
  }

  tasks = tasks.filter((task) => task.id !== id);
  persistLocal();
}

async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (response.status === 204) return {};

    const data = await response.json();
    if (!response.ok) {
      authCopy.textContent = data.message || "Ocurrio un error en la API.";
      if (response.status === 401) signOutButton.click();
      return null;
    }

    return data;
  } catch {
    authCopy.textContent = "No se pudo conectar con el backend.";
    return null;
  }
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
    return matchesDifficulty && matchesMetricFilter(task) && text.includes(query);
  });

  return sortForView(filtered);
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
  if (chatMessages.length) {
    recommendations.innerHTML = chatMessages
      .map(
        (message) => `
          <div class="chat-message ${message.from}">
            <span>${escapeHtml(message.text)}</span>
          </div>
        `
      )
      .join("");
    recommendations.scrollTop = recommendations.scrollHeight;
    return;
  }

  const active = tasks.filter((task) => task.status !== "Terminada");
  const ranked = active
    .map((task) => ({
      task,
      score: calculatePriorityScore(task),
      reason: explainPriority(task),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!ranked.length) {
    recommendations.innerHTML = `<div class="chat-message bot"><span>Soy Hugo. Crea una tarea y te ayudo a priorizarla.</span></div>`;
    return;
  }

  recommendations.innerHTML = ranked
    .map(
      ({ task, reason }) => `
        <div class="chat-message bot">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${reason}</span>
          <small>Progreso: ${formatProgress(task)}</small>
        </div>
      `
    )
    .join("");
}

function sortTasks(items) {
  return items.map(normalizeTaskDates).sort((a, b) => {
    const byDone = compareCompleted(a, b);
    if (byDone !== 0) return byDone;
    const byScore = calculatePriorityScore(b) - calculatePriorityScore(a);
    if (byScore !== 0) return byScore;
    return normalizeDateValue(a.dueDate).localeCompare(normalizeDateValue(b.dueDate));
  });
}

function normalizeTaskDates(task) {
  return {
    ...task,
    dueDate: normalizeDateValue(task.dueDate),
    dueTime: task.dueTime || "",
    hours: Number(task.hours) > 0 ? Number(task.hours) : null,
    subject: task.subject || "",
    notes: task.notes || "",
    checklist: Array.isArray(task.checklist) ? task.checklist : [],
  };
}

function sortForView(items) {
  const sorted = [...items];
  const difficultyOrder = { Alta: 0, Media: 1, Baja: 2 };

  if (sortFilter.value === "dueDate") {
    return sorted.sort((a, b) => compareCompleted(a, b) || normalizeDateValue(a.dueDate).localeCompare(normalizeDateValue(b.dueDate)));
  }

  if (sortFilter.value === "difficulty") {
    return sorted.sort((a, b) => compareCompleted(a, b) || difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] || calculatePriorityScore(b) - calculatePriorityScore(a));
  }

  if (sortFilter.value === "progress") {
    return sorted.sort((a, b) => compareCompleted(a, b) || getChecklistProgress(b).percent - getChecklistProgress(a).percent || calculatePriorityScore(b) - calculatePriorityScore(a));
  }

  return sortTasks(sorted);
}

function formatTaskSubtitle(task) {
  return [formatDateTime(task), task.type].filter(Boolean).map(escapeHtml).join(" - ");
}

function formatDateTime(task) {
  return `${formatDate(task.dueDate)}${task.dueTime ? ` ${task.dueTime}` : ""}`;
}

function getPriorityClass(task) {
  const score = calculatePriorityScore(task);
  if (score >= 75) return "Urgente";
  if (score >= 45) return "Alta";
  return "Normal";
}

function getTaskStateClass(task) {
  return task.status === "Terminada" ? "is-completed" : "";
}

function getNextStatus(status) {
  if (status === "Pendiente") return "En progreso";
  if (status === "En progreso") return "Terminada";
  return "Pendiente";
}

function compareCompleted(a, b) {
  return Number(a.status === "Terminada") - Number(b.status === "Terminada");
}

function formatProgress(task) {
  const progress = getChecklistProgress(task);
  if (progress.total) return `${progress.percent}%`;
  if (task.status === "Terminada") return "100%";
  if (task.status === "En progreso") return "50%";
  return "0%";
}

function matchesMetricFilter(task) {
  if (metricFilter === "active") return task.status !== "Terminada";
  if (metricFilter === "urgent") return task.status !== "Terminada" && calculatePriorityScore(task) >= 75;
  if (metricFilter === "week") return task.status !== "Terminada" && daysUntil(task.dueDate) <= 7;
  if (metricFilter === "pending") return task.status === "Pendiente";
  return true;
}

function getChecklistProgress(task) {
  const checklist = task.checklist || [];
  const done = checklist.filter((item) => item.done).length;
  return {
    done,
    total: checklist.length,
    percent: checklist.length ? Math.round((done / checklist.length) * 100) : 0,
  };
}

function renderChecklistPreview(task) {
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

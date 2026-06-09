import { STORAGE_KEY, TOKEN_KEY, USER_KEY } from "./js/config.js";
import { demoTasks } from "./js/demoTasks.js";
import { daysUntil, formatDate, normalizeDateValue, todayOffset } from "./js/dates.js";
import { escapeHtml, readJson } from "./js/helpers.js";
import { calculatePriorityScore, explainPriority, explainScore } from "./js/priority.js";

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
const chatbotToggle = document.querySelector("#chatbot-toggle");
const chatbotPanel = document.querySelector("#chatbot-panel");
const chatbotClose = document.querySelector("#chatbot-close");
const taskChecklist = document.querySelector("#task-checklist");
const editChecklist = document.querySelector("#edit-checklist");
const editChecklistProgress = document.querySelector("#edit-checklist-progress");

const SESSION_LAST_ACTIVITY_KEY = "studyplanner.lastActivity";
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
});

chatbotClose.addEventListener("click", () => {
  chatbotPanel.classList.add("hidden");
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

  if (action === "progress" && confirmAction("Marcar esta tarea como en progreso?")) {
    await updateTask(id, { status: "En progreso" });
  }
  if (action === "done" && confirmAction("Marcar esta tarea como terminada?")) {
    await updateTask(id, { status: "Terminada" });
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
  editTaskForm.subject.value = task.subject || "";
  editTaskForm.type.value = task.type;
  editTaskForm.dueDate.value = normalizeDateValue(task.dueDate);
  editTaskForm.hours.value = task.hours || "";
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
    subject: String(data.get("subject") || "").trim(),
    type: data.get("type"),
    dueDate: data.get("dueDate"),
    hours: hours > 0 ? hours : null,
    notes: String(data.get("notes") || "").trim(),
    checklist: readChecklist(checklistElement),
    difficulty: data.get("difficulty"),
    status: data.get("status"),
  };
}

function addChecklistRow(container, item = {}) {
  const row = document.createElement("div");
  row.className = "checklist-row";
  row.dataset.itemId = item.id || crypto.randomUUID();
  row.innerHTML = `
    <label class="checklist-toggle">
      <input type="checkbox" ${item.done ? "checked" : ""} />
      <span></span>
    </label>
    <input type="text" value="${escapeHtml(item.text || "")}" placeholder="Ej: leer consigna, buscar fuentes, resolver ejercicios" />
    <button class="icon-button" type="button" data-checklist-remove aria-label="Quitar paso">x</button>
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
      done: row.querySelector('input[type="checkbox"]').checked,
    }))
    .filter((item) => item.text);
}

function updateEditChecklistProgress() {
  const checklist = readChecklist(editChecklist);
  const done = checklist.filter((item) => item.done).length;
  editChecklistProgress.textContent = `${done}/${checklist.length}`;
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
  const status = allDone ? "Terminada" : task.status === "Terminada" ? "En progreso" : task.status;
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
  renderCalendar();
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
    const text = `${task.title} ${task.subject || ""} ${task.type} ${task.notes || ""} ${checklistText}`.toLowerCase();
    return matchesDifficulty && text.includes(query);
  });

  return sortForView(filtered);
}

function renderMetrics() {
  const active = tasks.filter((task) => task.status !== "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);
  const withHours = active.filter((task) => Number(task.hours) > 0);
  const hours = withHours.reduce((total, task) => total + Number(task.hours), 0);

  document.querySelector("#metric-total").textContent = active.length;
  document.querySelector("#metric-urgent").textContent = urgent.length;
  document.querySelector("#metric-week").textContent = week.length;
  document.querySelector("#metric-hours").textContent = withHours.length ? `${hours} h` : "Sin estimar";
}

function renderCalendar() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthName = today.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay.getDay() + 6) % 7;

  calendarTitle.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const cells = ["L", "M", "M", "J", "V", "S", "D"].map((day) => `<div class="calendar-weekday">${day}</div>`);
  for (let i = 0; i < offset; i += 1) cells.push(`<div class="calendar-day muted-day"></div>`);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTasks = tasks.filter((task) => normalizeDateValue(task.dueDate) === dateKey);
    const done = dayTasks.filter((task) => task.status === "Terminada").length;
    const pending = dayTasks.length - done;
    const isToday = day === today.getDate();
    cells.push(`
      <div class="calendar-day ${isToday ? "today" : ""}">
        <strong>${day}</strong>
        <div class="calendar-dots">
          ${pending ? `<span class="dot pending" title="${pending} pendiente(s)"></span>` : ""}
          ${done ? `<span class="dot done" title="${done} realizada(s)"></span>` : ""}
        </div>
      </div>
    `);
  }

  calendarGrid.innerHTML = cells.join("");
}

function renderFocus() {
  const active = sortTasks(tasks.filter((task) => task.status !== "Terminada")).slice(0, 3);

  if (!active.length) {
    focusList.innerHTML = `<div class="empty-state">No hay tareas activas. Crea una para empezar.</div>`;
    return;
  }

  focusList.innerHTML = active
    .map((task) => {
      const score = calculatePriorityScore(task);
      return `
        <article class="focus-item">
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <span>${formatTaskSubtitle(task)}</span>
          </div>
          <b title="${escapeHtml(explainScore(task))}">${score}/100</b>
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
      const score = calculatePriorityScore(task);
      const priority = score >= 75 ? "Urgente" : score >= 45 ? "Alta" : "Normal";
      return `
        <article class="task-card" data-priority="${priority}" data-id="${task.id}" tabindex="0" role="button" aria-label="Ver o editar ${escapeHtml(task.title)}">
          <div class="task-main">
            <div>
              <strong>${escapeHtml(task.title)}</strong>
              <div class="task-meta">
                <span>${formatDate(task.dueDate)}</span>
                ${task.subject ? `<span>${escapeHtml(task.subject)}</span>` : ""}
                <span>${escapeHtml(task.type)}</span>
                <span>${formatHours(task)}</span>
              </div>
            </div>
            <span class="tag ${priority}">${priority}</span>
          </div>
          ${task.notes ? `<p>${escapeHtml(task.notes)}</p>` : ""}
          ${renderChecklistPreview(task)}
          <div class="score-detail">${escapeHtml(explainScore(task))}</div>
          <div class="task-actions">
            <span>Dificultad: ${task.difficulty}</span>
            <span>Estado: ${task.status}</span>
            <button class="small-button" data-action="progress" data-id="${task.id}">En progreso</button>
            <button class="small-button" data-action="done" data-id="${task.id}">Terminada</button>
            <button class="small-button danger-button" data-action="delete" data-id="${task.id}">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRecommendations() {
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
    recommendations.innerHTML = `<div class="chat-message bot">Soy Hugo. Crea una tarea y te ayudo a priorizarla.</div>`;
    return;
  }

  recommendations.innerHTML = ranked
    .map(
      ({ task, score, reason }) => `
        <div class="chat-message bot">
          <strong>${escapeHtml(task.title)} - ${score}/100</strong>
          <span>${reason}</span>
          <small>${escapeHtml(explainScore(task))}</small>
        </div>
      `
    )
    .join("");
}

function sortTasks(items) {
  return items.map(normalizeTaskDates).sort((a, b) => {
    const byScore = calculatePriorityScore(b) - calculatePriorityScore(a);
    if (byScore !== 0) return byScore;
    return normalizeDateValue(a.dueDate).localeCompare(normalizeDateValue(b.dueDate));
  });
}

function normalizeTaskDates(task) {
  return {
    ...task,
    dueDate: normalizeDateValue(task.dueDate),
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
    return sorted.sort((a, b) => normalizeDateValue(a.dueDate).localeCompare(normalizeDateValue(b.dueDate)));
  }

  if (sortFilter.value === "difficulty") {
    return sorted.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] || calculatePriorityScore(b) - calculatePriorityScore(a));
  }

  if (sortFilter.value === "progress") {
    return sorted.sort((a, b) => getChecklistProgress(b).percent - getChecklistProgress(a).percent || calculatePriorityScore(b) - calculatePriorityScore(a));
  }

  return sortTasks(sorted);
}

function formatTaskSubtitle(task) {
  return [task.subject, formatDate(task.dueDate)].filter(Boolean).map(escapeHtml).join(" - ");
}

function formatHours(task) {
  return Number(task.hours) > 0 ? `${task.hours} h` : "Sin estimar";
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

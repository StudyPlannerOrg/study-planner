const STORAGE_KEY = "studyplanner.tasks";
const TOKEN_KEY = "studyplanner.token";
const USER_KEY = "studyplanner.user";

const demoTasks = [
  {
    id: crypto.randomUUID(),
    title: "TP Integrador con IA",
    subject: "Gestion de Desarrollo de Software",
    type: "Trabajo practico",
    dueDate: todayOffset(2),
    hours: 8,
    notes: "Completar aplicacion web, README, informe tecnico y despliegue online.",
    difficulty: "Alta",
    status: "En progreso",
  },
  {
    id: crypto.randomUUID(),
    title: "Resumen de patrones",
    subject: "Arquitectura de Software",
    type: "Lectura",
    dueDate: todayOffset(5),
    hours: 3,
    notes: "Preparar resumen de patrones MVC, capas y repositorio para la clase.",
    difficulty: "Media",
    status: "Pendiente",
  },
  {
    id: crypto.randomUUID(),
    title: "Parcial SQL",
    subject: "Base de Datos",
    type: "Parcial",
    dueDate: todayOffset(1),
    hours: 6,
    notes: "Practicar joins, subconsultas, normalizacion y consultas agrupadas.",
    difficulty: "Alta",
    status: "Pendiente",
  },
];

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
const search = document.querySelector("#search");
const difficultyFilter = document.querySelector("#difficulty-filter");
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

let tasks = [];
let token = localStorage.getItem(TOKEN_KEY);
let currentUser = readJson(USER_KEY);
let apiAvailable = false;
let authAction = "login";
let activeView = "dashboard";
let selectedTaskId = null;

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
  const data = new FormData(form);
  const task = {
    title: data.get("title").trim(),
    subject: data.get("subject"),
    type: data.get("type"),
    dueDate: data.get("dueDate"),
    hours: Number(data.get("hours")),
    notes: data.get("notes").trim(),
    difficulty: data.get("difficulty"),
    status: data.get("status"),
  };

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
  form.hours.value = 2;
  form.dueDate.value = todayOffset(1);
  render();
  setView("dashboard");
});

editTaskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedTaskId) return;

  const data = new FormData(editTaskForm);
  const changes = {
    title: data.get("title").trim(),
    subject: data.get("subject"),
    type: data.get("type"),
    dueDate: data.get("dueDate"),
    hours: Number(data.get("hours")),
    notes: data.get("notes").trim(),
    difficulty: data.get("difficulty"),
    status: data.get("status"),
  };

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
  authForm.reset();
  await loadCloudTasks();
  updateSessionUi();
  showApp();
  render();
});

signOutButton.addEventListener("click", () => {
  token = null;
  currentUser = null;
  tasks = [];
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  updateSessionUi();
  showLanding();
});

search.addEventListener("input", render);
difficultyFilter.addEventListener("change", render);

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    const card = event.target.closest(".task-card[data-id]");
    if (card) openTaskDetail(card.dataset.id);
    return;
  }

  const { action, id } = button.dataset;
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
  form.hours.value = 2;
  apiAvailable = await checkApiHealth();

  if (isCloudMode()) {
    await loadCloudTasks();
    if (isCloudMode()) {
      showApp();
      render();
    } else {
      showLanding();
    }
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
  editTaskForm.subject.value = task.subject;
  editTaskForm.type.value = task.type;
  editTaskForm.dueDate.value = normalizeDateValue(task.dueDate);
  editTaskForm.hours.value = task.hours;
  editTaskForm.notes.value = task.notes;
  editTaskForm.difficulty.value = task.difficulty;
  editTaskForm.status.value = task.status;
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
    authCopy.textContent = "El backend no esta disponible. Revisa el deploy o intenta nuevamente.";
    storageStatus.textContent = "Sin conexion";
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

async function loadCloudTasks() {
  const data = await apiRequest("/api/tasks");
  if (data) tasks = sortTasks(data.map(normalizeTaskDates));
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
  renderFocus();
  renderTasks(getFilteredTasks());
  renderRecommendations();
}

function getFilteredTasks() {
  const query = search.value.trim().toLowerCase();
  const difficulty = difficultyFilter.value;

  return tasks.filter((task) => {
    const matchesDifficulty = difficulty === "Todas" || task.difficulty === difficulty;
    const text = `${task.title} ${task.subject} ${task.type} ${task.notes}`.toLowerCase();
    return matchesDifficulty && text.includes(query);
  });
}

function renderMetrics() {
  const active = tasks.filter((task) => task.status !== "Terminada");
  const urgent = active.filter((task) => calculatePriorityScore(task) >= 75);
  const week = active.filter((task) => daysUntil(task.dueDate) <= 7);
  const hours = active.reduce((total, task) => total + Number(task.hours), 0);

  document.querySelector("#metric-total").textContent = active.length;
  document.querySelector("#metric-urgent").textContent = urgent.length;
  document.querySelector("#metric-week").textContent = week.length;
  document.querySelector("#metric-hours").textContent = `${hours} h`;
}

function renderFocus() {
  const active = tasks.filter((task) => task.status !== "Terminada").slice(0, 3);

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
            <span>${escapeHtml(task.subject)} - ${formatDate(task.dueDate)}</span>
          </div>
          <b>${score}/100</b>
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
                <span>${escapeHtml(task.subject)}</span>
                <span>${escapeHtml(task.type)}</span>
                <span>${task.hours} h</span>
              </div>
            </div>
            <span class="tag ${priority}">${priority}</span>
          </div>
          <p>${escapeHtml(task.notes)}</p>
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
    recommendations.innerHTML = `<div class="chat-message bot">Crea una tarea y te ayudo a priorizarla.</div>`;
    return;
  }

  recommendations.innerHTML = ranked
    .map(
      ({ task, score, reason }) => `
        <div class="chat-message bot">
          <strong>${escapeHtml(task.title)} - ${score}/100</strong>
          <span>${reason}</span>
        </div>
      `
    )
    .join("");
}

function calculatePriorityScore(task) {
  const days = daysUntil(task.dueDate);
  const difficultyPoints = { Alta: 30, Media: 18, Baja: 8 };
  const typePoints = {
    Final: 30,
    Parcial: 26,
    "Trabajo practico": 20,
    Exposicion: 18,
    Lectura: 8,
  };

  let score = difficultyPoints[task.difficulty] + typePoints[task.type] + Number(task.hours) * 3;

  if (days < 0) score += 40;
  else if (days <= 1) score += 35;
  else if (days <= 3) score += 25;
  else if (days <= 7) score += 12;

  if (task.status === "En progreso") score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function explainPriority(task) {
  const days = daysUntil(task.dueDate);
  const score = calculatePriorityScore(task);
  const dueText = days < 0 ? "ya esta vencida" : days === 0 ? "vence hoy" : `vence en ${days} dia(s)`;

  if (score >= 75) {
    return `Prioridad maxima: ${dueText}, dificultad ${task.difficulty.toLowerCase()} y ${task.hours} hora(s) estimadas.`;
  }

  if (score >= 45) {
    return `Conviene reservar tiempo esta semana: ${dueText} y demanda ${task.hours} hora(s).`;
  }

  return `Puede planificarse despues de las tareas criticas: ${dueText}.`;
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
  };
}

function normalizeDateValue(value) {
  if (!value) return todayOffset(0);
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayOffset(0);
  return date.toISOString().slice(0, 10);
}

function daysUntil(value) {
  const today = new Date(todayOffset(0));
  const due = new Date(normalizeDateValue(value));
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / 86400000);
}

function todayOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const normalized = normalizeDateValue(value);
  const [year, month, day] = normalized.split("-");
  return `${day}/${month}/${year}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

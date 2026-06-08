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

const form = document.querySelector("#task-form");
const list = document.querySelector("#task-list");
const recommendations = document.querySelector("#ai-recommendations");
const search = document.querySelector("#search");
const difficultyFilter = document.querySelector("#difficulty-filter");
const seedButton = document.querySelector("#seed-data");
const authForm = document.querySelector("#auth-form");
const signOutButton = document.querySelector("#sign-out");
const authTitle = document.querySelector("#auth-title");
const authCopy = document.querySelector("#auth-copy");
const storageStatus = document.querySelector("#storage-status");

let tasks = [];
let token = localStorage.getItem(TOKEN_KEY);
let currentUser = readJson(USER_KEY);
let apiAvailable = false;
let authAction = "login";

init();

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
});

authForm.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-auth-action]");
  if (button) authAction = button.dataset.authAction;
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!apiAvailable) {
    authCopy.textContent = "El backend no esta disponible. Ejecuta npm start con DATABASE_URL configurada.";
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
  updateAuthUi();
  render();
});

signOutButton.addEventListener("click", () => {
  token = null;
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  tasks = loadLocalTasks();
  updateAuthUi();
  render();
});

search.addEventListener("input", render);
difficultyFilter.addEventListener("change", render);

seedButton.addEventListener("click", async () => {
  const nextTasks = sortTasks([...demoTasks.map((task) => ({ ...task, id: crypto.randomUUID() }))]);

  if (isCloudMode()) {
    const result = await apiRequest("/api/tasks/demo", {
      method: "POST",
      body: JSON.stringify({ tasks: nextTasks }),
    });
    if (result) await loadCloudTasks();
  } else {
    tasks = nextTasks;
    persistLocal();
  }

  render();
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "progress") {
    await updateTask(id, { status: "En progreso" });
  }

  if (action === "done") {
    await updateTask(id, { status: "Terminada" });
  }

  if (action === "delete") {
    await deleteTask(id);
  }

  render();
});

async function init() {
  form.dueDate.value = todayOffset(1);
  form.hours.value = 2;
  apiAvailable = await checkApiHealth();

  if (isCloudMode()) {
    await loadCloudTasks();
  } else {
    tasks = loadLocalTasks();
  }

  updateAuthUi();
  render();
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

function isCloudMode() {
  return Boolean(apiAvailable && token && currentUser);
}

function updateAuthUi() {
  if (!apiAvailable) {
    authTitle.textContent = "Modo local";
    authCopy.textContent = "El backend no esta disponible. La app guarda datos en este navegador.";
    storageStatus.textContent = "Modo local activo";
    signOutButton.classList.add("hidden");
    authForm.classList.remove("hidden");
    return;
  }

  if (!token || !currentUser) {
    authTitle.textContent = "Backend disponible";
    authCopy.textContent = "Crea una cuenta o ingresa para sincronizar tareas con PostgreSQL.";
    storageStatus.textContent = "API conectada";
    signOutButton.classList.add("hidden");
    authForm.classList.remove("hidden");
    return;
  }

  authTitle.textContent = "Sesion activa";
  authCopy.textContent = `Tareas sincronizadas para ${currentUser.email}.`;
  storageStatus.textContent = "PostgreSQL activo";
  signOutButton.classList.remove("hidden");
  authForm.classList.add("hidden");
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
  if (data) tasks = sortTasks(data);
}

async function updateTask(id, changes) {
  if (isCloudMode()) {
    const updated = await apiRequest(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    if (updated) tasks = tasks.map((task) => (task.id === id ? updated : task));
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
  const filtered = getFilteredTasks();
  renderMetrics();
  renderTasks(filtered);
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
        <article class="task-card" data-priority="${priority}">
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
    recommendations.innerHTML = `<div class="empty-state">No hay tareas activas para analizar.</div>`;
    return;
  }

  recommendations.innerHTML = ranked
    .map(({ task, score, reason }) => {
      const level = score >= 75 ? "urgent" : score >= 45 ? "high" : "normal";
      return `
        <article class="recommendation-card ${level}">
          <strong>${escapeHtml(task.title)} - ${score}/100</strong>
          <p>${reason}</p>
        </article>
      `;
    })
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
    return `Prioridad maxima: ${dueText}, tiene dificultad ${task.difficulty.toLowerCase()} y requiere ${task.hours} hora(s) estimadas.`;
  }

  if (score >= 45) {
    return `Conviene bloquear tiempo esta semana: ${dueText} y todavia demanda ${task.hours} hora(s) de trabajo.`;
  }

  return `Puede planificarse despues de las tareas criticas: ${dueText} y su carga actual es manejable.`;
}

function sortTasks(items) {
  return items.sort((a, b) => {
    const byScore = calculatePriorityScore(b) - calculatePriorityScore(a);
    if (byScore !== 0) return byScore;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

function daysUntil(value) {
  const today = new Date(todayOffset(0));
  const due = new Date(value);
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / 86400000);
}

function todayOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
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

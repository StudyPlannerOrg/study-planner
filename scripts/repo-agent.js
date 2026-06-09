const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const reportDir = path.join(root, "docs", "reports");
const requiredFiles = [
  "frontend/index.html",
  "frontend/styles.css",
  "frontend/app.js",
  "frontend/assets/hugo-mascot.png",
  "backend/server.js",
  "package.json",
  "Dockerfile",
  "docker-compose.yml",
  ".dockerignore",
  "render.yaml",
  "docs/deploy.md",
  "docs/colaboracion.md",
  ".env.example",
  "db/schema.sql",
  "README.md",
  "docs/informe-tecnico.md",
  ".github/workflows/ci.yml",
  ".github/workflows/agent-review.yml",
];

const checks = [
  {
    name: "Archivos obligatorios",
    run: () => requiredFiles.every((file) => fs.existsSync(path.join(root, file))),
    detail: "Verifica que la entrega tenga app, documentacion y workflows.",
  },
  {
    name: "README menciona IA",
    run: () => read("README.md").toLowerCase().includes("ia"),
    detail: "El README debe explicar que herramientas de IA se usaron.",
  },
  {
    name: "Informe tecnico completo",
    run: () => {
      const report = read("docs/informe-tecnico.md").toLowerCase();
      return report.includes("herramientas de ia") && report.includes("lecciones aprendidas");
    },
    detail: "El informe debe cubrir herramientas, experiencia y aprendizajes.",
  },
  {
    name: "Persistencia local",
    run: () => read("frontend/app.js").includes("localStorage"),
    detail: "La app debe guardar datos para que la demo sea usable.",
  },
  {
    name: "Backend Express",
    run: () => read("backend/server.js").includes("express") && read("backend/server.js").includes("/api/tasks") && read("backend/routes/auth.js").includes("jsonwebtoken"),
    detail: "Verifica que exista API REST propia con autenticacion JWT.",
  },
  {
    name: "Base PostgreSQL",
    run: () => read("backend/db.js").includes("pg") && read("db/schema.sql").includes("create table if not exists tasks"),
    detail: "Verifica que exista conexion a PostgreSQL y esquema de tareas.",
  },
  {
    name: "Despliegue Render Neon",
    run: () => read("render.yaml").includes("startCommand: npm start") && read("docs/deploy.md").includes("Neon") && read("docs/deploy.md").includes("Render"),
    detail: "Verifica que exista configuracion y guia para Render + Neon.",
  },
  {
    name: "Soporte Docker",
    run: () => read("Dockerfile").includes('CMD ["npm", "start"]') && read("docker-compose.yml").includes("postgres:16-alpine"),
    detail: "Verifica que exista Dockerfile y compose con PostgreSQL.",
  },
  {
    name: "Trabajo colaborativo",
    run: () => read("docs/colaboracion.md").includes("feature/frontend-ui") && read("docs/colaboracion.md").includes("Pull Request"),
    detail: "Verifica que exista una guia para ramas y aportes individuales.",
  },
  {
    name: "Asistente de priorizacion",
    run: () => read("frontend/app.js").includes("calculatePriorityScore") && read("frontend/app.js").includes("explainPriority"),
    detail: "La app debe tener una logica explicable de recomendacion.",
  },
  {
    name: "Interfaz academica",
    run: () => {
      const html = read("frontend/index.html").toLowerCase();
      return html.includes("study planner") && html.includes("nueva tarea") && html.includes("hugo");
    },
    detail: "Verifica que no se haya roto el enfoque del proyecto.",
  },
];

const results = checks.map((check) => ({
  name: check.name,
  ok: Boolean(check.run()),
  detail: check.detail,
}));

const passed = results.filter((result) => result.ok).length;
const failed = results.length - passed;
const report = [
  "# Agent Review - Study Planner",
  "",
  `Resultado: ${passed}/${results.length} controles aprobados.`,
  "",
  ...results.map((result) => `- ${result.ok ? "OK" : "REVISAR"} - ${result.name}: ${result.detail}`),
  "",
  "Este informe fue generado automaticamente por el agente de revision del repositorio.",
  "",
].join("\n");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "agent-review.md"), report);
console.log(report);

if (failed > 0) {
  process.exitCode = 1;
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

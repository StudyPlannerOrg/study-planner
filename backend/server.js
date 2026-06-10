const path = require("node:path");
const cors = require("cors");
const express = require("express");
const config = require("./config");
const { initializeDatabase, pool } = require("./db");
const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth");
const hugoRoutes = require("./routes/hugo");
const taskRoutes = require("./routes/tasks");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(config.publicDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    database: Boolean(pool),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/hugo", hugoRoutes);
app.use("/api/tasks", taskRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Ruta API no encontrada." });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(config.publicDir, "index.html"));
});

app.use(errorHandler);

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function start() {
  await initializeDatabase();

  app.listen(config.port, () => {
    console.log(`Study Planner escuchando en http://localhost:${config.port}`);
  });
}

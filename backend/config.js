const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const config = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "study-planner-dev-secret",
  n8nSharedSecret: process.env.N8N_SHARED_SECRET || "",
  port: process.env.PORT || 3000,
  publicDir: path.join(__dirname, "..", "frontend"),
  schemaPath: path.join(__dirname, "..", "db", "schema.sql"),
};

module.exports = config;

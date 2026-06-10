const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const config = {
  databaseUrl: process.env.DATABASE_URL,
  hugoN8nSecret: process.env.HUGO_N8N_SECRET || process.env.N8N_SHARED_SECRET || "",
  hugoN8nWebhookUrl: process.env.HUGO_N8N_WEBHOOK_URL || "",
  jwtSecret: process.env.JWT_SECRET || "study-planner-dev-secret",
  n8nSharedSecret: process.env.N8N_SHARED_SECRET || "",
  port: process.env.PORT || 3000,
  publicDir: path.join(__dirname, "..", "frontend"),
  schemaPath: path.join(__dirname, "..", "db", "schema.sql"),
};

module.exports = config;

const fs = require("node:fs");
const { Pool } = require("pg");
const config = require("./config");

const pool = config.databaseUrl
  ? new Pool(createPoolOptions(config.databaseUrl))
  : null;

async function initializeDatabase() {
  if (!pool) return;
  const schema = fs.readFileSync(config.schemaPath, "utf8");
  await pool.query(schema);
}

function isLocalDatabase(url) {
  return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("@postgres:");
}

function createPoolOptions(databaseUrl) {
  if (isLocalDatabase(databaseUrl)) {
    return {
      connectionString: databaseUrl,
      ssl: false,
    };
  }

  return {
    connectionString: withoutSslMode(databaseUrl),
    ssl: { rejectUnauthorized: false },
  };
}

function withoutSslMode(databaseUrl) {
  const parsed = new URL(databaseUrl);
  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}

module.exports = {
  initializeDatabase,
  pool,
};

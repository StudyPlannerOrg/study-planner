const fs = require("node:fs");
const { Pool } = require("pg");
const config = require("./config");

const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: isLocalDatabase(config.databaseUrl) ? false : { rejectUnauthorized: false },
    })
  : null;

async function initializeDatabase() {
  if (!pool) return;
  const schema = fs.readFileSync(config.schemaPath, "utf8");
  await pool.query(schema);
}

function isLocalDatabase(url) {
  return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("@postgres:");
}

module.exports = {
  initializeDatabase,
  pool,
};

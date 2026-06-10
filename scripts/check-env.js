const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(process.cwd(), ".env");
const requiredKeys = ["PORT", "DATABASE_URL", "JWT_SECRET"];

if (!fs.existsSync(envPath)) {
  console.error("REVISAR - Falta el archivo .env local.");
  process.exit(1);
}

const parsed = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...valueParts] = line.split("=");
      return [key.trim(), valueParts.join("=").trim()];
    })
);
const missing = requiredKeys.filter((key) => !String(parsed[key] || "").trim());

if (missing.length) {
  console.error(`REVISAR - Faltan valores en .env: ${missing.join(", ")}`);
  process.exit(1);
}

const summary = requiredKeys.map((key) => `${key}=configurado`).join("\n");
console.log(`OK - .env local configurado.\n${summary}`);

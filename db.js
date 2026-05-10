require("./config/loadEnv");
const { Pool } = require("pg");

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function buildPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const poolConfig = databaseUrl
    ? { connectionString: databaseUrl }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
      };

  const shouldUseSsl =
    isTruthy(process.env.DB_SSL) ||
    (databaseUrl && process.env.DB_SSL !== "false");

  if (shouldUseSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return poolConfig;
}

const pool = new Pool(buildPoolConfig());

module.exports = pool;

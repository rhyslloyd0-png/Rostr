const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Managed Postgres (Render/Railway) fronts its own TLS cert that isn't in
// Node's default trust store — same relaxation Midnight Roster used.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

module.exports = pool;

// Applies every .sql file in db/migrations in filename order, tracking what
// has already run in a schema_migrations table — safe to run on every boot.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rows } = await pool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
    if (rows.length) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`Applying migration ${file}...`);
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }
  console.log("Migrations up to date.");
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrate };

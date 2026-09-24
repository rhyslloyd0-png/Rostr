require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
// Patches Express route handlers so a rejected promise reaches the error
// middleware below instead of hanging the request — must load before any
// router that relies on it (every route in this app is async).
require("express-async-errors");

const { migrate } = require("./db/migrate");
const authRoutes = require("./routes/auth");
const guildRoutes = require("./routes/guilds");
const departmentRoutes = require("./routes/departments");
const billingRoutes = require("./routes/billing");
const applyRoutes = require("./routes/apply");
const loaRoutes = require("./routes/loa");
const sopRoutes = require("./routes/sop");
const { startLoaScheduler } = require("./jobs/loaScheduler");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.WEB_BASE_URL, credentials: true }));
app.use(cookieParser());

// Stripe's webhook signature check needs the raw, unparsed body — skip the
// global JSON parser for that one path and let routes/billing.js apply
// express.raw() itself just for that route.
app.use((req, res, next) => {
  if (req.path === "/billing/webhook") return next();
  express.json()(req, res, next);
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/guilds", guildRoutes);
app.use("/guilds/:guildId/departments", departmentRoutes);
app.use("/billing", billingRoutes);
app.use("/apply", applyRoutes);
app.use("/loa", loaRoutes);
app.use("/sop", sopRoutes);

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large (20MB max)" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  await migrate();
  startLoaScheduler();
  app.listen(PORT, () => console.log(`RostR API listening on :${PORT}`));
}

start().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

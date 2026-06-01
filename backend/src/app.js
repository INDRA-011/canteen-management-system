// src/app.js
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── ROUTES ─────────────────────────────────────────────────
// What this does: mounts all auth routes under /api/auth
// So /login becomes /api/auth/login, etc.
app.use("/api/auth", authRoutes);

// ── HEALTH CHECK ───────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TCMIT Canteen API is running",
    time: new Date().toISOString(),
  });
});

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── GLOBAL ERROR HANDLER ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;

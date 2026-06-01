// src/app.js
const express = require("express");
const cors = require("cors");

const app = express();

// ── MIDDLEWARE ──────────────────────────────────────────────
// What it does: allows the React frontend (running on a
// different port) to talk to this API without being blocked
app.use(cors());

// What it does: automatically parses incoming JSON request
// bodies so you can access req.body in your route handlers
app.use(express.json());

// What it does: parses URL-encoded form data (used by some
// payment gateway callbacks like eSewa)
app.use(express.urlencoded({ extended: true }));

// ── HEALTH CHECK ────────────────────────────────────────────
// What it does: a simple route to confirm the server is alive.
// Hit GET http://localhost:5000/api/health in Postman to test.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TCMIT Canteen API is running",
    time: new Date().toISOString(),
  });
});

// ── 404 HANDLER ─────────────────────────────────────────────
// What it does: catches any request to a route that doesn't
// exist and returns a clean error instead of crashing
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── GLOBAL ERROR HANDLER ────────────────────────────────────
// What it does: catches any unhandled errors thrown anywhere
// in the app and returns a clean 500 response
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;

// src/routes/auth.js

// What this is: Express Router — a mini-app that handles
// a group of related routes. We mount it at /api/auth in app.js.

const express = require("express");
const router = express.Router();

const {
  login,
  changePassword,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// POST /api/auth/login
// Public — no token needed
// What it does: authenticates user and returns JWT
router.post("/login", login);

// POST /api/auth/change-password
// Protected — token required (protect runs first)
// What it does: changes password and resets must_change_password flag
router.post("/change-password", protect, changePassword);

// GET /api/auth/me
// Protected — returns logged-in user profile
router.get("/me", protect, getMe); // no mustChangePassword — needed by change-password screen

module.exports = router;

// src/controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/db");

// ── login ──────────────────────────────────────────────────
// Route:   POST /api/auth/login
// Access:  Public (no token needed)
// What it does:
//   1. Find user by email in the DB
//   2. Compare submitted password with stored bcrypt hash
//   3. If valid → generate JWT and return it
//   4. If must_change_password → include flag in response

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input exists
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    // What this does: searches the Users table for a matching email.
    // findFirst returns null if not found (doesn't throw).
    const user = await prisma.users.findFirst({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Important: same error message for wrong email OR wrong password.
      // Never tell attackers which one is wrong.
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // What this does: bcrypt.compare hashes the submitted password
    // and checks if it matches the stored hash. Never stores plain text.
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // What this does: creates a JWT containing user's id, role,
    // and must_change_password flag. Signs it with our secret.
    // Expires in 24 hours.
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        must_change_password: user.must_change_password,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    // What this does: returns the token and user info.
    // The frontend stores the token and sends it in future requests.
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        college_id: user.college_id,
        must_change_password: user.must_change_password,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Server error during login." });
  }
};

// ── changePassword ─────────────────────────────────────────
// Route:   POST /api/auth/change-password
// Access:  Protected (token required)
// What it does:
//   1. Validates new password strength
//   2. Hashes the new password with bcrypt
//   3. Updates the DB and flips must_change_password to false

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    if (!new_password) {
      return res.status(400).json({ error: "New password is required." });
    }

    // Password strength: minimum 8 chars
    if (new_password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters." });
    }

    // Get current user from DB to verify current password
    const user = await prisma.users.findFirst({ where: { id: userId } });

    // If it's a first-time login (must_change_password = true),
    // current_password is their college ID — still verify it
    if (current_password) {
      const isMatch = await bcrypt.compare(
        current_password,
        user.password_hash,
      );
      if (!isMatch) {
        return res
          .status(401)
          .json({ error: "Current password is incorrect." });
      }
    }

    // What this does: bcrypt.hash creates a secure one-way hash.
    // The 10 is the "salt rounds" — higher = more secure but slower.
    // 10 is the industry standard for good security/speed balance.
    const newHash = await bcrypt.hash(new_password, 10);

    // What this does: updates the Users table — new hash + flip flag
    await prisma.users.update({
      where: { id: userId },
      data: {
        password_hash: newHash,
        must_change_password: false,
      },
    });

    return res
      .status(200)
      .json({ message: "Password changed successfully. Please login again." });
  } catch (error) {
    console.error("Change password error:", error.message);
    return res
      .status(500)
      .json({ error: "Server error during password change." });
  }
};

// ── getMe ──────────────────────────────────────────────────
// Route:   GET /api/auth/me
// Access:  Protected
// What it does: returns the logged-in user's profile.
// Useful for the frontend to know who is logged in after refresh.

const getMe = async (req, res) => {
  try {
    const user = await prisma.users.findFirst({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        college_id: true,
        phone: true,
        role: true,
        must_change_password: true,
        created_at: true,
      },
    });

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: "Server error." });
  }
};

module.exports = { login, changePassword, getMe };

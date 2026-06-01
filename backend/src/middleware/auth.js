    // src/middleware/auth.js

const jwt = require('jsonwebtoken')

// ── protect ────────────────────────────────────────────────
// What it does: checks every incoming request for a valid JWT.
// If the token is missing, fake, or expired → 401 Unauthorized.
// If valid → attaches user info to req.user and lets it through.

const protect = (req, res, next) => {
  // What this does: reads the Authorization header.
  // The client sends: Authorization: Bearer <token>
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please login.' })
  }

  // What this does: strips the "Bearer " prefix to get the raw token
  const token = authHeader.split(' ')[1]

  try {
    // What this does: verifies the token was signed with our
    // JWT_SECRET and hasn't expired. If tampered with → throws error.
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // What this does: attaches the decoded user info to the request
    // so any route handler can access req.user.id and req.user.role
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please login again.' })
  }
}

// ── adminOnly ──────────────────────────────────────────────
// What it does: runs AFTER protect. Blocks any non-ADMIN user
// from accessing admin routes even if they have a valid token.

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' })
  }
  next()
}

// ── studentOnly ────────────────────────────────────────────
// What it does: blocks non-STUDENT users from student routes.

const studentOnly = (req, res, next) => {
  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Access denied. Students only.' })
  }
  next()
}

// ── mustChangePassword ─────────────────────────────────────
// What it does: if must_change_password is true, blocks access
// to everything except the change-password route.
// Forces first-time students to set their own password.

const mustChangePassword = (req, res, next) => {
  if (req.user.must_change_password) {
    return res.status(403).json({
      error: 'You must change your password before continuing.',
      must_change_password: true
    })
  }
  next()
}

module.exports = { protect, adminOnly, studentOnly, mustChangePassword }
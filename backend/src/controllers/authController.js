const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { pool } = require('../config/db')

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    // Query directly using mssql pool — no Prisma needed here
    const result = await pool.request()
      .input('email', email.toLowerCase().trim())
      .query('SELECT * FROM Users WHERE email = @email')

    const user = result.recordset[0]

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = jwt.sign(
      {
        id:                   user.id,
        role:                 user.role,
        must_change_password: user.must_change_password
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id:                   user.id,
        name:                 user.name,
        email:                user.email,
        role:                 user.role,
        college_id:           user.college_id,
        must_change_password: user.must_change_password
      }
    })
  } catch (error) {
    console.error('Login error FULL:', error.message)
    return res.status(500).json({ error: 'Server error during login.' })
  }
}

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    const userId = req.user.id

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' })
    }

    const result = await pool.request()
      .input('id', userId)
      .query('SELECT * FROM Users WHERE id = @id')

    const user = result.recordset[0]

    if (current_password) {
      const isMatch = await bcrypt.compare(current_password, user.password_hash)
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect.' })
      }
    }

    const newHash = await bcrypt.hash(new_password, 10)

    await pool.request()
      .input('hash', newHash)
      .input('id', userId)
      .query('UPDATE Users SET password_hash = @hash, must_change_password = 0 WHERE id = @id')

    return res.status(200).json({ message: 'Password changed successfully. Please login again.' })
  } catch (error) {
    console.error('Change password error:', error.message)
    return res.status(500).json({ error: 'Server error during password change.' })
  }
}

const getMe = async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', req.user.id)
      .query('SELECT id, name, email, college_id, phone, role, must_change_password, created_at FROM Users WHERE id = @id')

    return res.status(200).json({ user: result.recordset[0] })
  } catch (error) {
    return res.status(500).json({ error: 'Server error.' })
  }
}

module.exports = { login, changePassword, getMe }

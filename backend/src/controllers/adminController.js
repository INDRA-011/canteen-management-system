const bcrypt = require('bcryptjs')
const csv    = require('csv-parser')
const stream = require('stream')
const { pool } = require('../config/db')

// ── createStudent ──────────────────────────────────────────
// POST /api/admin/students
// Creates one student. Password auto-set to their college_id.
const createStudent = async (req, res) => {
  try {
    const { name, email, phone, college_id } = req.body

    if (!name || !email || !phone || !college_id) {
      return res.status(400).json({ error: 'name, email, phone, college_id are all required.' })
    }

    // Check if college_id or email already exists
    const exists = await pool.request()
      .input('email', email.toLowerCase().trim())
      .input('college_id', college_id.trim())
      .query('SELECT id FROM Users WHERE email = @email OR college_id = @college_id')

    if (exists.recordset.length > 0) {
      return res.status(409).json({ error: 'A student with this email or college ID already exists.' })
    }

    // Password = college_id, bcrypt hashed
    const password_hash = await bcrypt.hash(college_id.trim(), 10)

    await pool.request()
      .input('name',                 name.trim())
      .input('email',                email.toLowerCase().trim())
      .input('phone',                phone.trim())
      .input('college_id',           college_id.trim())
      .input('password_hash',        password_hash)
      .query(`
        INSERT INTO Users (name, email, phone, college_id, password_hash, role, must_change_password)
        VALUES (@name, @email, @phone, @college_id, @password_hash, 'STUDENT', 1)
      `)

    return res.status(201).json({
      message: `Student ${name} created successfully. Default password is their college ID.`
    })
  } catch (error) {
    console.error('createStudent error:', error.message)
    return res.status(500).json({ error: 'Server error creating student.' })
  }
}

// ── bulkCreateStudents ─────────────────────────────────────
// POST /api/admin/students/bulk
// Accepts a CSV file upload. Parses each row, validates,
// inserts valid rows, reports errors for invalid ones.
const bulkCreateStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file.' })
    }

    const results  = []  // successfully parsed rows
    const errors   = []  // rows that failed validation
    const created  = []  // rows actually inserted

    // Convert buffer to readable stream so csv-parser can read it
    const bufferStream = new stream.PassThrough()
    bufferStream.end(req.file.buffer)

    // Parse CSV row by row
    await new Promise((resolve, reject) => {
      bufferStream
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject)
    })

    // Process each row
    for (const row of results) {
      const { name, email, phone, college_id } = row

      // Skip rows with missing fields
      if (!name || !email || !phone || !college_id) {
        errors.push({ row, reason: 'Missing required fields' })
        continue
      }

      // Check for duplicate
      const exists = await pool.request()
        .input('email',      email.toLowerCase().trim())
        .input('college_id', college_id.trim())
        .query('SELECT id FROM Users WHERE email = @email OR college_id = @college_id')

      if (exists.recordset.length > 0) {
        errors.push({ row, reason: 'Duplicate email or college ID' })
        continue
      }

      const password_hash = await bcrypt.hash(college_id.trim(), 10)

      await pool.request()
        .input('name',          name.trim())
        .input('email',         email.toLowerCase().trim())
        .input('phone',         phone.trim())
        .input('college_id',    college_id.trim())
        .input('password_hash', password_hash)
        .query(`
          INSERT INTO Users (name, email, phone, college_id, password_hash, role, must_change_password)
          VALUES (@name, @email, @phone, @college_id, @password_hash, 'STUDENT', 1)
        `)

      created.push(college_id.trim())
    }

    return res.status(201).json({
      message:  `Bulk import complete.`,
      created:  created.length,
      failed:   errors.length,
      errors
    })
  } catch (error) {
    console.error('bulkCreate error:', error.message)
    return res.status(500).json({ error: 'Server error during bulk import.' })
  }
}

// ── getStudents ────────────────────────────────────────────
// GET /api/admin/students
// Returns all students. Admin uses this to populate the
// student management table in the dashboard.
const getStudents = async (req, res) => {
  try {
    const result = await pool.request()
      .query(`
        SELECT id, name, email, phone, college_id,
               must_change_password, created_at
        FROM Users
        WHERE role = 'STUDENT'
        ORDER BY created_at DESC
      `)

    return res.status(200).json({ students: result.recordset })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching students.' })
  }
}

// ── deleteStudent ──────────────────────────────────────────
// DELETE /api/admin/students/:id
// Soft approach — only deletes if student has no orders.
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params

    const orders = await pool.request()
      .input('id', id)
      .query('SELECT id FROM Orders WHERE user_id = @id')

    if (orders.recordset.length > 0) {
      return res.status(400).json({ error: 'Cannot delete student with existing orders.' })
    }

    await pool.request()
      .input('id', id)
      .query("DELETE FROM Users WHERE id = @id AND role = 'STUDENT'")

    return res.status(200).json({ message: 'Student deleted successfully.' })
  } catch (error) {
    return res.status(500).json({ error: 'Server error deleting student.' })
  }
}

module.exports = { createStudent, bulkCreateStudents, getStudents, deleteStudent }

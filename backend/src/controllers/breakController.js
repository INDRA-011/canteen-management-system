const { pool } = require('../config/db')

// GET /api/admin/breaks
// Returns all break periods. Admin uses this to manage
// when students can and cannot place orders.
const getBreakPeriods = async (req, res) => {
  try {
    const result = await pool.request().query(
      'SELECT * FROM BreakPeriods ORDER BY start_time'
    )
    return res.status(200).json({ breakPeriods: result.recordset })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching break periods.' })
  }
}

// POST /api/admin/breaks
// Creates a new break period.
// start_time, cutoff_time, end_time format: "HH:MM" e.g. "11:00"
// cutoff_time must be BEFORE start_time — orders lock before break starts.
const createBreakPeriod = async (req, res) => {
  try {
    const { name, start_time, cutoff_time, end_time } = req.body

    if (!name || !start_time || !cutoff_time || !end_time) {
      return res.status(400).json({ error: 'name, start_time, cutoff_time, end_time are required.' })
    }

    await pool.request()
      .input('name',        name.trim())
      .input('start_time',  start_time)
      .input('cutoff_time', cutoff_time)
      .input('end_time',    end_time)
      .query(`
        INSERT INTO BreakPeriods (name, start_time, cutoff_time, end_time, is_active)
        VALUES (@name, @start_time, @cutoff_time, @end_time, 1)
      `)

    return res.status(201).json({ message: `Break period "${name}" created.` })
  } catch (error) {
    return res.status(500).json({ error: 'Server error creating break period.' })
  }
}

// PATCH /api/admin/breaks/:id
// Updates a break period's times or name.
const updateBreakPeriod = async (req, res) => {
  try {
    const { id } = req.params
    const { name, start_time, cutoff_time, end_time } = req.body

    const updates = []
    const request = pool.request().input('id', id)

    if (name        !== undefined) { updates.push('name = @name');               request.input('name', name) }
    if (start_time  !== undefined) { updates.push('start_time = @start_time');   request.input('start_time', start_time) }
    if (cutoff_time !== undefined) { updates.push('cutoff_time = @cutoff_time'); request.input('cutoff_time', cutoff_time) }
    if (end_time    !== undefined) { updates.push('end_time = @end_time');       request.input('end_time', end_time) }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' })
    }

    await request.query(`UPDATE BreakPeriods SET ${updates.join(', ')} WHERE id = @id`)

    return res.status(200).json({ message: 'Break period updated.' })
  } catch (error) {
    return res.status(500).json({ error: 'Server error updating break period.' })
  }
}

// PATCH /api/admin/breaks/:id/toggle
// Activates or deactivates a break period.
// Inactive breaks won't accept orders — admin uses this
// on holidays or special days.
const toggleBreak = async (req, res) => {
  try {
    const { id } = req.params

    await pool.request()
      .input('id', id)
      .query('UPDATE BreakPeriods SET is_active = 1 - is_active WHERE id = @id')

    return res.status(200).json({ message: 'Break period toggled.' })
  } catch (error) {
    return res.status(500).json({ error: 'Server error toggling break period.' })
  }
}

module.exports = { getBreakPeriods, createBreakPeriod, updateBreakPeriod, toggleBreak }

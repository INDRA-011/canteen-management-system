const { pool } = require('../config/db')

const getSettings = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    let s = result.recordset[0]
    if (!s) {
      await pool.request()
        .input('open_time', '07:00')
        .input('close_time', '17:00')
        .input('slot_interval_minutes', 15)
        .input('is_open', 1)
        .query('INSERT INTO CanteenSettings (open_time, close_time, slot_interval_minutes, is_open) VALUES (@open_time, @close_time, @slot_interval_minutes, @is_open)')
      const r2 = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
      s = r2.recordset[0]
    }
    res.json(s)
  } catch(err) {
    console.error('getSettings error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

const updateSettings = async (req, res) => {
  try {
    const { open_time, close_time, slot_interval_minutes, blocked_slots, is_open } = req.body
    const result = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    let s = result.recordset[0]
    if (!s) {
      await pool.request()
        .input('open_time', '07:00').input('close_time', '17:00')
        .input('slot_interval_minutes', 15).input('is_open', 1)
        .query('INSERT INTO CanteenSettings (open_time, close_time, slot_interval_minutes, is_open) VALUES (@open_time, @close_time, @slot_interval_minutes, @is_open)')
      const r2 = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
      s = r2.recordset[0]
    }
    const req2 = pool.request().input('id', s.id)
    const sets = []
    if (open_time             !== undefined) { req2.input('open_time', open_time);                                  sets.push('open_time = @open_time') }
    if (close_time            !== undefined) { req2.input('close_time', close_time);                                sets.push('close_time = @close_time') }
    if (slot_interval_minutes !== undefined) { req2.input('slot_interval_minutes', parseInt(slot_interval_minutes)); sets.push('slot_interval_minutes = @slot_interval_minutes') }
    if (blocked_slots         !== undefined) { req2.input('blocked_slots', blocked_slots);                          sets.push('blocked_slots = @blocked_slots') }
    if (is_open               !== undefined) { req2.input('is_open', is_open ? 1 : 0);                             sets.push('is_open = @is_open') }
    if (sets.length > 0) await req2.query(`UPDATE CanteenSettings SET ${sets.join(', ')} WHERE id = @id`)
    const updated = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    res.json(updated.recordset[0])
  } catch(err) {
    console.error('updateSettings error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

const getSlots = async (req, res) => {
  try {
    const result = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    const s = result.recordset[0]
    if (!s) return res.json({ slots: [] })
    const blocked = s.blocked_slots ? s.blocked_slots.split(',').map(function(x) { return x.trim() }) : []
    const slots = []
    const oh = parseInt(s.open_time.split(':')[0])
    const om = parseInt(s.open_time.split(':')[1])
    const ch = parseInt(s.close_time.split(':')[0])
    const cm = parseInt(s.close_time.split(':')[1])
    for (let m = oh*60+om; m < ch*60+cm; m += s.slot_interval_minutes) {
      const slot = String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0')
      if (!blocked.includes(slot)) slots.push(slot)
    }
    res.json({ slots, open_time: s.open_time, close_time: s.close_time, slot_interval_minutes: s.slot_interval_minutes })
  } catch(err) {
    console.error('getSlots error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getSettings, updateSettings, getSlots }

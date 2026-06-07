const db = require('../config/db')
const getSettings = async (req, res) => {
  try {
    let s = await db.prisma.canteenSettings.findFirst()
    if (!s) s = await db.prisma.canteenSettings.create({ data: { open_time: '07:00', close_time: '17:00', slot_interval_minutes: 15 } })
    res.json(s)
  } catch(err) { res.status(500).json({ error: err.message }) }
}
const updateSettings = async (req, res) => {
  try {
    const { open_time, close_time, slot_interval_minutes, blocked_slots } = req.body
    let s = await db.prisma.canteenSettings.findFirst()
    if (!s) s = await db.prisma.canteenSettings.create({ data: { open_time: '07:00', close_time: '17:00', slot_interval_minutes: 15 } })
    const u = await db.prisma.canteenSettings.update({ where: { id: s.id }, data: {
      ...(open_time && { open_time }),
      ...(close_time && { close_time }),
      ...(slot_interval_minutes && { slot_interval_minutes: parseInt(slot_interval_minutes) }),
      ...(blocked_slots !== undefined && { blocked_slots })
    }})
    res.json(u)
  } catch(err) { res.status(500).json({ error: err.message }) }
}
const getSlots = async (req, res) => {
  try {
    const s = await db.prisma.canteenSettings.findFirst()
    if (!s) return res.json({ slots: [] })
    const blocked = s.blocked_slots ? JSON.parse(s.blocked_slots) : []
    const slots = []
    const [oh,om] = s.open_time.split(':').map(Number)
    const [ch,cm] = s.close_time.split(':').map(Number)
    for (let m = oh*60+om; m < ch*60+cm; m += s.slot_interval_minutes) {
      const slot = String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0')
      if (!blocked.includes(slot)) slots.push(slot)
    }
    res.json({ slots, open_time: s.open_time, close_time: s.close_time, slot_interval_minutes: s.slot_interval_minutes })
  } catch(err) { res.status(500).json({ error: err.message }) }
}
module.exports = { getSettings, updateSettings, getSlots }

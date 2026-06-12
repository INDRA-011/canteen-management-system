const express = require('express')
const router  = express.Router()
const { protect, adminOnly } = require('../middleware/auth')
const { pool } = require('../config/db')

router.get('/daily', protect, adminOnly, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0]

    const stats = await pool.request()
      .input('date', date)
      .query(`
        SELECT
          COUNT(*) AS total_orders,
          ISNULL(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) AS revenue,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
        FROM Orders
        WHERE CAST(placed_at AS DATE) = @date
      `)

    const topItem = await pool.request()
      .input('date', date)
      .query(`
        SELECT TOP 1 m.name, SUM(oi.quantity) AS qty
        FROM OrderItems oi
        JOIN Orders o ON oi.order_id = o.id
        JOIN MenuItems m ON oi.menu_item_id = m.id
        WHERE CAST(o.placed_at AS DATE) = @date AND o.status != 'CANCELLED'
        GROUP BY m.name
        ORDER BY qty DESC
      `)

    const hourly = await pool.request()
      .input('date', date)
      .query(`
        SELECT DATEPART(HOUR, placed_at) AS hour, COUNT(*) AS count
        FROM Orders
        WHERE CAST(placed_at AS DATE) = @date
        GROUP BY DATEPART(HOUR, placed_at)
        ORDER BY hour
      `)

    const orders = await pool.request()
      .input('date', date)
      .query(`
        SELECT o.id, o.token_number, o.total_amount, o.status, o.pickup_time,
               u.name AS student_name,
               (SELECT COUNT(*) FROM OrderItems WHERE order_id = o.id) AS item_count
        FROM Orders o
        JOIN Users u ON o.user_id = u.id
        WHERE CAST(o.placed_at AS DATE) = @date
        ORDER BY o.placed_at DESC
      `)

    res.json({
      date,
      total_orders: stats.recordset[0].total_orders,
      revenue: stats.recordset[0].revenue,
      cancelled: stats.recordset[0].cancelled,
      top_item: topItem.recordset[0]?.name || '—',
      hourly_breakdown: hourly.recordset.map(h => ({ hour: `${String(h.hour).padStart(2,'0')}:00`, count: h.count })),
      orders: orders.recordset,
    })
  } catch (e) {
    console.error('daily report error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router

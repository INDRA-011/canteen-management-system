const { pool } = require('../config/db')

// GET /api/admin/orders
const getOrders = async (req, res) => {
  try {
    const { status } = req.query
    const request = pool.request()
    let where = 'WHERE 1=1'
    if (status) { where += ' AND o.status = @status'; request.input('status', status) }
    const result = await request.query(`
      SELECT o.id, o.token_number, o.order_type, o.status,
             o.total_amount, o.placed_at, o.pickup_time,
             u.name AS student_name, u.college_id,
             p.status AS payment_status, p.method AS payment_method
      FROM Orders o
      JOIN Users u ON o.user_id = u.id
      LEFT JOIN Payments p ON o.id = p.order_id
      ${where}
      ORDER BY o.placed_at DESC
    `)
    const orders = result.recordset
    for (const order of orders) {
      const items = await pool.request()
        .input('order_id', order.id)
        .query(`
          SELECT oi.quantity, oi.unit_price, m.name AS item_name, m.item_type, m.image_url
          FROM OrderItems oi JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
      order.item_count = items.recordset.length
    }
    return res.status(200).json({ orders })
  } catch (error) {
    console.error('getOrders error:', error.message)
    return res.status(500).json({ error: 'Server error fetching orders.' })
  }
}

// GET /api/admin/orders/:id
const getOrderById = async (req, res) => {
  try {
    const result = await pool.request()
      .input('id', req.params.id)
      .query(`
        SELECT o.id, o.token_number, o.order_type, o.status,
               o.total_amount, o.placed_at, o.pickup_time,
               u.name AS student_name, u.college_id, u.phone,
               p.status AS payment_status, p.method AS payment_method,
               p.txn_id, p.amount AS paid_amount
        FROM Orders o
        JOIN Users u ON o.user_id = u.id
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.id = @id
      `)
    if (!result.recordset[0]) return res.status(404).json({ error: 'Order not found.' })
    const order = result.recordset[0]
    const items = await pool.request()
      .input('id', req.params.id)
      .query(`
        SELECT oi.quantity, oi.unit_price, m.name AS item_name, m.item_type, m.image_url
        FROM OrderItems oi JOIN MenuItems m ON oi.menu_item_id = m.id
        WHERE oi.order_id = @id
      `)
    order.items = items.recordset
    if (order.order_type === 'GROUP') {
      const members = await pool.request()
        .input('id', req.params.id)
        .query(`
          SELECT u.name, u.college_id
          FROM GroupMembers gm JOIN Users u ON gm.member_user_id = u.id
          WHERE gm.order_id = @id
        `)
      order.group_members = members.recordset
    }
    return res.status(200).json({ order })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching order.' })
  }
}

// PATCH /api/admin/orders/:id/status
// Option B: stock decremented on CONFIRM, restored on CANCEL
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const valid = ['CONFIRMED','PREPARING','READY','COLLECTED','CANCELLED']
    if (!valid.includes(status))
      return res.status(400).json({ error: 'Invalid status.' })

    const current = await pool.request()
      .input('id', id)
      .query('SELECT status FROM Orders WHERE id = @id')
    if (!current.recordset[0])
      return res.status(404).json({ error: 'Order not found.' })

    const cur = current.recordset[0].status
    const transitions = {
      PENDING:   ['CONFIRMED','CANCELLED'],
      CONFIRMED: ['PREPARING','CANCELLED'],
      PREPARING: ['READY'],
      READY:     ['COLLECTED'],
      COLLECTED: [],
      CANCELLED: []
    }
    if (!transitions[cur]?.includes(status))
      return res.status(400).json({ error: `Cannot move from ${cur} to ${status}.` })

    // ── Option B stock logic ───────────────────────────────
    if (status === 'CONFIRMED') {
      // Decrement stock now that admin has verified payment
      const items = await pool.request()
        .input('order_id', id)
        .query('SELECT menu_item_id, quantity FROM OrderItems WHERE order_id = @order_id')
      for (const item of items.recordset) {
        await pool.request()
          .input('qty', item.quantity)
          .input('id',  item.menu_item_id)
          .query('UPDATE MenuItems SET stock_qty = stock_qty - @qty WHERE id = @id')
      }
    }

    if (status === 'CANCELLED') {
      // Only restore stock if it was already decremented (i.e. was CONFIRMED or beyond)
      const wasConfirmed = ['CONFIRMED','PREPARING','READY'].includes(cur)
      if (wasConfirmed) {
        const items = await pool.request()
          .input('order_id', id)
          .query('SELECT menu_item_id, quantity FROM OrderItems WHERE order_id = @order_id')
        for (const item of items.recordset) {
          await pool.request()
            .input('qty', item.quantity)
            .input('id',  item.menu_item_id)
            .query('UPDATE MenuItems SET stock_qty = stock_qty + @qty WHERE id = @id')
        }
      }
    }
    // ── end Option B ───────────────────────────────────────

    await pool.request()
      .input('status', status)
      .input('id', id)
      .query('UPDATE Orders SET status = @status WHERE id = @id')

    return res.status(200).json({ message: `Order moved to ${status}.` })
  } catch (error) {
    console.error('updateOrderStatus error:', error.message)
    return res.status(500).json({ error: 'Server error updating status.' })
  }
}

// GET /api/admin/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const stats = await pool.request().query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status='PENDING'   THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status!='CANCELLED' THEN total_amount ELSE 0 END) AS revenue
      FROM Orders
      WHERE CAST(placed_at AS DATE) = CAST(GETDATE() AS DATE)
    `)
    const s = stats.recordset[0]
    return res.status(200).json({
      orders:    s.total_orders || 0,
      pending:   s.pending      || 0,
      cancelled: s.cancelled    || 0,
      revenue:   s.revenue      || 0,
    })
  } catch (error) {
    console.error('getDashboardStats error:', error.message)
    return res.status(500).json({ error: 'Server error.' })
  }
}

module.exports = { getOrders, getOrderById, updateOrderStatus, getDashboardStats }



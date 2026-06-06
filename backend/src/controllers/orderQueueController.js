const { pool } = require('../config/db')

// GET /api/admin/orders
// Returns all orders with full details — student name, items,
// payment status. Supports filtering by status and break period.
// Admin uses this to power the live order queue dashboard.
const getOrders = async (req, res) => {
  try {
    const { status, break_period_id } = req.query

    let whereClause = 'WHERE 1=1'
    const request = pool.request()

    if (status) {
      whereClause += ' AND o.status = @status'
      request.input('status', status)
    }

    if (break_period_id) {
      whereClause += ' AND o.break_period_id = @break_period_id'
      request.input('break_period_id', break_period_id)
    }

    const result = await request.query(`
      SELECT
        o.id, o.token_number, o.order_type, o.status,
        o.total_amount, o.placed_at, o.group_leader_id,
        u.name AS student_name, u.college_id,
        b.name AS break_name,
        p.status AS payment_status, p.method AS payment_method
      FROM Orders o
      JOIN Users u        ON o.user_id = u.id
      JOIN BreakPeriods b ON o.break_period_id = b.id
      LEFT JOIN Payments p ON o.id = p.order_id
      ${whereClause}
      ORDER BY o.placed_at DESC
    `)

    // For each order, also fetch its items
    const orders = result.recordset
    for (const order of orders) {
      const items = await pool.request()
        .input('order_id', order.id)
        .query(`
          SELECT oi.quantity, oi.unit_price,
                 m.name AS item_name, m.item_type
          FROM OrderItems oi
          JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
    }

    return res.status(200).json({ orders })
  } catch (error) {
    console.error('getOrders error:', error.message)
    return res.status(500).json({ error: 'Server error fetching orders.' })
  }
}

// GET /api/admin/orders/:id
// Returns full details of one order including group members.
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT
          o.id, o.token_number, o.order_type, o.status,
          o.total_amount, o.placed_at,
          u.name AS student_name, u.college_id, u.phone,
          b.name AS break_name,
          p.status AS payment_status, p.method AS payment_method,
          p.txn_id, p.amount AS paid_amount
        FROM Orders o
        JOIN Users u        ON o.user_id = u.id
        JOIN BreakPeriods b ON o.break_period_id = b.id
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.id = @id
      `)

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    const order = result.recordset[0]

    // Fetch items
    const items = await pool.request()
      .input('id', id)
      .query(`
        SELECT oi.quantity, oi.unit_price,
               m.name AS item_name, m.item_type
        FROM OrderItems oi
        JOIN MenuItems m ON oi.menu_item_id = m.id
        WHERE oi.order_id = @id
      `)
    order.items = items.recordset

    // Fetch group members if it's a group order
    if (order.order_type === 'GROUP') {
      const members = await pool.request()
        .input('id', id)
        .query(`
          SELECT u.name, u.college_id
          FROM GroupMembers gm
          JOIN Users u ON gm.member_user_id = u.id
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
// The core action — admin moves an order through its lifecycle.
// Valid transitions:
//   PENDING    → CONFIRMED  (admin approves after verifying payment)
//   CONFIRMED  → PREPARING  (kitchen starts making it)
//   PREPARING  → READY      (food is ready at counter)
//   READY      → COLLECTED  (student picked it up)
//   PENDING    → CANCELLED  (admin rejects — e.g. payment issue)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['CONFIRMED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    // Get current order to validate transition
    const current = await pool.request()
      .input('id', id)
      .query('SELECT status FROM Orders WHERE id = @id')

    if (!current.recordset[0]) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    const currentStatus = current.recordset[0].status

    // Define valid transitions — prevents jumping from PENDING to COLLECTED
    const validTransitions = {
      'PENDING':   ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY'],
      'READY':     ['COLLECTED'],
      'COLLECTED': [],
      'CANCELLED': []
    }

    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        error: `Cannot move order from ${currentStatus} to ${status}.`
      })
    }

    await pool.request()
      .input('status', status)
      .input('id', id)
      .query('UPDATE Orders SET status = @status WHERE id = @id')

    return res.status(200).json({
      message: `Order #${id} moved to ${status}.`
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error updating order status.' })
  }
}

// GET /api/admin/dashboard
// Returns the 4 KPI numbers for the admin dashboard top row.
// Total orders today, pending count, revenue today, items sold.
const getDashboardStats = async (req, res) => {
  try {
    const stats = await pool.request().query(`
      SELECT
        COUNT(*)                                          AS total_orders,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END)   AS pending,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)  AS cancelled,
        SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END) AS revenue
      FROM Orders
      WHERE CAST(placed_at AS DATE) = CAST(GETDATE() AS DATE)
    `)

    const itemStats = await pool.request().query(`
      SELECT SUM(oi.quantity) AS items_sold
      FROM OrderItems oi
      JOIN Orders o ON oi.order_id = o.id
      WHERE CAST(o.placed_at AS DATE) = CAST(GETDATE() AS DATE)
        AND o.status != 'CANCELLED'
    `)

    return res.status(200).json({
      today: {
        total_orders: stats.recordset[0].total_orders,
        pending:      stats.recordset[0].pending,
        cancelled:    stats.recordset[0].cancelled,
        revenue:      stats.recordset[0].revenue || 0,
        items_sold:   itemStats.recordset[0].items_sold || 0
      }
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching dashboard stats.' })
  }
}

module.exports = { getOrders, getOrderById, updateOrderStatus, getDashboardStats }

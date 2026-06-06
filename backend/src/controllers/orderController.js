const { pool } = require('../config/db')

// ── helper: get current time as "HH:MM" ───────────────────
// Used to compare against cutoff_time stored in the DB.
const getCurrentTime = () => {
  const now = new Date()
  const h   = String(now.getHours()).padStart(2, '0')
  const m   = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ── helper: extract "HH:MM" from DB time value ────────────
// SQL Server TIME columns come back as Date objects with
// 1970-01-01 prefix. We just need the HH:MM part.
const extractTime = (dbTime) => {
  const d = new Date(dbTime)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ── POST /api/orders ───────────────────────────────────────
// Place a new order. Called by student at checkout.
// Body: { break_period_id, order_type, items, member_college_ids? }
// items: [{ menu_item_id, quantity }]
const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id
    const { break_period_id, order_type, items, member_college_ids } = req.body

    // ── Validate required fields ───────────────────────────
    if (!break_period_id || !order_type || !items || items.length === 0) {
      return res.status(400).json({ error: 'break_period_id, order_type, and items are required.' })
    }

    if (!['INDIVIDUAL', 'GROUP'].includes(order_type)) {
      return res.status(400).json({ error: 'order_type must be INDIVIDUAL or GROUP.' })
    }

    // ── Check break period exists and is active ────────────
    const breakResult = await pool.request()
      .input('id', break_period_id)
      .query('SELECT * FROM BreakPeriods WHERE id = @id AND is_active = 1')

    if (!breakResult.recordset[0]) {
      return res.status(400).json({ error: 'Break period not found or inactive.' })
    }

    const breakPeriod = breakResult.recordset[0]
    const cutoffTime  = extractTime(breakPeriod.cutoff_time)
    const currentTime = getCurrentTime()

    // ── Check cutoff hasn't passed ─────────────────────────
    // Compare HH:MM strings — if current time is past cutoff, block.
    if (currentTime >= cutoffTime) {
      return res.status(400).json({
        error: `Order cutoff for ${breakPeriod.name} was at ${cutoffTime}. Orders are now closed.`
      })
    }

    // ── Validate individual order limits ───────────────────
    // Individual: max 1 MEAL + 1 DRINK only.
    if (order_type === 'INDIVIDUAL') {
      let mealCount = 0, drinkCount = 0

      for (const item of items) {
        const menuItem = await pool.request()
          .input('id', item.menu_item_id)
          .query('SELECT item_type, is_available, stock_qty FROM MenuItems WHERE id = @id')

        if (!menuItem.recordset[0]) {
          return res.status(400).json({ error: `Menu item ${item.menu_item_id} not found.` })
        }

        const mi = menuItem.recordset[0]

        if (!mi.is_available) {
          return res.status(400).json({ error: `One or more items are not available.` })
        }

        if (mi.stock_qty < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for item ${item.menu_item_id}.` })
        }

        if (mi.item_type === 'MEAL')  mealCount++
        if (mi.item_type === 'DRINK') drinkCount++
      }

      if (mealCount > 1 || drinkCount > 1) {
        return res.status(400).json({
          error: 'Individual orders are limited to 1 MEAL and 1 DRINK maximum.'
        })
      }
    }

    // ── Calculate total amount ─────────────────────────────
    let totalAmount = 0
    const itemDetails = []

    for (const item of items) {
      const menuItem = await pool.request()
        .input('id', item.menu_item_id)
        .query('SELECT id, name, price, item_type FROM MenuItems WHERE id = @id')

      const mi = menuItem.recordset[0]
      totalAmount += parseFloat(mi.price) * item.quantity
      itemDetails.push({ ...mi, quantity: item.quantity })
    }

    // ── Generate token number ──────────────────────────────
    // Token resets each day per break period.
    // E.g. first Lunch Break order of the day = T001
    const tokenResult = await pool.request()
      .input('break_period_id', break_period_id)
      .query(`
        SELECT COUNT(*) AS count
        FROM Orders
        WHERE break_period_id = @break_period_id
          AND CAST(placed_at AS DATE) = CAST(GETDATE() AS DATE)
      `)

    const tokenNumber = tokenResult.recordset[0].count + 1

    // ── Handle group leader ────────────────────────────────
    let groupLeaderId = null
    if (order_type === 'GROUP') {
      groupLeaderId = userId
    }

    // ── Insert order ───────────────────────────────────────
    const orderResult = await pool.request()
      .input('user_id',         userId)
      .input('break_period_id', break_period_id)
      .input('order_type',      order_type)
      .input('token_number',    tokenNumber)
      .input('total_amount',    totalAmount)
      .input('group_leader_id', groupLeaderId)
      .query(`
        INSERT INTO Orders
          (user_id, break_period_id, order_type, status, token_number, total_amount, group_leader_id)
        OUTPUT INSERTED.id
        VALUES
          (@user_id, @break_period_id, @order_type, 'PENDING', @token_number, @total_amount, @group_leader_id)
      `)

    const orderId = orderResult.recordset[0].id

    // ── Insert order items ─────────────────────────────────
    for (const item of itemDetails) {
      await pool.request()
        .input('order_id',     orderId)
        .input('menu_item_id', item.id)
        .input('quantity',     item.quantity)
        .input('unit_price',   item.price)
        .query(`
          INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price)
          VALUES (@order_id, @menu_item_id, @quantity, @unit_price)
        `)

      // Decrement stock
      await pool.request()
        .input('qty', item.quantity)
        .input('id',  item.id)
        .query('UPDATE MenuItems SET stock_qty = stock_qty - @qty WHERE id = @id')
    }

    // ── Insert group members ───────────────────────────────
    if (order_type === 'GROUP' && member_college_ids && member_college_ids.length > 0) {
      for (const college_id of member_college_ids) {
        const member = await pool.request()
          .input('college_id', college_id)
          .query('SELECT id FROM Users WHERE college_id = @college_id AND role = @role',
            { role: 'STUDENT' })

        // Silently skip unknown college IDs
        if (member.recordset[0]) {
          await pool.request()
            .input('order_id',       orderId)
            .input('member_user_id', member.recordset[0].id)
            .query('INSERT INTO GroupMembers (order_id, member_user_id) VALUES (@order_id, @member_user_id)')
        }
      }
    }

    // ── Create pending payment record ──────────────────────
    // Payment row is created immediately so the payment step
    // knows which order it belongs to.
    await pool.request()
      .input('order_id', orderId)
      .input('amount',   totalAmount)
      .query(`
        INSERT INTO Payments (order_id, method, amount, status)
        VALUES (@order_id, 'ESEWA', @amount, 'PENDING')
      `)

    return res.status(201).json({
      message:      'Order placed successfully. Please complete payment.',
      order_id:     orderId,
      token_number: tokenNumber,
      total_amount: totalAmount,
      status:       'PENDING'
    })
  } catch (error) {
    console.error('placeOrder error:', error.message)
    return res.status(500).json({ error: 'Server error placing order.' })
  }
}

// ── GET /api/orders/my ─────────────────────────────────────
// Returns the logged-in student's orders for today.
// Frontend polls this every 5 seconds to update order status.
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.request()
      .input('user_id', userId)
      .query(`
        SELECT
          o.id, o.token_number, o.order_type, o.status,
          o.total_amount, o.placed_at,
          b.name AS break_name,
          p.status AS payment_status, p.method AS payment_method
        FROM Orders o
        JOIN BreakPeriods b ON o.break_period_id = b.id
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.user_id = @user_id
          AND CAST(o.placed_at AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY o.placed_at DESC
      `)

    const orders = result.recordset

    for (const order of orders) {
      const items = await pool.request()
        .input('order_id', order.id)
        .query(`
          SELECT oi.quantity, oi.unit_price, m.name AS item_name, m.item_type
          FROM OrderItems oi
          JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
    }

    return res.status(200).json({ orders })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching your orders.' })
  }
}

// ── GET /api/orders/history ────────────────────────────────
// Returns all past orders for the student — not just today.
const getOrderHistory = async (req, res) => {
  try {
    const result = await pool.request()
      .input('user_id', req.user.id)
      .query(`
        SELECT
          o.id, o.token_number, o.order_type, o.status,
          o.total_amount, o.placed_at,
          b.name AS break_name,
          p.status AS payment_status
        FROM Orders o
        JOIN BreakPeriods b ON o.break_period_id = b.id
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.user_id = @user_id
        ORDER BY o.placed_at DESC
      `)

    return res.status(200).json({ orders: result.recordset })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching order history.' })
  }
}

// ── GET /api/orders/menu ───────────────────────────────────
// Returns today's available menu for students.
// Only shows items that are available and have stock.
const getStudentMenu = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT
        m.id, m.name, m.price, m.stock_qty, m.item_type,
        c.name AS category_name
      FROM MenuItems m
      JOIN Categories c ON m.category_id = c.id
      WHERE m.is_available = 1 AND m.stock_qty > 0
      ORDER BY c.name, m.name
    `)

    const breaks = await pool.request().query(`
      SELECT id, name, start_time, cutoff_time, end_time
      FROM BreakPeriods
      WHERE is_active = 1
      ORDER BY start_time
    `)

    return res.status(200).json({
      menuItems:    result.recordset,
      breakPeriods: breaks.recordset
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching menu.' })
  }
}

module.exports = { placeOrder, getMyOrders, getOrderHistory, getStudentMenu }

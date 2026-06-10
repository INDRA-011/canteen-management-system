const { pool } = require('../config/db')

const getCurrentTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
}

// POST /api/orders
const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id
    const { pickup_time, order_type, items, member_college_ids } = req.body

    if (!pickup_time || !order_type || !items || items.length === 0) {
      return res.status(400).json({ error: 'pickup_time, order_type, and items are required.' })
    }
    if (!['INDIVIDUAL','GROUP'].includes(order_type)) {
      return res.status(400).json({ error: 'order_type must be INDIVIDUAL or GROUP.' })
    }

    // Check canteen is open
    const settingsRes = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    const settings = settingsRes.recordset[0]
    if (!settings) return res.status(400).json({ error: 'Canteen settings not configured.' })

    const now = getCurrentTime()
    if (!settings.is_open || now < settings.open_time || now > settings.close_time) {
      return res.status(400).json({ error: `Canteen is closed. Hours: ${settings.open_time}–${settings.close_time}.` })
    }

    // Validate items & check stock
    let mealCount = 0, drinkCount = 0
    for (const item of items) {
      const mi = await pool.request()
        .input('id', item.menu_item_id)
        .query('SELECT item_type, is_available, stock_qty FROM MenuItems WHERE id = @id')
      if (!mi.recordset[0]) return res.status(400).json({ error: `Menu item ${item.menu_item_id} not found.` })
      const m = mi.recordset[0]
      if (!m.is_available) return res.status(400).json({ error: 'One or more items are unavailable.' })
      if (m.stock_qty < item.quantity) return res.status(400).json({ error: `Insufficient stock for item ${item.menu_item_id}.` })
      if (m.item_type === 'MEAL')  mealCount++
      if (m.item_type === 'DRINK') drinkCount++
    }
    if (order_type === 'INDIVIDUAL' && (mealCount > 1 || drinkCount > 1)) {
      return res.status(400).json({ error: 'Individual orders: max 1 MEAL and 1 DRINK.' })
    }

    // Calculate total
    let totalAmount = 0
    const itemDetails = []
    for (const item of items) {
      const mi = await pool.request()
        .input('id', item.menu_item_id)
        .query('SELECT id, name, price, item_type FROM MenuItems WHERE id = @id')
      const m = mi.recordset[0]
      totalAmount += parseFloat(m.price) * item.quantity
      itemDetails.push({ ...m, quantity: item.quantity })
    }

    // Token number — count orders today
    const tokenRes = await pool.request().query(`
      SELECT COUNT(*) AS count FROM Orders
      WHERE CAST(placed_at AS DATE) = CAST(GETDATE() AS DATE)
    `)
    const tokenNumber = tokenRes.recordset[0].count + 1

    // Insert order
    const orderRes = await pool.request()
      .input('user_id',      userId)
      .input('pickup_time',  pickup_time)
      .input('order_type',   order_type)
      .input('token_number', tokenNumber)
      .input('total_amount', totalAmount)
      .input('group_leader_id', order_type === 'GROUP' ? userId : null)
      .query(`
        INSERT INTO Orders (user_id, pickup_time, order_type, status, token_number, total_amount, group_leader_id)
        OUTPUT INSERTED.id
        VALUES (@user_id, @pickup_time, @order_type, 'PENDING', @token_number, @total_amount, @group_leader_id)
      `)

    const orderId = orderRes.recordset[0].id

    // Insert items + decrement stock
    for (const item of itemDetails) {
      await pool.request()
        .input('order_id',     orderId)
        .input('menu_item_id', item.id)
        .input('quantity',     item.quantity)
        .input('unit_price',   item.price)
        .query('INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price) VALUES (@order_id, @menu_item_id, @quantity, @unit_price)')
      await pool.request()
        .input('qty', item.quantity)
        .input('id',  item.id)
        .query('UPDATE MenuItems SET stock_qty = stock_qty - @qty WHERE id = @id')
    }

    // Group members
    if (order_type === 'GROUP' && member_college_ids?.length > 0) {
      for (const college_id of member_college_ids) {
        const member = await pool.request()
          .input('college_id', college_id)
          .query("SELECT id FROM Users WHERE college_id = @college_id AND role = 'STUDENT'")
        if (member.recordset[0]) {
          await pool.request()
            .input('order_id',       orderId)
            .input('member_user_id', member.recordset[0].id)
            .query('INSERT INTO GroupMembers (order_id, member_user_id) VALUES (@order_id, @member_user_id)')
        }
      }
    }

    // Create pending payment
    await pool.request()
      .input('order_id', orderId)
      .input('amount',   totalAmount)
      .query("INSERT INTO Payments (order_id, method, amount, status) VALUES (@order_id, 'ESEWA', @amount, 'PENDING')")

    return res.status(201).json({
      message:      'Order placed. Please complete payment.',
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

// GET /api/orders/my
const getMyOrders = async (req, res) => {
  try {
    const result = await pool.request()
      .input('user_id', req.user.id)
      .query(`
        SELECT o.id, o.token_number, o.order_type, o.status,
               o.total_amount, o.placed_at, o.pickup_time,
               p.status AS payment_status, p.method AS payment_method
        FROM Orders o
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
          SELECT oi.quantity, oi.unit_price, m.name, m.item_type
          FROM OrderItems oi JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
    }
    return res.status(200).json({ orders })
  } catch (error) {
    console.error('getMyOrders error:', error.message)
    return res.status(500).json({ error: 'Server error fetching orders.' })
  }
}

// GET /api/orders/history
const getOrderHistory = async (req, res) => {
  try {
    const result = await pool.request()
      .input('user_id', req.user.id)
      .query(`
        SELECT o.id, o.token_number, o.order_type, o.status,
               o.total_amount, o.placed_at, o.pickup_time,
               p.status AS payment_status, p.method AS payment_method
        FROM Orders o
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.user_id = @user_id
        ORDER BY o.placed_at DESC
      `)

    const orders = result.recordset
    for (const order of orders) {
      const items = await pool.request()
        .input('order_id', order.id)
        .query(`
          SELECT oi.quantity, oi.unit_price, m.name, m.item_type
          FROM OrderItems oi JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
    }
    return res.status(200).json({ orders })
  } catch (error) {
    console.error('getOrderHistory error:', error.message)
    return res.status(500).json({ error: 'Server error fetching history.' })
  }
}

// GET /api/orders/menu
const getStudentMenu = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT m.id, m.name, m.price, m.stock_qty, m.item_type, m.is_available,
             c.name AS category_name
      FROM MenuItems m
      JOIN Categories c ON m.category_id = c.id
      WHERE m.is_available = 1 AND m.stock_qty > 0
      ORDER BY c.name, m.name
    `)

    const settingsRes = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    const settings = settingsRes.recordset[0] || {}

    // Generate slots
    const slots = []
    if (settings.open_time && settings.close_time) {
      const [oh, om] = settings.open_time.split(':').map(Number)
      const [ch, cm] = settings.close_time.split(':').map(Number)
      let cur = oh * 60 + om
      const end = ch * 60 + cm
      const interval = settings.slot_interval_minutes || 15
      while (cur < end) {
        const h = String(Math.floor(cur/60)).padStart(2,'0')
        const m = String(cur%60).padStart(2,'0')
        slots.push(`${h}:${m}`)
        cur += interval
      }
    }

    return res.status(200).json({
      menuItems: result.recordset,
      settings: {
        is_open:    settings.is_open,
        open_time:  settings.open_time,
        close_time: settings.close_time,
      },
      slots,
    })
  } catch (error) {
    console.error('getStudentMenu error:', error.message)
    return res.status(500).json({ error: 'Server error fetching menu.' })
  }
}

module.exports = { placeOrder, getMyOrders, getOrderHistory, getStudentMenu }

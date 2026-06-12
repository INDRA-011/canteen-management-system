const { pool } = require('../config/db')
const { getCurrentTimeNepal } = require('../utils/time')

const MAX_QTY_PER_ITEM = 5          // per menu item, any order type
const MAX_GROUP_SIZE   = 10         // max members in a group order

// POST /api/orders
const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id
    const { pickup_time, order_type, items, member_college_ids } = req.body

    if (!pickup_time || !order_type || !items || items.length === 0)
      return res.status(400).json({ error: 'pickup_time, order_type, and items are required.' })
    if (!['INDIVIDUAL','GROUP'].includes(order_type))
      return res.status(400).json({ error: 'order_type must be INDIVIDUAL or GROUP.' })

    // Per-item quantity sanity check (applies to both order types)
    for (const item of items) {
      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ error: 'Each item must have a quantity of at least 1.' })
      }
      if (item.quantity > MAX_QTY_PER_ITEM) {
        return res.status(400).json({ error: `Maximum ${MAX_QTY_PER_ITEM} of any single item per order.` })
      }
    }

    // Check canteen is open
    const sr = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    const settings = sr.recordset[0]
    if (!settings) return res.status(400).json({ error: 'Canteen settings not configured.' })
    const now = getCurrentTimeNepal()
    if (!settings.is_open || now < settings.open_time || now > settings.close_time)
      return res.status(400).json({ error: `Canteen is closed. Hours: ${settings.open_time}–${settings.close_time}.` })

    // Validate group order — must have members and a sane size
    let groupMemberIds = []
    if (order_type === 'GROUP') {
      const ids = Array.isArray(member_college_ids) ? member_college_ids.filter(Boolean) : []
      if (ids.length === 0)
        return res.status(400).json({ error: 'Group orders require at least one other member\'s College ID.' })
      if (ids.length > MAX_GROUP_SIZE)
        return res.status(400).json({ error: `Group orders support up to ${MAX_GROUP_SIZE} members.` })

      // Resolve college IDs → user IDs, skip unknown/self
      for (const college_id of ids) {
        const member = await pool.request()
          .input('college_id', college_id)
          .query("SELECT id FROM Users WHERE college_id = @college_id AND role = 'STUDENT'")
        const m = member.recordset[0]
        if (m && m.id !== userId) groupMemberIds.push(m.id)
      }
      if (groupMemberIds.length === 0)
        return res.status(400).json({ error: 'None of the provided College IDs matched a valid student.' })

      // Group order item quantity must roughly match group size (leader + members)
      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)
      const groupSize = groupMemberIds.length + 1
      if (totalQty > groupSize * 2) // generous: up to 2 items per person (1 meal + 1 drink)
        return res.status(400).json({ error: `Order has too many items for a group of ${groupSize}. Max ${groupSize * 2} items total.` })
    }

    // Validate items — check availability only, NOT stock (Option B)
    let mealCount = 0, drinkCount = 0
    const itemDetails = []

    for (const item of items) {
      const mi = await pool.request()
        .input('id', item.menu_item_id)
        .query('SELECT id, name, price, item_type, is_available, stock_qty FROM MenuItems WHERE id = @id')
      if (!mi.recordset[0])
        return res.status(400).json({ error: `Menu item ${item.menu_item_id} not found.` })
      const m = mi.recordset[0]
      if (!m.is_available)
        return res.status(400).json({ error: `"${m.name}" is currently unavailable.` })
      if (m.item_type === 'MEAL')  mealCount += item.quantity
      if (m.item_type === 'DRINK') drinkCount += item.quantity
      itemDetails.push({ ...m, quantity: item.quantity })
    }

    // Individual orders: max 1 meal + 1 drink total
    if (order_type === 'INDIVIDUAL' && (mealCount > 1 || drinkCount > 1))
      return res.status(400).json({ error: 'Individual orders are limited to 1 meal and 1 drink. For larger orders, use Group order.' })

    // Calculate total
    const totalAmount = itemDetails.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0)

    // Token number — count today's orders
    const tokenRes = await pool.request().query(`
      SELECT COUNT(*) AS count FROM Orders
      WHERE CAST(placed_at AS DATE) = CAST(GETDATE() AS DATE)
    `)
    const tokenNumber = tokenRes.recordset[0].count + 1

    // Insert order — NO stock decrement here (Option B)
    const orderRes = await pool.request()
      .input('user_id',         userId)
      .input('pickup_time',     pickup_time)
      .input('order_type',      order_type)
      .input('token_number',    tokenNumber)
      .input('total_amount',    totalAmount)
      .input('group_leader_id', order_type === 'GROUP' ? userId : null)
      .query(`
        INSERT INTO Orders (user_id, pickup_time, order_type, status, token_number, total_amount, group_leader_id)
        OUTPUT INSERTED.id
        VALUES (@user_id, @pickup_time, @order_type, 'PENDING', @token_number, @total_amount, @group_leader_id)
      `)
    const orderId = orderRes.recordset[0].id

    // Insert order items
    for (const item of itemDetails) {
      await pool.request()
        .input('order_id',     orderId)
        .input('menu_item_id', item.id)
        .input('quantity',     item.quantity)
        .input('unit_price',   item.price)
        .query('INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price) VALUES (@order_id, @menu_item_id, @quantity, @unit_price)')
    }

    // Insert resolved group members
    for (const memberUserId of groupMemberIds) {
      await pool.request()
        .input('order_id', orderId)
        .input('member_user_id', memberUserId)
        .query('INSERT INTO GroupMembers (order_id, member_user_id) VALUES (@order_id, @member_user_id)')
    }

    // Create pending payment record
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
          SELECT oi.quantity, oi.unit_price, m.name, m.item_type, m.image_url
          FROM OrderItems oi JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
    }
    return res.status(200).json({ orders })
  } catch (error) {
    console.error('getMyOrders error:', error.message)
    return res.status(500).json({ error: 'Server error.' })
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
          SELECT oi.quantity, oi.unit_price, m.name, m.item_type, m.image_url
          FROM OrderItems oi JOIN MenuItems m ON oi.menu_item_id = m.id
          WHERE oi.order_id = @order_id
        `)
      order.items = items.recordset
    }
    return res.status(200).json({ orders })
  } catch (error) {
    console.error('getOrderHistory error:', error.message)
    return res.status(500).json({ error: 'Server error.' })
  }
}

// GET /api/orders/menu
// Slots are generated live from CanteenSettings on every call —
// any admin change to hours/interval is reflected immediately.
const getStudentMenu = async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT m.id, m.name, m.price, m.stock_qty, m.item_type, m.is_available,
             m.image_url, c.name AS category_name
      FROM MenuItems m
      JOIN Categories c ON m.category_id = c.id
      WHERE m.is_available = 1
      ORDER BY c.name, m.name
    `)
    const settingsRes = await pool.request().query('SELECT TOP 1 * FROM CanteenSettings')
    const s = settingsRes.recordset[0] || {}
    const slots = []
    if (s.open_time && s.close_time) {
      const [oh,om] = s.open_time.split(':').map(Number)
      const [ch,cm] = s.close_time.split(':').map(Number)
      const blocked = s.blocked_slots ? s.blocked_slots.split(',').map(x => x.trim()) : []
      for (let cur = oh*60+om; cur < ch*60+cm; cur += (s.slot_interval_minutes||15)) {
        const slot = String(Math.floor(cur/60)).padStart(2,'0')+':'+String(cur%60).padStart(2,'0')
        if (!blocked.includes(slot)) slots.push(slot)
      }
    }
    return res.status(200).json({
      menuItems: result.recordset,
      settings: { is_open: s.is_open, open_time: s.open_time, close_time: s.close_time },
      slots,
      max_qty_per_item: MAX_QTY_PER_ITEM,
      max_group_size: MAX_GROUP_SIZE,
    })
  } catch (error) {
    console.error('getStudentMenu error:', error.message)
    return res.status(500).json({ error: 'Server error fetching menu.' })
  }
}

module.exports = { placeOrder, getMyOrders, getOrderHistory, getStudentMenu }

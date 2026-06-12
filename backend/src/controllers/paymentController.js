const { pool } = require('../config/db')
const crypto   = require('crypto')

const initiateEsewa = async (req, res) => {
  try {
    const { order_id } = req.body
    const userId = req.user.id

    const orderResult = await pool.request()
      .input('id', order_id)
      .input('user_id', userId)
      .query(`
        SELECT o.id, o.total_amount, o.status, p.status AS payment_status
        FROM Orders o
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.id = @id AND o.user_id = @user_id
      `)

    const order = orderResult.recordset[0]
    if (!order) return res.status(404).json({ error: 'Order not found.' })
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order is not in a payable state.' })

    const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST'
    const ESEWA_SECRET_KEY   = process.env.ESEWA_SECRET_KEY   || '8gBm/:&EnhH.1/q'
    const ESEWA_GATEWAY_URL  = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    const BACKEND_URL        = process.env.BACKEND_URL        || 'http://localhost:5000'

    const amount       = parseFloat(order.total_amount)
    const total_amount = amount
    const txn_uuid     = `CANTEEN-${order_id}-${Date.now()}`
    const success_url  = `${BACKEND_URL}/api/payments/esewa/callback?status=success&oid=${order_id}`
    const failure_url  = `${BACKEND_URL}/api/payments/esewa/callback?status=failure&oid=${order_id}`

    const signatureString = `total_amount=${total_amount},transaction_uuid=${txn_uuid},product_code=${ESEWA_PRODUCT_CODE}`
    const signature = crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(signatureString).digest('base64')

    await pool.request()
      .input('txn_id', txn_uuid)
      .input('method', 'ESEWA')
      .input('order_id', order_id)
      .query('UPDATE Payments SET txn_id = @txn_id, method = @method WHERE order_id = @order_id')

    return res.status(200).json({
      gateway_url: ESEWA_GATEWAY_URL,
      form_data: {
        amount, tax_amount: 0, total_amount,
        transaction_uuid: txn_uuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url, failure_url,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature
      }
    })
  } catch (error) {
    console.error('eSewa initiate error:', error.message)
    return res.status(500).json({ error: 'Server error initiating eSewa payment.' })
  }
}

const esewaCallback = async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
  try {
    const { data, oid } = req.query
    if (!data) return res.redirect(`${FRONTEND_URL}/student/payment?status=failed`)

    const decoded = JSON.parse(Buffer.from(data, 'base64').toString())
    const { transaction_uuid, status } = decoded

    if (status !== 'COMPLETE') {
      await pool.request()
        .input('txn_id', transaction_uuid)
        .query(`
          UPDATE Payments SET status = 'FAILED' WHERE txn_id = @txn_id;
          UPDATE Orders SET status = 'CANCELLED' WHERE id = (SELECT order_id FROM Payments WHERE txn_id = @txn_id)
        `)
      return res.redirect(`${FRONTEND_URL}/student/payment?status=failed&oid=${oid || ''}`)
    }

    // Payment verified — mark payment VERIFIED. Order stays PENDING for admin to CONFIRM (Option B)
    await pool.request()
      .input('txn_id', transaction_uuid)
      .query("UPDATE Payments SET status = 'VERIFIED', paid_at = GETDATE() WHERE txn_id = @txn_id")

    const payResult = await pool.request()
      .input('txn_id', transaction_uuid)
      .query('SELECT order_id FROM Payments WHERE txn_id = @txn_id')

    const orderId = payResult.recordset[0]?.order_id ?? oid
    return res.redirect(`${FRONTEND_URL}/student/payment?status=success&oid=${orderId}`)
  } catch (error) {
    console.error('eSewa callback error:', error.message)
    return res.redirect(`${FRONTEND_URL}/student/payment?status=failed`)
  }
}

const initiateKhalti = async (req, res) => {
  try {
    const { order_id } = req.body
    const userId = req.user.id

    const orderResult = await pool.request()
      .input('id', order_id)
      .input('user_id', userId)
      .query(`
        SELECT o.id, o.total_amount, o.status, u.name, u.email, u.phone
        FROM Orders o JOIN Users u ON o.user_id = u.id
        WHERE o.id = @id AND o.user_id = @user_id
      `)

    const order = orderResult.recordset[0]
    if (!order) return res.status(404).json({ error: 'Order not found.' })
    if (order.status !== 'PENDING') return res.status(400).json({ error: 'Order is not in a payable state.' })

    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'
    const BACKEND_URL       = process.env.BACKEND_URL       || 'http://localhost:5000'
    const amountPaisa       = parseFloat(order.total_amount) * 100

    const khaltiRes = await fetch('https://a.khalti.com/api/v2/epayment/initiate/', {
      method: 'POST',
      headers: { 'Authorization': `Key ${KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        return_url: `${BACKEND_URL}/api/payments/khalti/callback`,
        website_url: BACKEND_URL,
        amount: amountPaisa,
        purchase_order_id: `ORDER-${order_id}`,
        purchase_order_name: `TCMIT Canteen Order #${order_id}`,
        customer_info: { name: order.name, email: order.email, phone: order.phone }
      })
    })

    const khaltiData = await khaltiRes.json()
    if (!khaltiRes.ok) return res.status(400).json({ error: 'Khalti initiation failed.', details: khaltiData })

    await pool.request()
      .input('txn_id', khaltiData.pidx)
      .input('method', 'KHALTI')
      .input('order_id', order_id)
      .query('UPDATE Payments SET txn_id = @txn_id, method = @method WHERE order_id = @order_id')

    return res.status(200).json({ payment_url: khaltiData.payment_url, pidx: khaltiData.pidx })
  } catch (error) {
    console.error('Khalti initiate error:', error.message)
    return res.status(500).json({ error: 'Server error initiating Khalti payment.' })
  }
}

const khaltiCallback = async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
  try {
    const { pidx, status, purchase_order_id } = req.query
    const orderId = purchase_order_id?.replace('ORDER-', '')

    if (status !== 'Completed') {
      if (orderId) {
        await pool.request()
          .input('order_id', orderId)
          .query(`
            UPDATE Payments SET status = 'FAILED' WHERE order_id = @order_id;
            UPDATE Orders SET status = 'CANCELLED' WHERE id = @order_id
          `)
      }
      return res.redirect(`${FRONTEND_URL}/student/payment?status=failed&oid=${orderId || ''}`)
    }

    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'
    const verifyRes = await fetch('https://a.khalti.com/api/v2/epayment/lookup/', {
      method: 'POST',
      headers: { 'Authorization': `Key ${KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pidx })
    })
    const verifyData = await verifyRes.json()

    if (verifyData.status !== 'Completed') {
      return res.redirect(`${FRONTEND_URL}/student/payment?status=failed&oid=${orderId || ''}`)
    }

    // Mark payment VERIFIED — order stays PENDING for admin to CONFIRM (Option B)
    await pool.request()
      .input('pidx', pidx)
      .query("UPDATE Payments SET status = 'VERIFIED', paid_at = GETDATE() WHERE txn_id = @pidx")

    return res.redirect(`${FRONTEND_URL}/student/payment?status=success&oid=${orderId || ''}`)
  } catch (error) {
    console.error('Khalti callback error:', error.message)
    return res.redirect(`${FRONTEND_URL}/student/payment?status=failed`)
  }
}

const getPaymentStatus = async (req, res) => {
  try {
    const result = await pool.request()
      .input('order_id', req.params.order_id)
      .input('user_id', req.user.id)
      .query(`
        SELECT p.status AS payment_status, p.method, p.paid_at,
               o.id, o.status AS order_status, o.token_number, o.total_amount, o.pickup_time
        FROM Payments p
        JOIN Orders o ON p.order_id = o.id
        WHERE p.order_id = @order_id AND o.user_id = @user_id
      `)

    if (!result.recordset[0]) return res.status(404).json({ error: 'Payment not found.' })
    return res.status(200).json(result.recordset[0])
  } catch (error) {
    console.error('getPaymentStatus error:', error.message)
    return res.status(500).json({ error: 'Server error fetching payment status.' })
  }
}

module.exports = { initiateEsewa, esewaCallback, initiateKhalti, khaltiCallback, getPaymentStatus }

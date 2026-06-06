const { pool } = require('../config/db')
const crypto   = require('crypto')

// ── What are eSewa and Khalti? ─────────────────────────────
// Both are Nepal's most popular digital payment gateways.
// They expose REST APIs. We send payment details → they
// redirect the user to their checkout → they call us back
// with success/failure → we verify and update the order.

// ── ESEWA ──────────────────────────────────────────────────
// POST /api/payments/esewa/initiate
// What it does: generates the signed form data that the
// frontend uses to redirect the student to eSewa checkout.
// eSewa uses a signature-based verification — we sign the
// amount + order_id with our secret key.
const initiateEsewa = async (req, res) => {
  try {
    const { order_id } = req.body
    const userId = req.user.id

    // Fetch the order and verify it belongs to this student
    const orderResult = await pool.request()
      .input('id',      order_id)
      .input('user_id', userId)
      .query(`
        SELECT o.id, o.total_amount, o.status, p.status AS payment_status
        FROM Orders o
        LEFT JOIN Payments p ON o.id = p.order_id
        WHERE o.id = @id AND o.user_id = @user_id
      `)

    const order = orderResult.recordset[0]

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is not in a payable state.' })
    }

    // eSewa sandbox credentials
    // In production: replace with your live merchant credentials
    const ESEWA_PRODUCT_CODE  = process.env.ESEWA_PRODUCT_CODE  || 'EPAYTEST'
    const ESEWA_SECRET_KEY    = process.env.ESEWA_SECRET_KEY    || '8gBm/:&EnhH.1/q'
    const ESEWA_GATEWAY_URL   = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    const BACKEND_URL         = process.env.BACKEND_URL         || 'http://localhost:5000'

    const amount        = parseFloat(order.total_amount)
    const tax_amount    = 0
    const total_amount  = amount
    const txn_uuid      = `CANTEEN-${order_id}-${Date.now()}`
    const success_url   = `${BACKEND_URL}/api/payments/esewa/callback?status=success`
    const failure_url   = `${BACKEND_URL}/api/payments/esewa/callback?status=failure`

    // eSewa requires HMAC-SHA256 signature of specific fields
    // Format: total_amount,transaction_uuid,product_code
    const signatureString = `total_amount=${total_amount},transaction_uuid=${txn_uuid},product_code=${ESEWA_PRODUCT_CODE}`
    const signature = crypto
      .createHmac('sha256', ESEWA_SECRET_KEY)
      .update(signatureString)
      .digest('base64')

    // Update payment record with the txn_uuid so we can match
    // it when the callback comes in
    await pool.request()
      .input('txn_id',   txn_uuid)
      .input('method',   'ESEWA')
      .input('order_id', order_id)
      .query(`
        UPDATE Payments
        SET txn_id = @txn_id, method = @method
        WHERE order_id = @order_id
      `)

    // Return form data — frontend posts this to eSewa gateway
    return res.status(200).json({
      gateway_url: ESEWA_GATEWAY_URL,
      form_data: {
        amount,
        tax_amount,
        total_amount,
        transaction_uuid: txn_uuid,
        product_code:     ESEWA_PRODUCT_CODE,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url,
        failure_url,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature
      }
    })
  } catch (error) {
    console.error('eSewa initiate error:', error.message)
    return res.status(500).json({ error: 'Server error initiating eSewa payment.' })
  }
}

// ── GET /api/payments/esewa/callback ──────────────────────
// What it does: eSewa calls this URL after payment.
// We verify the payment is genuine by calling eSewa's
// verification API, then update our database.
const esewaCallback = async (req, res) => {
  try {
    const { data } = req.query

    if (!data) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=failed`)
    }

    // Decode the base64 response from eSewa
    const decoded     = JSON.parse(Buffer.from(data, 'base64').toString())
    const { transaction_uuid, status, total_amount } = decoded

    if (status !== 'COMPLETE') {
      // Payment failed — cancel the order
      await pool.request()
        .input('txn_id', transaction_uuid)
        .query(`
          UPDATE Payments SET status = 'FAILED' WHERE txn_id = @txn_id;
          UPDATE Orders SET status = 'CANCELLED'
          WHERE id = (SELECT order_id FROM Payments WHERE txn_id = @txn_id)
        `)
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=failed`)
    }

    // Payment succeeded — update both tables
    await pool.request()
      .input('txn_id', transaction_uuid)
      .query(`
        UPDATE Payments
        SET status = 'VERIFIED', paid_at = GETDATE()
        WHERE txn_id = @txn_id
      `)

    // Get the order_id from payment record and restore stock note:
    // stock was already decremented on order placement, so no change needed
    const payResult = await pool.request()
      .input('txn_id', transaction_uuid)
      .query('SELECT order_id FROM Payments WHERE txn_id = @txn_id')

    if (payResult.recordset[0]) {
      await pool.request()
        .input('order_id', payResult.recordset[0].order_id)
        .query("UPDATE Orders SET status = 'PENDING' WHERE id = @order_id")
    }

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=success`)
  } catch (error) {
    console.error('eSewa callback error:', error.message)
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=failed`)
  }
}

// ── KHALTI ─────────────────────────────────────────────────
// POST /api/payments/khalti/initiate
// What it does: calls Khalti's initiate API and returns
// a payment_url that the frontend redirects the student to.
// Khalti uses a simpler server-to-server API call model.
const initiateKhalti = async (req, res) => {
  try {
    const { order_id } = req.body
    const userId = req.user.id

    const orderResult = await pool.request()
      .input('id',      order_id)
      .input('user_id', userId)
      .query(`
        SELECT o.id, o.total_amount, o.status,
               u.name, u.email, u.phone
        FROM Orders o
        JOIN Users u ON o.user_id = u.id
        WHERE o.id = @id AND o.user_id = @user_id
      `)

    const order = orderResult.recordset[0]

    if (!order) return res.status(404).json({ error: 'Order not found.' })
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is not in a payable state.' })
    }

    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'
    const BACKEND_URL       = process.env.BACKEND_URL       || 'http://localhost:5000'

    // Khalti amount is in paisa (1 Rs = 100 paisa)
    const amountPaisa = parseFloat(order.total_amount) * 100

    // Call Khalti initiate API
    const khaltiRes = await fetch('https://a.khalti.com/api/v2/epayment/initiate/', {
      method:  'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        return_url:     `${BACKEND_URL}/api/payments/khalti/callback`,
        website_url:    BACKEND_URL,
        amount:         amountPaisa,
        purchase_order_id:   `ORDER-${order_id}`,
        purchase_order_name: `TCMIT Canteen Order #${order_id}`,
        customer_info: {
          name:  order.name,
          email: order.email,
          phone: order.phone
        }
      })
    })

    const khaltiData = await khaltiRes.json()

    if (!khaltiRes.ok) {
      return res.status(400).json({ error: 'Khalti initiation failed.', details: khaltiData })
    }

    // Store the pidx (Khalti's payment ID) as our txn_id
    await pool.request()
      .input('txn_id',   khaltiData.pidx)
      .input('method',   'KHALTI')
      .input('order_id', order_id)
      .query(`
        UPDATE Payments
        SET txn_id = @txn_id, method = @method
        WHERE order_id = @order_id
      `)

    return res.status(200).json({
      payment_url: khaltiData.payment_url,
      pidx:        khaltiData.pidx
    })
  } catch (error) {
    console.error('Khalti initiate error:', error.message)
    return res.status(500).json({ error: 'Server error initiating Khalti payment.' })
  }
}

// ── GET /api/payments/khalti/callback ─────────────────────
// What it does: Khalti redirects here after payment.
// We verify with Khalti's lookup API then update the DB.
const khaltiCallback = async (req, res) => {
  try {
    const { pidx, status, transaction_id, purchase_order_id } = req.query

    if (status !== 'Completed') {
      const orderId = purchase_order_id?.replace('ORDER-', '')
      if (orderId) {
        await pool.request()
          .input('order_id', orderId)
          .query(`
            UPDATE Payments SET status = 'FAILED' WHERE order_id = @order_id;
            UPDATE Orders SET status = 'CANCELLED' WHERE id = @order_id
          `)
      }
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=failed`)
    }

    // Verify with Khalti lookup API
    const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234'
    const verifyRes = await fetch('https://a.khalti.com/api/v2/epayment/lookup/', {
      method:  'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ pidx })
    })

    const verifyData = await verifyRes.json()

    if (verifyData.status !== 'Completed') {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=failed`)
    }

    await pool.request()
      .input('pidx', pidx)
      .query(`
        UPDATE Payments SET status = 'VERIFIED', paid_at = GETDATE() WHERE txn_id = @pidx
      `)

    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=success`)
  } catch (error) {
    console.error('Khalti callback error:', error.message)
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment?status=failed`)
  }
}

// ── GET /api/payments/status/:order_id ────────────────────
// What it does: returns current payment status for an order.
// Frontend polls this after redirect from gateway.
const getPaymentStatus = async (req, res) => {
  try {
    const result = await pool.request()
      .input('order_id', req.params.order_id)
      .query(`
        SELECT p.status, p.method, p.paid_at, o.status AS order_status
        FROM Payments p
        JOIN Orders o ON p.order_id = o.id
        WHERE p.order_id = @order_id AND o.user_id = @user_id
      `)

    if (!result.recordset[0]) {
      return res.status(404).json({ error: 'Payment not found.' })
    }

    return res.status(200).json({ payment: result.recordset[0] })
  } catch (error) {
    return res.status(500).json({ error: 'Server error fetching payment status.' })
  }
}

module.exports = { initiateEsewa, esewaCallback, initiateKhalti, khaltiCallback, getPaymentStatus }

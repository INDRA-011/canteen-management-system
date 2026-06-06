const express = require('express')
const router  = express.Router()
const { protect, mustChangePassword } = require('../middleware/auth')
const {
  initiateEsewa, esewaCallback,
  initiateKhalti, khaltiCallback,
  getPaymentStatus
} = require('../controllers/paymentController')

// Initiate routes require login
router.post('/esewa/initiate',  protect, mustChangePassword, initiateEsewa)
router.post('/khalti/initiate', protect, mustChangePassword, initiateKhalti)

// Callbacks come from the payment gateway — no auth token
// Gateway redirects the browser here after payment
router.get('/esewa/callback',  esewaCallback)
router.get('/khalti/callback', khaltiCallback)

// Status check — protected
router.get('/status/:order_id', protect, mustChangePassword, getPaymentStatus)

module.exports = router

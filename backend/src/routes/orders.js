const express = require('express')
const router  = express.Router()

const { protect, mustChangePassword } = require('../middleware/auth')
const { placeOrder, getMyOrders, getOrderHistory, getStudentMenu } = require('../controllers/orderController')

// All routes require login.
// mustChangePassword blocks access if student hasn't set their password yet.
router.use(protect, mustChangePassword)

router.get  ('/menu',    getStudentMenu)   // Today's menu + active breaks
router.post ('/',        placeOrder)       // Place an order
router.get  ('/my',      getMyOrders)      // Today's orders (for polling)
router.get  ('/history', getOrderHistory)  // All past orders

module.exports = router

const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const upload  = multer({ storage: multer.memoryStorage() })

const { protect, adminOnly } = require('../middleware/auth')
const { createStudent, bulkCreateStudents, getStudents, deleteStudent } = require('../controllers/adminController')
const { getMenuItems, getCategories, createMenuItem, updateMenuItem, toggleAvailability, deleteMenuItem } = require('../controllers/menuController')
const { getBreakPeriods, createBreakPeriod, updateBreakPeriod, toggleBreak } = require('../controllers/breakController')
const { getOrders, getOrderById, updateOrderStatus, getDashboardStats } = require('../controllers/orderQueueController')

router.use(protect, adminOnly)

// Student routes
router.get   ('/students',          getStudents)
router.post  ('/students',          createStudent)
router.post  ('/students/bulk',     upload.single('file'), bulkCreateStudents)
router.delete('/students/:id',      deleteStudent)

// Menu routes
router.get   ('/menu',              getMenuItems)
router.get   ('/menu/categories',   getCategories)
router.post  ('/menu',              createMenuItem)
router.patch ('/menu/:id',          updateMenuItem)
router.patch ('/menu/:id/toggle',   toggleAvailability)
router.delete('/menu/:id',          deleteMenuItem)

// Break period routes
router.get   ('/breaks',            getBreakPeriods)
router.post  ('/breaks',            createBreakPeriod)
router.patch ('/breaks/:id',        updateBreakPeriod)
router.patch ('/breaks/:id/toggle', toggleBreak)

// Order queue routes
router.get   ('/dashboard',         getDashboardStats)
router.get   ('/orders',            getOrders)
router.get   ('/orders/:id',        getOrderById)
router.patch ('/orders/:id/status', updateOrderStatus)

module.exports = router

const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/auth')
const { getSettings, getSlots } = require('../controllers/settingsController')

// Public to any logged-in user (student or admin)
router.get('/',      protect, getSettings)
router.get('/slots', protect, getSlots)

module.exports = router

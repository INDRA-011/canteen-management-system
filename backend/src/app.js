const express        = require('express')
const cors           = require('cors')
const authRoutes     = require('./routes/auth')
const adminRoutes    = require('./routes/admin')
const orderRoutes    = require('./routes/orders')
const paymentRoutes  = require('./routes/payments')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',     authRoutes)
app.use('/api/admin',    adminRoutes)
app.use('/api/orders',   orderRoutes)
app.use('/api/payments', paymentRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TCMIT Canteen API is running', time: new Date().toISOString() })
})

app.use((req, res) => res.status(404).json({ error: 'Route not found' }))
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app

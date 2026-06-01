require('dotenv').config()

const app            = require('./app')
const { pool, prisma } = require('./config/db')

const PORT = process.env.PORT || 5000

async function main() {
  try {
    await pool.connect()
    console.log('✅ SQL Server connected')

    app.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`)
      console.log(`📋 Health: http://localhost:${PORT}/api/health`)
    })
  } catch (err) {
    console.error('❌ Failed:', err.message)
    process.exit(1)
  }
}

main()

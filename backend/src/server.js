require('dotenv').config()
const { connect } = require('./config/db')
const { initScheduler } = require('./utils/scheduler')
const app = require('./app')
const PORT = process.env.PORT || 5000
async function main() {
  try {
    await connect()
    console.log('SQL Server connected')
    await initScheduler()
    app.listen(PORT, () => console.log('API running on http://localhost:' + PORT))
  } catch (err) { console.error('Failed:', err.message); process.exit(1) }
}
main()

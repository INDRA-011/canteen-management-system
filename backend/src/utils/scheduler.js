const cron = require('node-cron')
const db = require('../config/db')
const { getTodayNepal } = require('./time')

const scheduleDailyReport = () => {
  cron.schedule('59 23 * * *', async () => {
    try {
      const today = getTodayNepal()
      await db.pool.request()
        .input('today', today)
        .query(`
          INSERT INTO DailyReports (report_date, total_orders, total_revenue, cancelled_orders)
          SELECT @today, COUNT(*), ISNULL(SUM(total_amount),0),
                 SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END)
          FROM Orders WHERE CAST(placed_at AS DATE) = @today
        `)
      console.log('Daily report done for ' + today)
    } catch(err) { console.error('Report failed:', err.message) }
  }, { timezone: 'Asia/Kathmandu' })
  console.log('Daily report job scheduled (Asia/Kathmandu, 23:59)')
}

const initScheduler = async () => { scheduleDailyReport(); console.log('Scheduler active') }
module.exports = { initScheduler }

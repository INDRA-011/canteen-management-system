const cron = require('node-cron')
const db = require('../config/db')
const scheduleDailyReport = () => {
  cron.schedule('59 23 * * *', async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      await db.pool.request().query(
        "INSERT INTO DailyReports (report_date,total_orders,total_revenue,cancelled_orders) " +
        "SELECT '" + today + "',COUNT(*),ISNULL(SUM(total_amount),0)," +
        "SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) " +
        "FROM Orders WHERE CAST(placed_at AS DATE)='" + today + "'"
      )
      console.log('Daily report done for ' + today)
    } catch(err) { console.error('Report failed:', err.message) }
  })
  console.log('Daily report job scheduled')
}
const initScheduler = async () => { scheduleDailyReport(); console.log('Scheduler active') }
module.exports = { initScheduler }

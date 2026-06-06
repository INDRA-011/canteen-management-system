const cron = require('node-cron')
const { pool } = require('../config/db')

// ── What is node-cron? ─────────────────────────────────────
// node-cron runs functions on a schedule using cron syntax.
// Cron syntax: second minute hour day month weekday
// Examples:
//   '0 30 10 * * *'  = every day at 10:30:00 AM
//   '0 59 23 * * *'  = every day at 11:59:00 PM
//   '*/5 * * * * *'  = every 5 seconds (for testing)

// ── Job 1: Auto-cancel unpaid orders at each cutoff ───────
// What it does: at each break period's cutoff time, finds all
// PENDING orders that still have no verified payment and
// cancels them. This prevents ghost orders sitting in the
// queue and restores stock.
const scheduleBreakCutoffs = async () => {
  try {
    const breaks = await pool.request()
      .query("SELECT * FROM BreakPeriods WHERE is_active = 1")

    for (const bp of breaks.recordset) {
      const cutoff = new Date(bp.cutoff_time)
      const h = cutoff.getUTCHours()
      const m = cutoff.getUTCMinutes()

      // Build cron expression: "0 MM HH * * *"
      // This fires exactly once per day at the cutoff time
      const cronExpr = `0 ${m} ${h} * * *`

      console.log(`📅 Scheduled cutoff for "${bp.name}" at ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`)

      cron.schedule(cronExpr, async () => {
        console.log(`⏰ Cutoff fired for ${bp.name} — cancelling unpaid orders...`)
        try {
          // Find all PENDING orders for this break that were placed today
          // and whose payment is still PENDING (not verified)
          const unpaid = await pool.request()
            .input('break_period_id', bp.id)
            .query(`
              SELECT o.id FROM Orders o
              LEFT JOIN Payments p ON o.id = p.order_id
              WHERE o.break_period_id = @break_period_id
                AND o.status = 'PENDING'
                AND CAST(o.placed_at AS DATE) = CAST(GETDATE() AS DATE)
                AND (p.status IS NULL OR p.status != 'VERIFIED')
            `)

          for (const order of unpaid.recordset) {
            // Cancel the order
            await pool.request()
              .input('id', order.id)
              .query("UPDATE Orders SET status = 'CANCELLED' WHERE id = @id")

            // Update payment record
            await pool.request()
              .input('id', order.id)
              .query("UPDATE Payments SET status = 'FAILED' WHERE order_id = @id")

            // Restore stock for each item in the cancelled order
            const items = await pool.request()
              .input('id', order.id)
              .query('SELECT menu_item_id, quantity FROM OrderItems WHERE order_id = @id')

            for (const item of items.recordset) {
              await pool.request()
                .input('qty', item.quantity)
                .input('id',  item.menu_item_id)
                .query('UPDATE MenuItems SET stock_qty = stock_qty + @qty WHERE id = @id')
            }
          }

          console.log(`✅ Cancelled ${unpaid.recordset.length} unpaid orders for ${bp.name}`)
        } catch (err) {
          console.error(`❌ Cutoff job error for ${bp.name}:`, err.message)
        }
      })
    }
  } catch (err) {
    console.error('❌ Failed to schedule break cutoffs:', err.message)
  }
}

// ── Job 2: Midnight daily report snapshot ─────────────────
// What it does: fires at 11:59 PM every day.
// Aggregates all of today's orders into one DailyReports row.
// This powers the admin reports screen without running heavy
// queries every time the admin opens the reports page.
const scheduleDailyReport = () => {
  cron.schedule('0 59 23 * * *', async () => {
    console.log('🌙 Midnight job — generating daily report...')
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get today's totals
      const stats = await pool.request().query(`
        SELECT
          COUNT(*)                                                    AS total_orders,
          SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)      AS cancelled_orders,
          SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END) AS total_revenue
        FROM Orders
        WHERE CAST(placed_at AS DATE) = CAST(GETDATE() AS DATE)
      `)

      // Find the best-selling item today
      const topItem = await pool.request().query(`
        SELECT TOP 1 oi.menu_item_id, SUM(oi.quantity) AS total_sold
        FROM OrderItems oi
        JOIN Orders o ON oi.order_id = o.id
        WHERE CAST(o.placed_at AS DATE) = CAST(GETDATE() AS DATE)
          AND o.status != 'CANCELLED'
        GROUP BY oi.menu_item_id
        ORDER BY total_sold DESC
      `)

      const s = stats.recordset[0]
      const topItemId = topItem.recordset[0]?.menu_item_id || null

      // Upsert — insert if today doesn't exist, update if it does
      await pool.request()
        .input('report_date',      today)
        .input('total_orders',     s.total_orders)
        .input('total_revenue',    s.total_revenue || 0)
        .input('cancelled_orders', s.cancelled_orders)
        .input('top_item_id',      topItemId)
        .query(`
          IF EXISTS (SELECT 1 FROM DailyReports WHERE report_date = @report_date)
            UPDATE DailyReports
            SET total_orders     = @total_orders,
                total_revenue    = @total_revenue,
                cancelled_orders = @cancelled_orders,
                top_item_id      = @top_item_id
            WHERE report_date = @report_date
          ELSE
            INSERT INTO DailyReports
              (report_date, total_orders, total_revenue, cancelled_orders, top_item_id)
            VALUES
              (@report_date, @total_orders, @total_revenue, @cancelled_orders, @top_item_id)
        `)

      console.log(`✅ Daily report saved for ${today} — ${s.total_orders} orders, Rs. ${s.total_revenue} revenue`)
    } catch (err) {
      console.error('❌ Daily report job error:', err.message)
    }
  })

  console.log('🌙 Daily report job scheduled for 23:59 every day')
}

// ── initScheduler ──────────────────────────────────────────
// What it does: called once when the server starts.
// Sets up all scheduled jobs.
const initScheduler = async () => {
  console.log('⚙️  Initializing scheduled jobs...')
  await scheduleBreakCutoffs()
  scheduleDailyReport()
  console.log('✅ All scheduled jobs active')
}

module.exports = { initScheduler }

// Returns current time as "HH:MM" in Nepal Time (Asia/Kathmandu, UTC+5:45)
// regardless of server's local timezone.
const getCurrentTimeNepal = () => {
  const now = new Date()
  const nepal = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))
  const h = String(nepal.getHours()).padStart(2, '0')
  const m = String(nepal.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// Returns today's date as YYYY-MM-DD in Nepal Time
const getTodayNepal = () => {
  const now = new Date()
  const nepal = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' }))
  const y = nepal.getFullYear()
  const m = String(nepal.getMonth() + 1).padStart(2, '0')
  const d = String(nepal.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

module.exports = { getCurrentTimeNepal, getTodayNepal }

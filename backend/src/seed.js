require('dotenv').config()
const { connect, prisma } = require('./config/db')
const bcrypt = require('bcryptjs')
async function main() {
  await connect()
  const hash = await bcrypt.hash('ADMIN001', 10)
  try {
    await prisma.users.create({ data: { name: 'Admin', email: 'admin@tcmit.edu.np', college_id: 'ADMIN001', password_hash: hash, role: 'ADMIN', must_change_password: false } })
    console.log('Admin created')
  } catch(e) { console.log('Admin exists:', e.message.slice(0,80)) }
  const ex = await prisma.canteenSettings.findFirst()
  if (!ex) {
    await prisma.canteenSettings.create({ data: { open_time: '07:00', close_time: '17:00', slot_interval_minutes: 15 } })
    console.log('Settings created')
  } else console.log('Settings exist')
  process.exit(0)
}
main().catch(e => { console.error(e.message); process.exit(1) })

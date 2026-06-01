const { PrismaClient } = require('@prisma/client')
const { PrismaMssql }  = require('@prisma/adapter-mssql')
const sql              = require('mssql')

const pool = new sql.ConnectionPool({
  user:     'SA',
  password: 'StrongPass123',
  server:   'localhost',
  port:     1433,
  database: 'canteen_db',
  options: {
    trustServerCertificate: true,
    enableArithAbort:       true,
  }
})

const adapter = new PrismaMssql(pool)
const prisma  = new PrismaClient({ adapter })

module.exports = { prisma, pool }

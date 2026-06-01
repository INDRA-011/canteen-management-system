const { PrismaClient } = require("@prisma/client");
const { PrismaMssql } = require("@prisma/adapter-mssql");
const sql = require("mssql");

const pool = new sql.ConnectionPool({
  user: process.env.DB_USER || "SA",
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || "canteen_db",
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
});

const adapter = new PrismaMssql(pool);
const prisma = new PrismaClient({ adapter });

module.exports = { prisma, pool };

const { PrismaClient } = require("@prisma/client");
const { PrismaMssql } = require("@prisma/adapter-mssql");
const sql = require("mssql");

let _pool = null, _prisma = null;

const connect = async () => {
  if (_pool) return;
  _pool = new sql.ConnectionPool({
    user: process.env.DB_USER || "SA",
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || "localhost",
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || "canteen_db",
    options: { trustServerCertificate: true, enableArithAbort: true },
  });
  await _pool.connect();
  const adapter = new PrismaMssql(_pool);
  _prisma = new PrismaClient({ adapter });
};

// Proxy wraps pool/prisma so destructuring still works after connect()
const pool = new Proxy({}, { get(_, k) { return _pool[k].bind ? _pool[k].bind(_pool) : _pool[k] } })
const prisma = new Proxy({}, { get(_, k) { return typeof _prisma[k] === 'function' ? _prisma[k].bind(_prisma) : _prisma[k] } })

module.exports = { connect, pool, prisma };

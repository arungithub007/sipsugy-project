import mysql from 'mysql2/promise'

// The DB tier doesn't exist yet, so this pool is only created when DB_HOST
// is actually set. Everything that touches the DB checks getPool() for null
// first and falls back to seed / in-memory data — this lets the rest of the
// API run and be tested before the database is provisioned.
const isConfigured = Boolean(process.env.DB_HOST)

const pool = isConfigured
  ? mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  : null

export function getPool() {
  return pool
}

export async function checkDbConnection() {
  if (!pool) {
    return { configured: false, connected: false }
  }
  try {
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    return { configured: true, connected: true }
  } catch (err) {
    return { configured: true, connected: false, error: err.message }
  }
}

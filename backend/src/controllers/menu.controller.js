import { getPool } from '../config/db.js'
import seedMenu from '../data/menu.seed.js'

export async function listMenu(req, res) {
  const pool = getPool()

  if (!pool) {
    return res.json({ source: 'seed', items: seedMenu })
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, name, note, price, tag FROM menu_items WHERE is_available = 1 ORDER BY id'
    )
    if (rows.length === 0) {
      return res.json({ source: 'seed', items: seedMenu })
    }
    return res.json({ source: 'db', items: rows })
  } catch (err) {
    console.warn('Menu query failed, falling back to seed data:', err.message)
    return res.json({ source: 'seed', items: seedMenu })
  }
}

import { getPool } from '../config/db.js'
import seedMenu from '../data/menu.seed.js'
import { buildOrder } from '../utils/orderCalculator.js'

// In-memory fallback store — resets on restart. This exists purely so the
// order flow is testable end-to-end before the database tier is built.
const memoryOrders = new Map()
let nextOrderId = 1000

export async function createOrder(req, res) {
  const { items, customerName, customerPhone } = req.body
  const order = buildOrder(items, seedMenu) // throws OrderError on bad input

  const pool = getPool()
  if (pool) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      const [orderResult] = await conn.execute(
        'INSERT INTO orders (customer_name, customer_phone, subtotal, status) VALUES (?, ?, ?, ?)',
        [customerName || null, customerPhone || null, order.subtotal, 'received']
      )
      const orderId = orderResult.insertId
      for (const item of order.items) {
        await conn.execute(
          'INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.id, item.name, item.price, item.qty]
        )
      }
      await conn.commit()
      return res.status(201).json({
        orderId,
        status: 'received',
        createdAt: new Date().toISOString(),
        ...order,
      })
    } catch (dbErr) {
      await conn.rollback()
      console.warn('DB order insert failed, falling back to in-memory store:', dbErr.message)
    } finally {
      conn.release()
    }
  }

  const orderId = nextOrderId++
  const record = {
    orderId,
    status: 'received',
    createdAt: new Date().toISOString(),
    ...order,
  }
  memoryOrders.set(orderId, record)
  return res.status(201).json(record)
}

export async function getOrder(req, res) {
  const id = Number(req.params.id)
  const pool = getPool()

  if (pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id])
      if (rows.length) {
        const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [id])
        return res.json({ ...rows[0], items })
      }
    } catch (dbErr) {
      console.warn('DB order lookup failed, checking in-memory store:', dbErr.message)
    }
  }

  const record = memoryOrders.get(id)
  if (!record) {
    return res.status(404).json({ error: `No order found with id ${id}` })
  }
  return res.json(record)
}

export async function getOrders(req, res, next) {
  try {
    const pool = getPool()
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' })
    }

    const [rows] = await pool.query('SELECT * FROM orders')
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

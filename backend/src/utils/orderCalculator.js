export class OrderError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'OrderError'
    this.status = status
  }
}

/**
 * Validates a raw items array against the known menu and computes totals.
 * Prices always come from the menu (server-trusted), never from the client,
 * so a tampered request can't change what an order actually costs.
 */
export function buildOrder(items, menu) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderError('Order must include at least one item.')
  }

  const menuById = new Map(menu.map((m) => [m.id, m]))

  const normalized = items.map((entry) => {
    if (!entry || typeof entry.id !== 'string') {
      throw new OrderError('Each order item needs an id.')
    }
    const menuItem = menuById.get(entry.id)
    if (!menuItem) {
      throw new OrderError(`Unknown menu item: ${entry.id}`)
    }
    const qty = Number(entry.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      throw new OrderError(`Invalid quantity for ${menuItem.name}.`)
    }
    return {
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      qty,
    }
  })

  const subtotal = normalized.reduce((sum, item) => sum + item.price * item.qty, 0)
  const itemCount = normalized.reduce((sum, item) => sum + item.qty, 0)

  return { items: normalized, subtotal, itemCount }
}

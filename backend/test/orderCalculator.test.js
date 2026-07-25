import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOrder, OrderError } from '../src/utils/orderCalculator.js'

const menu = [
  { id: 'classic-cane', name: 'Classic Cane', price: 40 },
  { id: 'masala-cane', name: 'Masala Cane', price: 50 },
]

test('computes subtotal and item count for a valid order', () => {
  const order = buildOrder(
    [
      { id: 'classic-cane', qty: 2 },
      { id: 'masala-cane', qty: 1 },
    ],
    menu
  )
  assert.equal(order.subtotal, 130)
  assert.equal(order.itemCount, 3)
  assert.equal(order.items.length, 2)
})

test('ignores a client-supplied price and uses the menu price instead', () => {
  const order = buildOrder([{ id: 'classic-cane', qty: 1, price: 1 }], menu)
  assert.equal(order.subtotal, 40)
})

test('rejects an empty order', () => {
  assert.throws(() => buildOrder([], menu), OrderError)
})

test('rejects an unknown menu item', () => {
  assert.throws(() => buildOrder([{ id: 'not-a-real-item', qty: 1 }], menu), OrderError)
})

test('rejects a zero or negative quantity', () => {
  assert.throws(() => buildOrder([{ id: 'classic-cane', qty: 0 }], menu), OrderError)
  assert.throws(() => buildOrder([{ id: 'classic-cane', qty: -3 }], menu), OrderError)
})

test('rejects a non-integer quantity', () => {
  assert.throws(() => buildOrder([{ id: 'classic-cane', qty: 1.5 }], menu), OrderError)
})

import { useState } from 'react'
import { CartProvider, useCart } from './context/CartContext.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import ProcessSection from './components/ProcessSection.jsx'
import Menu from './components/Menu.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import OrderConfirmModal from './components/OrderConfirmModal.jsx'
import Footer from './components/Footer.jsx'

function AppShell() {
  const { items, clear, subtotal } = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, orderNumber: null, subtotal: 0, offline: false })
  const [placing, setPlacing] = useState(false)

  const handlePlaceOrder = async () => {
    setPlacing(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
        }),
      })
      if (!res.ok) throw new Error(`Order request failed: ${res.status}`)
      const order = await res.json()
      setConfirm({ open: true, orderNumber: order.orderId, subtotal: order.subtotal, offline: false })
      setCartOpen(false)
      clear()
    } catch (err) {
      // Backend not reachable — still confirm locally so the flow isn't a
      // dead end, but flag it so it's obvious this order wasn't actually sent.
      const orderNumber = Math.floor(1000 + Math.random() * 9000)
      setConfirm({ open: true, orderNumber, subtotal, offline: true })
      setCartOpen(false)
      clear()
    } finally {
      setPlacing(false)
    }
  }

  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />
      <main>
        <Hero />
        <ProcessSection />
        <Menu />
      </main>
      <Footer />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaceOrder={handlePlaceOrder}
        placing={placing}
      />
      <OrderConfirmModal
        open={confirm.open}
        orderNumber={confirm.orderNumber}
        subtotal={confirm.subtotal}
        offline={confirm.offline}
        onClose={() => setConfirm({ open: false, orderNumber: null, subtotal: 0, offline: false })}
      />
    </>
  )
}

export default function App() {
  return (
    <CartProvider>
      <AppShell />
    </CartProvider>
  )
}

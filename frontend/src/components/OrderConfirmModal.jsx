export default function OrderConfirmModal({ open, onClose, orderNumber, subtotal, offline }) {
  if (!open) return null

  return (
    <div className="order-modal__scrim" role="dialog" aria-modal="true">
      <div className="order-modal">
        <p className="order-modal__eyebrow">{offline ? 'Saved on this device' : 'Order sent'}</p>
        <h2>Thanks — glass #{orderNumber} is on the list.</h2>
        <p className="order-modal__body">
          Total: <strong>₹{subtotal}</strong>.{' '}
          {offline
            ? "We couldn't reach the kitchen just now, so this order only exists on your screen — nothing was actually sent. Try again once you're back online."
            : "This order has been sent to the kitchen and is on its way to the crushers."}
        </p>
        <button className="button button--primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  )
}

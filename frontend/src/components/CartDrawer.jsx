import { useCart } from '../context/CartContext.jsx'

export default function CartDrawer({ open, onClose, onPlaceOrder, placing }) {
  const { items, subtotal, increment, decrement, removeItem } = useCart()

  return (
    <>
      <div
        className={`cart-drawer__scrim${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`cart-drawer${open ? ' is-open' : ''}`} aria-label="Your order">
        <div className="cart-drawer__head">
          <h2>Your order</h2>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Close order tray">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <p className="cart-drawer__empty">
            Nothing pressed yet — add a glass from the menu.
          </p>
        ) : (
          <ul className="cart-drawer__list">
            {items.map((item) => (
              <li className="cart-drawer__item" key={item.id}>
                <div className="cart-drawer__item-info">
                  <strong>{item.name}</strong>
                  <span>₹{item.price} each</span>
                </div>
                <div className="cart-drawer__qty">
                  <button onClick={() => decrement(item.id)} aria-label={`Remove one ${item.name}`}>
                    −
                  </button>
                  <span>{item.qty}</span>
                  <button onClick={() => increment(item.id)} aria-label={`Add one more ${item.name}`}>
                    +
                  </button>
                </div>
                <button
                  className="cart-drawer__remove"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name} from order`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="cart-drawer__footer">
          <div className="cart-drawer__subtotal">
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <button
            className="button button--primary cart-drawer__place"
            disabled={items.length === 0 || placing}
            onClick={onPlaceOrder}
          >
            {placing ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </aside>
    </>
  )
}

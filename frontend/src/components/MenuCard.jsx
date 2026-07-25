import { useState } from 'react'
import { useCart } from '../context/CartContext.jsx'

export default function MenuCard({ item }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem(item)
    setAdded(true)
    window.clearTimeout(handleAdd._t)
    handleAdd._t = window.setTimeout(() => setAdded(false), 900)
  }

  return (
    <article className="menu-card">
      <div className="menu-card__top">
        <span className="menu-card__tag">{item.tag}</span>
        <span className="menu-card__price">₹{item.price}</span>
      </div>
      <h3 className="menu-card__name">{item.name}</h3>
      <p className="menu-card__note">{item.note}</p>
      <button
        className={`button button--secondary menu-card__add${added ? ' is-added' : ''}`}
        onClick={handleAdd}
      >
        {added ? 'Added' : 'Add to order'}
      </button>
    </article>
  )
}

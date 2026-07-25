import Logomark from '../assets/Logomark.jsx'
import { useCart } from '../context/CartContext.jsx'

export default function Header({ onOpenCart }) {
  const { count } = useCart()

  const scrollTo = (id) => (e) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="site-header">
      <a className="site-header__brand" href="#top" onClick={scrollTo('top')}>
        <Logomark className="site-header__mark" />
        <span>SipSugy</span>
      </a>

      <nav className="site-header__nav">
        <a href="#process" onClick={scrollTo('process')}>How it's pressed</a>
        <a href="#menu" onClick={scrollTo('menu')}>Menu</a>
      </nav>

      <button className="site-header__cart" onClick={onOpenCart} aria-label="Open your order">
        Your order
        <span className="site-header__cart-count">{count}</span>
      </button>
    </header>
  )
}

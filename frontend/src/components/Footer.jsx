import Logomark from '../assets/Logomark.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <Logomark className="site-footer__mark" />
        <span>SipSugy</span>
      </div>
      <p className="site-footer__tagline">Pressed to order. Nothing added.</p>
      <p className="site-footer__copy">© {new Date().getFullYear()} SipSugy</p>
    </footer>
  )
}

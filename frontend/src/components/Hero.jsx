import CaneGlassIllustration from '../assets/CaneGlassIllustration.jsx'

export default function Hero() {
  const scrollToMenu = (e) => {
    e.preventDefault()
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="hero" id="top">
      <div className="hero__copy">
        <p className="hero__eyebrow">Cut today. Crushed for you.</p>
        <h1 className="hero__headline">
          Sugarcane juice, straight from the crusher to your cup.
        </h1>
        <p className="hero__subhead">
          No concentrate, no syrup, no shortcuts — just the stalk, a squeeze
          of lime, and a little ice, pressed the moment you order.
        </p>
        <div className="hero__actions">
          <a href="#menu" className="button button--primary" onClick={scrollToMenu}>
            See the menu
          </a>
          <p className="hero__stat">Pressed within 2 hours of harvest</p>
        </div>
      </div>
      <div className="hero__art">
        <CaneGlassIllustration />
      </div>
    </section>
  )
}

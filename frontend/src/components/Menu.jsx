import { useEffect, useState } from 'react'
import fallbackMenu from '../data/menu.js'
import MenuCard from './MenuCard.jsx'

export default function Menu() {
  const [items, setItems] = useState(fallbackMenu)
  const [source, setSource] = useState('seed')

  useEffect(() => {
    let cancelled = false

    fetch('/api/menu')
      .then((res) => {
        if (!res.ok) throw new Error(`Menu request failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
          setSource(data.source || 'api')
        }
      })
      .catch(() => {
        // Backend not reachable yet — keep showing the local fallback menu.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="menu" id="menu">
      <p className="section-eyebrow">Pressed fresh, priced honest</p>
      <h2 className="section-heading">The menu</h2>

      {source === 'seed' && (
        <p className="menu__notice">
          Showing our regular lineup — live pricing will appear once the
          kitchen is connected.
        </p>
      )}

      <div className="menu__grid">
        {items.map((item) => (
          <MenuCard item={item} key={item.id} />
        ))}
      </div>
    </section>
  )
}

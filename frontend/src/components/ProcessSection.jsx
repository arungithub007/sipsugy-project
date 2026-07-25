import CaneRing from '../assets/CaneRing.jsx'

const steps = [
  {
    number: '01',
    title: 'Harvested',
    text: "Cane arrives from Karnataka fields daily, still cool from the morning cut.",
  },
  {
    number: '02',
    title: 'Crushed to order',
    text: 'Each glass is pressed fresh when you order — never stored, never pre-juiced.',
  },
  {
    number: '03',
    title: 'Sealed & sent',
    text: 'Bottled cold within minutes and out for delivery before the froth settles.',
  },
]

export default function ProcessSection() {
  return (
    <section className="process" id="process">
      <p className="section-eyebrow">From field to glass</p>
      <h2 className="section-heading">How it's pressed</h2>

      <ol className="process__list">
        {steps.map((step, i) => (
          <li className="process__step" key={step.number}>
            <span className="process__number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            {i < steps.length - 1 && (
              <CaneRing className="process__divider" />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function CaneGlassIllustration({ className }) {
  return (
    <svg
      className={`hero-glass ${className || ''}`}
      viewBox="0 0 220 300"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="A glass of freshly pressed sugarcane juice with ice and lime"
    >
      {/* leaning cane stalk behind the glass */}
      <g className="hero-glass__stalk" opacity="0.95">
        <path d="M18 280 L64 40" stroke="#A9C97E" strokeWidth="7" strokeLinecap="round" />
        <path d="M30 232 L50 220" stroke="#A9C97E" strokeWidth="4" strokeLinecap="round" />
        <path d="M40 180 L62 170" stroke="#A9C97E" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 128 L72 120" stroke="#A9C97E" strokeWidth="4" strokeLinecap="round" />
        <circle cx="34" cy="232" r="3.5" fill="#E4C86B" />
        <circle cx="44" cy="180" r="3.5" fill="#E4C86B" />
        <circle cx="54" cy="128" r="3.5" fill="#E4C86B" />
      </g>

      <defs>
        <clipPath id="glassInterior">
          <path d="M58 46 L162 46 L149 246 L71 246 Z" />
        </clipPath>
      </defs>

      {/* juice fill, clipped to the glass interior, animates upward on mount */}
      <g clipPath="url(#glassInterior)">
        <rect
          className="hero-glass__juice"
          x="50"
          y="0"
          width="130"
          height="300"
          fill="#CFE07A"
        />
        <circle className="hero-glass__ice" cx="90" cy="90" r="12" fill="#F6F1E0" opacity="0.85" />
        <circle className="hero-glass__ice" cx="122" cy="72" r="9" fill="#F6F1E0" opacity="0.8" />
        <circle className="hero-glass__ice" cx="108" cy="112" r="8" fill="#F6F1E0" opacity="0.75" />
      </g>

      {/* glass outline drawn on top */}
      <path
        d="M58 46 L162 46 L149 246 L71 246 Z"
        fill="none"
        stroke="#F6F1E0"
        strokeOpacity="0.9"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <ellipse cx="110" cy="46" rx="52" ry="8" fill="none" stroke="#F6F1E0" strokeOpacity="0.9" strokeWidth="4" />

      {/* straw */}
      <rect
        x="0"
        y="0"
        width="10"
        height="120"
        rx="4"
        fill="#A85C32"
        transform="translate(126 6) rotate(12)"
      />

      {/* lime wedge perched on the rim */}
      <g transform="translate(150 30) rotate(18)">
        <path d="M0 14 A14 14 0 0 1 14 0 L14 14 Z" fill="#DDEB9C" stroke="#7FA828" strokeWidth="2" />
      </g>
    </svg>
  )
}

export default function CaneRing({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="20" cy="20" r="1.5" fill="currentColor" />
    </svg>
  )
}

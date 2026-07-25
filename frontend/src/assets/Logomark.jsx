export default function Logomark({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M24 4V44"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M24 10L15 14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 18L33 22"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M24 26L15 30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="24" cy="10" r="2" fill="currentColor" />
      <circle cx="24" cy="18" r="2" fill="currentColor" />
      <circle cx="24" cy="26" r="2" fill="currentColor" />
      <circle cx="24" cy="34" r="2" fill="currentColor" />
      <path
        d="M18 4C18 4 20 1 24 1C28 1 30 4 30 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

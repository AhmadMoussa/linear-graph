export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <g stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="11" y1="11" x2="21" y2="19" />
        <line x1="11" y1="11" x2="12" y2="23" />
      </g>
      <circle cx="11" cy="11" r="4" fill="#e07a3f" />
      <circle cx="21" cy="19" r="2.5" fill="var(--bg)" />
      <circle cx="12" cy="23" r="2" fill="var(--bg)" />
    </svg>
  )
}

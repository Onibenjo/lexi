import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
const base = ({ size = 22, ...p }: P): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...p,
})

export const IconToday = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
    <path d="M9 8h6" />
  </svg>
)
export const IconWords = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </svg>
)
export const IconProgress = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" />
  </svg>
)
export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
)
export const IconSpeaker = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 9.5h3l4-3.5v12l-4-3.5H5z" />
    <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
  </svg>
)
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconArrow = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
  </svg>
)
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 2.7-5.6 3.8-8.8.3 1.9 1.3 3.1 2.4 3.6.2-2.5 1.4-4.6 3.3-6.1-.2 2.9 3.5 5.3 3.5 10.6 0 4-2.7 6.9-6.5 6.9Z" />
  </svg>
)
export const IconSnow = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
  </svg>
)
export const IconShare = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)
export const IconSparkle = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
)
export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
)

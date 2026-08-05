type IconProps = {
  className?: string
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false as const,
})

export function XLogo({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function HomeIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      <path d="M3.5 10.2 12 3.4l8.5 6.8V20a.9.9 0 0 1-.9.9h-4.4v-6.3H8.8v6.3H4.4a.9.9 0 0 1-.9-.9z" />
    </svg>
  )
}

export function SearchIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="10.6" cy="10.6" r="7.1" />
      <path d="m16 16 4.8 4.8" />
    </svg>
  )
}

export function BellIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      <path d="M18.6 16.4V10.6a6.6 6.6 0 1 0-13.2 0v5.8L3.7 18.5h16.6z" />
      <path d="M9.6 19.6a2.5 2.5 0 0 0 4.8 0" />
    </svg>
  )
}

export function ChatIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M12 4.2c-4.7 0-8.5 3.1-8.5 7 0 2.2 1.2 4.1 3 5.4v3.2l3.3-1.8c.7.2 1.4.2 2.2.2 4.7 0 8.5-3.1 8.5-7s-3.8-7-8.5-7Z" />
    </svg>
  )
}

export function GrokIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <ellipse cx="12.4" cy="11.6" rx="6.2" ry="7.4" transform="rotate(28 12.4 11.6)" />
      <path d="M4.2 20.4 19.2 3.9" />
    </svg>
  )
}

export function PremiumIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 3.1l2 1.2 2.3-.4 1 2.1 2.1 1-.4 2.3 1.2 2-1.2 2 .4 2.3-2.1 1-1 2.1-2.3-.4-2 1.2-2-1.2-2.3.4-1-2.1-2.1-1 .4-2.3-1.2-2 1.2-2-.4-2.3 2.1-1 1-2.1 2.3.4z" />
      <path d="m8.9 12.1 2.2 2.2 4-4.4" />
    </svg>
  )
}

export function BookmarkIcon({ size = 24, className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M6.2 3.7h11.6v17l-5.8-4.1-5.8 4.1z" />
    </svg>
  )
}

export function CreatorStudioIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      <path d="M9.6 14.6 5 19.2" />
      <path d="M20.6 3.4c-4.3-.5-8.3 1-11 3.7l-2.2 2.2 5.3 5.3 2.2-2.2c2.7-2.7 4.2-6.7 3.7-11Z" />
      <path d="m7.4 9.3-3 .7 2 2m4.6 4.6-.7 3-2-2" />
    </svg>
  )
}

export function ArticlesIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      <path d="M19 11.4V4.2H5v15.6h7" />
      <path d="M8.2 8h7.6M8.2 11.6h4.6" />
      <path d="m20.4 14.2-5.6 5.6-2.6.6.6-2.6 5.6-5.6z" />
    </svg>
  )
}

export function ProfileIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="7.6" r="3.9" />
      <path d="M4.9 20.2c.6-3.8 3.6-6.2 7.1-6.2s6.5 2.4 7.1 6.2" />
    </svg>
  )
}

export function MoreCircleIcon({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="8.2" cy="12" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="12" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BackArrowIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12H4.4" />
      <path d="M10.6 5.4 4 12l6.6 6.6" />
    </svg>
  )
}

export function VerifiedBadge({ size = 19, className, tone = 'blue' }: IconProps & { tone?: 'blue' | 'gold' }) {
  return (
    <svg {...base(size)} className={className} fill={tone === 'gold' ? '#e2b719' : '#1d9bf0'}>
      <path d="M12 1.6 14 3l2.4-.5.9 2.3 2.2 1-.4 2.4 1.5 1.9-1.5 1.9.4 2.4-2.2 1-.9 2.3-2.4-.5-2 1.4-2-1.4-2.4.5-.9-2.3-2.2-1 .4-2.4L3.4 10l1.5-1.9-.4-2.4 2.2-1 .9-2.3L10 3z" />
      <path d="m10.9 14.6-3.2-3.2 1.4-1.4 1.8 1.8 4.1-4.3 1.4 1.4z" fill="#fff" />
    </svg>
  )
}

export function ReplyIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M12 4.4c-4.5 0-8.1 2.9-8.1 6.5 0 2 1.1 3.8 2.9 5v3.2l3.2-1.8c.6.1 1.3.2 2 .2 4.5 0 8.1-2.9 8.1-6.6S16.5 4.4 12 4.4Z" />
    </svg>
  )
}

export function RepostIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.6 20.2V6.9m0 0L3.2 10.4M6.6 6.9 10 10.4" />
      <path d="M17.4 3.8v13.3m0 0 3.4-3.5m-3.4 3.5L14 13.6" />
    </svg>
  )
}

export function LikeIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
      <path d="M12 20.3c6.2-3.7 8.6-7 8.6-10.2 0-3-2.2-5-4.6-5-1.9 0-3.2 1-4 2.3-.8-1.3-2.1-2.3-4-2.3-2.4 0-4.6 2-4.6 5 0 3.2 2.4 6.5 8.6 10.2Z" />
    </svg>
  )
}

export function ViewsIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4.4 20V13m4.6 7V8.4m4.6 11.6V11m4.6 9V4" />
    </svg>
  )
}

export function ShareIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16.3V3.6m0 0L7.9 7.7M12 3.6l4.1 4.1" />
      <path d="M5 13.5v5.6c0 .7.6 1.3 1.3 1.3h11.4c.7 0 1.3-.6 1.3-1.3v-5.6" />
    </svg>
  )
}

export function EllipsisIcon({ size = 19, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="currentColor">
      <circle cx="5.4" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.6" cy="12" r="1.7" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5.5 9 6.5 6.5L18.5 9" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </svg>
  )
}

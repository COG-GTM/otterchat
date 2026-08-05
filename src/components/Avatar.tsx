import { useId } from 'react'
import type { Account } from '../data'

type Props = {
  account: Account
  size?: number
}

export function Avatar({ account, size = 40 }: Props) {
  const gradientId = useId()
  const className = account.squareAvatar ? 'avatar avatar--square' : 'avatar'

  if (account.imageSrc) {
    return (
      <img
        className={className}
        src={account.imageSrc}
        width={size}
        height={size}
        alt={`${account.name} avatar`}
      />
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label={`${account.name} avatar`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={account.avatarFrom} />
          <stop offset="100%" stopColor={account.avatarTo} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={`url(#${gradientId})`} />
      <text
        x="20"
        y="20"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize="15"
        fontWeight="700"
        fontFamily="inherit"
      >
        {account.initials}
      </text>
    </svg>
  )
}

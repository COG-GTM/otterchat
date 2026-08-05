import { useId } from 'react'

type Props = {
  from: string
  to: string
  caption: string
  width: number
  height: number
  maxWidth?: number
}

export function Media({ from, to, caption, width, height, maxWidth }: Props) {
  const gradientId = useId()
  return (
    <svg
      className="media"
      viewBox={`0 0 ${width} ${height}`}
      style={{ maxWidth, aspectRatio: `${width} / ${height}` }}
      role="img"
      aria-label={`${caption} image placeholder`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill={`url(#${gradientId})`} />
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={width / 9}
        fontWeight="700"
        fontFamily="inherit"
        letterSpacing="1"
      >
        {caption}
      </text>
    </svg>
  )
}

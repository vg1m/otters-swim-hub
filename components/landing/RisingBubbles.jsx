/**
 * Illustrated 2D water bubbles — varied depth, size, and rise paths.
 */

const BUBBLE_SPECS = [
  /* Splash — bottom center */
  { left: '38%', bottom: '-6%', size: 40, duration: 8, delay: 0 },
  { left: '50%', bottom: '-4%', size: 34, duration: 9.5, delay: 0.5 },
  { left: '44%', bottom: '-8%', size: 28, duration: 7, delay: 1.8 },
  { left: '56%', bottom: '-5%', size: 22, duration: 8.5, delay: 2.2 },
  { left: '42%', bottom: '2%', size: 18, duration: 10, delay: 3.5 },
  { left: '48%', bottom: '8%', size: 14, duration: 9, delay: 4.8 },
  /* Mid-depth — rise through sides of screenshot */
  { left: '22%', bottom: '12%', size: 26, duration: 11, delay: 1 },
  { left: '72%', bottom: '15%', size: 24, duration: 10, delay: 1.4 },
  { left: '28%', bottom: '28%', size: 20, duration: 12, delay: 2.6 },
  { left: '68%', bottom: '32%', size: 18, duration: 11, delay: 3 },
  { left: '35%', bottom: '40%', size: 16, duration: 13, delay: 4 },
  { left: '62%', bottom: '38%', size: 14, duration: 12, delay: 5.2 },
  /* Left trail */
  { left: '4%', bottom: '-4%', size: 22, duration: 9, delay: 0.3 },
  { left: '8%', bottom: '18%', size: 17, duration: 11, delay: 2 },
  { left: '12%', bottom: '45%', size: 12, duration: 10, delay: 3.8 },
  { left: '2%', bottom: '8%', size: 10, duration: 8, delay: 4.2 },
  /* Right trail */
  { left: '92%', bottom: '-3%', size: 20, duration: 8.5, delay: 0.7 },
  { left: '86%', bottom: '20%', size: 16, duration: 10, delay: 2.4 },
  { left: '90%', bottom: '42%', size: 13, duration: 11, delay: 4.5 },
  { left: '78%', bottom: '6%', size: 11, duration: 9, delay: 5.5 },
  /* Foreground accents (larger, slower) */
  { left: '18%', bottom: '5%', size: 32, duration: 14, delay: 0.9, foreground: true },
  { left: '75%', bottom: '10%', size: 28, duration: 13, delay: 2.8, foreground: true },
  { left: '52%', bottom: '22%', size: 20, duration: 15, delay: 4, foreground: true },
]

function BubbleSvg({ size, strong = false }) {
  const s = size
  const r = s * 0.42
  const cx = s / 2
  const cy = s / 2
  const fill = strong ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.16)'
  const stroke = strong ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.55)'

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="block drop-shadow-sm" aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={Math.max(1.2, s * 0.045)} />
      <ellipse
        cx={cx - r * 0.28}
        cy={cy - r * 0.32}
        rx={r * 0.38}
        ry={r * 0.24}
        fill="rgba(255,255,255,0.5)"
      />
      <ellipse
        cx={cx + r * 0.32}
        cy={cy + r * 0.36}
        rx={r * 0.14}
        ry={r * 0.09}
        fill="rgba(255,255,255,0.18)"
      />
    </svg>
  )
}

export default function RisingBubbles({ className = '', layer = 'behind' }) {
  const specs = BUBBLE_SPECS.filter((s) =>
    layer === 'foreground' ? s.foreground : !s.foreground
  )

  if (specs.length === 0) return null

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      {specs.map((spec, i) => (
        <div
          key={`${layer}-${i}`}
          className={`absolute bubble-rise-active ${layer === 'foreground' ? 'opacity-70' : ''}`}
          style={{
            left: spec.left,
            bottom: spec.bottom,
            width: spec.size,
            height: spec.size,
            ['--bubble-rise-duration']: `${spec.duration}s`,
            ['--bubble-rise-delay']: `${spec.delay}s`,
          }}
        >
          <BubbleSvg size={spec.size} strong={spec.size >= 28} />
        </div>
      ))}
    </div>
  )
}

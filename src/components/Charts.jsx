import { INDICATORS, scoreToColor } from '../constants'

// ─── Radar Chart (spider) ───
export function RadarChart({ commune, size = 220, communes = null }) {
  const cx = size / 2, cy = size / 2, r = size * 0.34
  const n = INDICATORS.length
  const step = (2 * Math.PI) / n

  const polarToXY = (angle, ratio) => [
    cx + r * ratio * Math.cos(angle),
    cy + r * ratio * Math.sin(angle),
  ]

  const polyPoints = (data) =>
    INDICATORS.map((ind, i) => {
      const angle = -Math.PI / 2 + i * step
      const score = data[ind.id]?.s ?? 0
      return polarToXY(angle, score / 10).join(',')
    }).join(' ')

  const colors = ['rgba(15,110,86,0.25)', 'rgba(83,74,183,0.20)', 'rgba(199,75,59,0.18)', 'rgba(212,168,67,0.18)']
  const strokes = ['#0F6E56', '#534AB7', '#C74B3B', '#D4A843']
  const items = communes || [commune]

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }}>
      {[0.25, 0.5, 0.75, 1].map(ratio => (
        <circle key={ratio} cx={cx} cy={cy} r={r * ratio} fill="none" stroke="#e8e7e2" strokeWidth="0.5" />
      ))}
      {INDICATORS.map((ind, i) => {
        const angle = -Math.PI / 2 + i * step
        const [ex, ey] = polarToXY(angle, 1)
        const [lx, ly] = polarToXY(angle, 1.18)
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#e8e7e2" strokeWidth="0.5" />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="13">{ind.icon}</text>
          </g>
        )
      })}
      {items.map((data, idx) => (
        <polygon key={idx} points={polyPoints(data)}
          fill={colors[idx % colors.length]} stroke={strokes[idx % strokes.length]} strokeWidth="1.5" />
      ))}
      {items.length === 1 && INDICATORS.map((ind, i) => {
        const score = commune[ind.id]?.s ?? 0
        const angle = -Math.PI / 2 + i * step
        const [px, py] = polarToXY(angle, score / 10)
        return <circle key={i} cx={px} cy={py} r="3" fill={ind.color} />
      })}
    </svg>
  )
}

// ─── Bar Chart horizontal (commune vs dept vs national) ───
export function BarChart({ communeScore, nationalAvg, deptAvg, color, width = 280 }) {
  const h = 18, gap = 6, pad = 72
  const bw = width - pad - 30
  const items = [
    { label: 'Commune', value: communeScore, fill: color },
    { label: 'Départ.', value: deptAvg, fill: '#8B8B85' },
    { label: 'National', value: nationalAvg, fill: '#C5C5BE' },
  ]
  const svgH = items.length * (h + gap)

  return (
    <svg viewBox={`0 0 ${width} ${svgH}`} width="100%" style={{ maxWidth: width }}>
      {items.map((it, i) => {
        const y = i * (h + gap)
        const w = Math.max(0, bw * ((it.value ?? 0) / 10))
        return (
          <g key={i} transform={`translate(0,${y})`}>
            <text x={pad - 6} y={h * 0.72} textAnchor="end" fontSize="11" fill="#6b6b65" fontFamily="DM Sans,sans-serif">{it.label}</text>
            <rect x={pad} y={0} width={w} height={h} rx={3} fill={it.fill} opacity={0.85} />
            <text x={pad + w + 4} y={h * 0.72} fontSize="11" fill="#1a1a18" fontWeight="600" fontFamily="DM Sans,sans-serif">
              {it.value != null ? it.value.toFixed(1) : '—'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Gauge Chart (demi-cercle) ───
export function GaugeChart({ score, classe, color, size = 160 }) {
  if (score == null) return null
  const cx = size / 2, cy = size * 0.65, rad = size * 0.38
  const sw = 14
  const ratio = Math.min(score / 10, 1)

  const describeArc = (startFrac, endFrac) => {
    const a1 = Math.PI * (1 - startFrac)
    const a2 = Math.PI * (1 - endFrac)
    const x1 = cx + rad * Math.cos(a1), y1 = cy - rad * Math.sin(a1)
    const x2 = cx + rad * Math.cos(a2), y2 = cy - rad * Math.sin(a2)
    const large = Math.abs(endFrac - startFrac) > 0.5 ? 1 : 0
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${large} 0 ${x2} ${y2}`
  }

  return (
    <svg viewBox={`0 0 ${size} ${size * 0.92}`} width="100%" style={{ maxWidth: size, overflow: 'visible' }}>
      <path d={describeArc(0, 1)} fill="none" stroke="#e8e7e2" strokeWidth={sw} strokeLinecap="round" />
      <path d={describeArc(0, ratio)} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="26" fontWeight="700"
        fontFamily="Source Serif 4,serif" fill={color}>{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#6b6b65">/10</text>
      {classe && (
        <text x={cx} y={cy + 28} textAnchor="middle" fontSize="13" fontWeight="600" fill={color}>
          Classe {classe}
        </text>
      )}
    </svg>
  )
}

// ─── Histogram (distribution des scores) ───
export function Histogram({ scores, indicator, color, width = 400, height = 160 }) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ min: i, max: i + 1, count: 0 }))
  const allScores = Object.values(scores)
    .map(d => d[indicator]?.s)
    .filter(s => s != null)

  allScores.forEach(s => {
    const idx = Math.min(Math.floor(s), 9)
    bins[idx].count++
  })

  const maxCount = Math.max(...bins.map(b => b.count), 1)
  const pad = { top: 10, right: 10, bottom: 28, left: 40 }
  const bw = (width - pad.left - pad.right) / bins.length
  const bh = height - pad.top - pad.bottom

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width }}>
      {bins.map((bin, i) => {
        const h = (bin.count / maxCount) * bh
        const x = pad.left + i * bw
        const y = pad.top + bh - h
        return (
          <g key={i}>
            <rect x={x + 1} y={y} width={bw - 2} height={h} rx={2} fill={color} opacity={0.7} />
            <text x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#6b6b65">{bin.min}</text>
          </g>
        )
      })}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = pad.top + bh * (1 - frac)
        const val = Math.round(maxCount * frac)
        return (
          <g key={frac}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e8e7e2" strokeWidth="0.5" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#999">{val}</text>
          </g>
        )
      })}
    </svg>
  )
}

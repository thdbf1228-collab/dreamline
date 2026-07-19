import { won, num, pct } from '../lib/format'

// data = [{axis, value, norm}] 길이 6, norm 0~100
export default function Hexagon({ data, size = 300 }) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.3
  const n = data.length || 6
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2 // 위에서 시작
  const point = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  const ring = (r) => data.map((_, i) => point(i, r).join(',')).join(' ')
  const valuePoly = data.map((d, i) => point(i, (d.norm / 100) * R).join(',')).join(' ')

  const fmt = (axis, v) => {
    if (axis === '파이프라인' || axis === '확정매출' || axis === '평균딜') return won(v)
    if (axis === '전환율') return pct(v)
    return num(v)
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label="담당자 KPI 육각형">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(R * f)} fill="none" stroke="#E5E8EC" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E5E8EC" strokeWidth="1" />
      })}
      <polygon points={valuePoly} fill="#1D4ED8" fillOpacity="0.18" stroke="#1D4ED8" strokeWidth="2" />
      {data.map((d, i) => {
        const [x, y] = point(i, (d.norm / 100) * R)
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#1D4ED8" />
      })}
      {data.map((d, i) => {
        const [lx, ly] = point(i, R + 26)
        const anchor = Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end'
        return (
          <g key={d.axis}>
            <text x={lx} y={ly - 4} textAnchor={anchor} fontSize="11" fill="#94A3B8">
              {d.axis}
            </text>
            <text x={lx} y={ly + 9} textAnchor={anchor} fontSize="12" fontWeight="600" fill="#0F172A">
              {fmt(d.axis, d.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

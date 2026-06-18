import { won, num, pct } from '../lib/format'

// data = [{axis, value, norm}] 길이 6, norm 0~100
export default function Hexagon({ data, size = 240 }) {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.34
  const n = data.length
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2 // 위에서 시작

  const point = (i, r) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  const poly = (r) =>
    data.map((_, i) => point(i, typeof r === 'function' ? r(i) : r).join(',')).join(' ')

  const valuePoly = data.map((d, i) => point(i, (d.norm / 100) * R).join(',')).join(' ')

  const fmt = (axis, v) => {
    if (axis === '파이프라인' || axis === '확정매출' || axis === '평균딜') return won(v)
    if (axis === '전환율') return pct(v)
    return num(v)
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="담당자 KPI 육각형">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={poly(R * f)} fill="none" stroke="#E5E8EC" strokeWidth="1" />
        ))}
        {data.map((_, i) => {
          const [x, y] = point(i, R)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E5E8EC" strokeWidth="1" />
        })}
        <polygon points={valuePoly} fill="#1D4ED8" fillOpacity="0.18" stroke="#1D4ED8" strokeWidth="2" />
        {data.map((d, i) => {
          const [x, y] = point(i, (d.norm / 100) * R)
          return <circle key={i} cx={x} cy={y} r="3" fill="#1D4ED8" />
        })}
      </svg>
      <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5 w-full">
        {data.map((d) => (
          <div key={d.axis} className="text-center">
            <div className="text-[11px] text-ink-400">{d.axis}</div>
            <div className="text-sm font-semibold text-ink-900 tnum">{fmt(d.axis, d.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

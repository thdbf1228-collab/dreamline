import { useMemo } from 'react'
import { useActivities } from '../data/useActivities'
import { countByMonth, countByWeek } from '../data/aggregate'
import { Card } from '../components/ui'
import { num } from '../lib/format'

const mLabel = (k) => `${k.slice(2, 4)}.${k.slice(5, 7)}`
const wLabel = (k) => `${k.slice(5, 7)}.${k.slice(8, 10)}`

function Bars({ data, keyName, label }) {
  if (!data.length) return <p className="text-sm text-ink-400">데이터 없음</p>
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d[keyName]} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-ink-500 tnum">{label(d[keyName])}</span>
          <div className="flex-1 h-5 rounded bg-canvas overflow-hidden">
            <div className="h-full rounded bg-brand" style={{ width: `${(d.count / max) * 100}%`, minWidth: d.count ? 6 : 0 }} />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-semibold text-ink-900 tnum">{d.count}</span>
        </div>
      ))}
    </div>
  )
}

export default function Activity() {
  const { rows } = useActivities()
  const byMonth = useMemo(() => countByMonth(rows, 'activity_date'), [rows])
  const byWeek = useMemo(() => countByWeek(rows, 'activity_date').slice(-12), [rows])
  const byType = useMemo(() => {
    const m = new Map()
    for (const r of rows) { const k = r.activity_type || '미분류'; m.set(k, (m.get(k) || 0) + 1) }
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [rows])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink-900">영업활동 상세</h1>
        <p className="text-sm text-ink-500">활동일시 기준 · 총 {num(rows.length)}건</p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-base font-bold text-ink-900 mb-4">월간 활동</h2>
          <Bars data={byMonth} keyName="month" label={mLabel} />
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-bold text-ink-900 mb-1">주간 활동</h2>
          <p className="text-xs text-ink-400 mb-4">최근 12주 (주 시작일)</p>
          <Bars data={byWeek} keyName="week" label={wLabel} />
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-bold text-ink-900 mb-4">활동 분류별</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
          {byType.map((t) => (
            <div key={t.name} className="flex items-center justify-between border-b border-line py-1.5">
              <span className="text-sm text-ink-700">{t.name}</span>
              <span className="text-sm font-semibold text-brand tnum">{t.count}건</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

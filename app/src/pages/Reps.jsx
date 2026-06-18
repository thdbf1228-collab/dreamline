import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOpportunities } from '../data/useOpportunities'
import { funnel, hexData, repMetrics, bySalesType } from '../data/aggregate'
import { Card, KpiCard, Funnel, Segment } from '../components/ui'
import Hexagon from '../components/Hexagon'
import { won, num, pct } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const SALES = [
  { value: 'all', label: '전체' },
  { value: '기업', label: '기업' },
  { value: '글로벌', label: '글로벌' },
]

export default function Reps() {
  const { rows, error, loading } = useOpportunities()
  const [reps, setReps] = useState([])
  const [sel, setSel] = useState('')
  const [sales, setSales] = useState('all')

  useEffect(() => {
    supabase
      .from('reps')
      .select('name, photo_url, group_id, groups(name)')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        const list = data || []
        setReps(list)
        if (list.length && !sel) setSel(list[0].name)
      })
  }, [])

  const frows = useMemo(() => (rows ? bySalesType(rows, sales) : []), [rows, sales])
  const repNames = useMemo(() => reps.map((r) => r.name), [reps])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const current = reps.find((r) => r.name === sel)
  const hex = sel && repNames.length ? hexData(frows, repNames, sel) : []
  const m = sel ? repMetrics(frows, sel) : null
  const f = sel ? funnel(frows.filter((r) => r.rep_name === sel)) : []

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">담당자별</h1>
          <p className="text-sm text-ink-500">육각형은 담당자 전체 대비 상대 위치</p>
        </div>
        <div className="flex items-center gap-3">
          <Segment value={sales} onChange={setSales} options={SALES} />
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="w-44 rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-brand"
          >
            {reps.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
                {r.groups?.name ? ` · ${r.groups.name}` : ''}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!sel || !m ? null : (
        <div className="grid md:grid-cols-[300px_1fr] gap-4 items-stretch">
          {/* 담당자 카드: 사진 + 육각형 */}
          <Card className="p-5 flex flex-col">
            <div className="flex items-center gap-3">
              <Avatar url={current?.photo_url} name={sel} />
              <div>
                <div className="text-base font-bold text-ink-900">{sel}</div>
                <div className="text-xs text-ink-400">{current?.groups?.name || '미배정'}</div>
              </div>
            </div>
            <div className="mt-2 flex-1 flex items-center">
              <Hexagon data={hex} />
            </div>
          </Card>

          {/* 우측: KPI + 큰 파이프라인 (하단 정렬) */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="진행 파이프라인" value={won(m._k.pipelineAmount)} sub={`${m._k.pipelineCount}건`} />
              <KpiCard label="확정 매출" value={won(m._k.confirmedAmount)} sub={`${m._k.wonCount}건`} />
              <KpiCard label="전환율" value={pct(m._k.winRate, 1)} />
              <KpiCard label="담당 거래처" value={`${m.거래처수}곳`} />
            </div>
            <Card className="p-6 flex-1 flex flex-col">
              <h2 className="text-sm font-semibold text-ink-900 mb-5">단계별 파이프라인</h2>
              {m._k.total === 0 ? (
                <p className="text-sm text-ink-400">담당 영업기회가 없습니다.</p>
              ) : (
                <div className="flex-1 flex flex-col justify-center">
                  <BigFunnel data={f} />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

const STAGE_COLOR = ['', '#C5DBF6', '#93B8EC', '#5C93DE', '#2E6FCC', '#14479A']

// 담당자 단일 뷰용 큰 깔때기
function BigFunnel({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.id} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm text-ink-500">{d.label}</span>
          <div className="flex-1 h-9 rounded-md bg-canvas overflow-hidden">
            <div
              className="h-full rounded-md flex items-center justify-end pr-3"
              style={{ width: `${(d.count / max) * 100}%`, background: STAGE_COLOR[d.id], minWidth: d.count ? 36 : 0 }}
            >
              <span className="text-xs font-bold text-white tnum">{d.count}</span>
            </div>
          </div>
          <span className="w-24 shrink-0 text-right text-sm text-ink-700 tnum">{won(d.amount)}</span>
        </div>
      ))}
    </div>
  )
}

function Avatar({ url, name }) {
  if (url) return <img src={url} alt={name} className="w-16 h-16 rounded-full object-cover border border-line" />
  return (
    <div className="w-16 h-16 rounded-full bg-brand-soft flex items-center justify-center text-xl font-bold text-brand">
      {name?.slice(-2)}
    </div>
  )
}

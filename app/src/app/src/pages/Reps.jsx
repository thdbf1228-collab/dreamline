import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOpportunities } from '../data/useOpportunities'
import { funnel, hexData, repMetrics } from '../data/aggregate'
import { Card, KpiCard, Funnel } from '../components/ui'
import Hexagon from '../components/Hexagon'
import { won, num, pct } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

export default function Reps() {
  const { rows, error, loading } = useOpportunities()
  const [reps, setReps] = useState([])
  const [sel, setSel] = useState('')

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

  const repNames = useMemo(() => reps.map((r) => r.name), [reps])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />

  const current = reps.find((r) => r.name === sel)
  const hex = sel && repNames.length ? hexData(rows, repNames, sel) : []
  const m = sel ? repMetrics(rows, sel) : null
  const f = sel ? funnel(rows.filter((r) => r.rep_name === sel)) : []

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink-900">담당자별</h1>
          <p className="text-sm text-ink-500">육각형은 담당자 전체 대비 상대 위치</p>
        </div>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="w-48 rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-brand"
        >
          {reps.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
              {r.groups?.name ? ` · ${r.groups.name}` : ''}
            </option>
          ))}
        </select>
      </header>

      {!sel ? null : (
        <div className="grid md:grid-cols-[260px_1fr] gap-4 items-start">
          {/* 담당자 카드: 사진 + 육각형 */}
          <Card className="p-5">
            <div className="flex flex-col items-center">
              <Avatar url={current?.photo_url} name={sel} />
              <div className="mt-3 text-base font-bold text-ink-900">{sel}</div>
              <div className="text-xs text-ink-400">{current?.groups?.name || '미배정'}</div>
            </div>
            <div className="mt-5">
              <Hexagon data={hex} />
            </div>
          </Card>

          {/* 파이프라인 + KPI */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="진행 파이프라인" value={won(m._k.pipelineAmount)} sub={`${m._k.pipelineCount}건`} />
              <KpiCard label="확정 매출" value={won(m._k.confirmedAmount)} sub={`${m._k.wonCount}건`} />
              <KpiCard label="전환율" value={pct(m._k.winRate, 1)} />
              <KpiCard label="담당 거래처" value={`${m.거래처수}곳`} />
            </div>
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-4">단계별 파이프라인</h2>
              {m._k.total === 0 ? (
                <p className="text-sm text-ink-400">담당 영업기회가 없습니다.</p>
              ) : (
                <Funnel data={f} />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ url, name }) {
  if (url)
    return <img src={url} alt={name} className="w-24 h-24 rounded-full object-cover border border-line" />
  return (
    <div className="w-24 h-24 rounded-full bg-brand-soft flex items-center justify-center text-2xl font-bold text-brand">
      {name?.slice(-2)}
    </div>
  )
}

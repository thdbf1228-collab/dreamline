import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { STAGES, STATUSES, filterDeals } from '../data/aggregate'
import { DealCard, Select } from '../components/ui'
import { num } from '../lib/format'
import { Loading, ErrorBox } from './Overview'

const INIT = { salesType: 'all', group: 'all', rep: 'all', stage: 'all', status: 'all', q: '' }

export default function Accounts() {
  const { rows, error, loading } = useOpportunities()
  const [f, setF] = useState(INIT)

  const groups = useMemo(() => [...new Set((rows || []).map((r) => r.group_name || '미배정'))].sort(), [rows])
  const reps = useMemo(() => [...new Set((rows || []).map((r) => r.rep_name).filter(Boolean))].sort(), [rows])
  const filtered = useMemo(
    () =>
      (rows ? filterDeals(rows, f) : []).sort(
        (a, b) => (a.stage_order - b.stage_order) || (Number(b.display_amount) || 0) - (Number(a.display_amount) || 0)
      ),
    [rows, f]
  )

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">거래처별 파이프라인</h1>
        <p className="text-sm text-ink-500">{num(filtered.length)}건 / 전체 {num((rows || []).length)}건</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input value={f.q} onChange={(e) => set('q')(e.target.value)} placeholder="거래처 · 영업기회 · 담당자 검색"
          className="w-56 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <Select value={f.salesType} onChange={set('salesType')}>
          <option value="all">매출구분 전체</option><option value="기업">기업</option><option value="글로벌">글로벌</option>
        </Select>
        <Select value={f.group} onChange={set('group')}>
          <option value="all">그룹 전체</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
        <Select value={f.rep} onChange={set('rep')}>
          <option value="all">담당자 전체</option>{reps.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Select value={f.stage} onChange={set('stage')}>
          <option value="all">단계 전체</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
        <Select value={f.status} onChange={set('status')}>
          <option value="all">진행상태 전체</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <button onClick={() => setF(INIT)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-500 hover:bg-canvas">초기화</button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-400">조건에 맞는 거래가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((d) => <DealCard key={d.id} deal={d} />)}
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { useActivities } from '../data/useActivities'
import { useContracts } from '../data/useContracts'
import { STAGES, STATUSES, filterDeals } from '../data/aggregate'
import { DealCard, Select } from '../components/ui'
import { num } from '../lib/format'
import DrillModal from '../components/DrillModal'
import { isHiddenGroup } from '../data/useReps'
import { Loading, ErrorBox } from './Overview'

const STATUS_ORDER = { '진행중': 0, '보류/연기': 1, '종료(실패)': 2, '종료(성공)': 3 }
const INIT = { salesType: 'all', group: 'all', rep: 'all', stage: 'all', status: 'all', period: 'all', q: '' }

export default function Accounts() {
  const { rows, error, loading } = useOpportunities()
  const { rows: acts } = useActivities()
  const { rows: cons } = useContracts()
  const [drill, setDrill] = useState(null)
  const [f, setF] = useState(INIT)

  const groups = useMemo(() => [...new Set((rows || []).map((r) => r.group_name || '미배정'))].filter((g) => !isHiddenGroup(g)).sort(), [rows])
  const reps = useMemo(() => [...new Set((rows || []).filter((r) => !isHiddenGroup(r.group_name) && (f.group === 'all' || r.group_name === f.group)).map((r) => r.rep_name).filter(Boolean))].sort(), [rows, f.group])
  const periods = useMemo(() => [...new Set((rows || []).map((r) => (r.start_date || '').slice(0, 7)).filter(Boolean))].sort().reverse(), [rows])
  const filtered = useMemo(() => {
    let out = rows ? filterDeals(rows.filter((r) => !isHiddenGroup(r.group_name)), { ...f, status: f.status === '정체' ? 'all' : f.status }) : []
    if (f.status === '정체') out = out.filter((d) => d.is_stale)
    if (f.period !== 'all') out = out.filter((d) => (d.start_date || '').slice(0, 7) === f.period)
    return out.sort((a, b) => ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) || (Number(b.display_amount) || 0) - (Number(a.display_amount) || 0))
  }, [rows, f])

  if (loading) return <Loading />
  if (error) return <ErrorBox msg={error} />
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  // 같은 영업기회ID의 영업활동·계약을 함께 조회
  const openDeal = (d) => {
    const oid = d.external_id
    const oppTitle = d.title
    setDrill({
      title: `${d.account_name || ''} · ${d.title || ''}`.trim(),
      subtitle: `영업기회ID ${oid}`,
      sections: [
        { kind: 'act', rows: (acts || []).filter((a) => String(a.opportunity_external_id) === String(oid)).map((a) => ({ ...a, _opp_title: oppTitle })).sort((x, y) => String(x.activity_date || '').localeCompare(String(y.activity_date || ''))), hide: ['external_id', 'opportunity_external_id', 'related_product', 'start_time', 'end_time', 'customer_name', 'companion', 'participants', 'registered_by'] },
      ],
    })
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-ink-900">파이프라인 현황</h1>
        <p className="text-sm text-ink-500">
          <button type="button" onClick={() => setDrill({ title: '파이프라인 백데이터', subtitle: '현재 필터 기준', sections: [{ kind: 'opp', rows: filtered, hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })} className="underline-offset-4 hover:underline hover:text-ink-800">{num(filtered.length)}건</button>
          {' / 전체 '}{num((rows || []).length)}건
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input value={f.q} onChange={(e) => set('q')(e.target.value)} placeholder="거래처 · 영업기회 · 담당자 검색"
          className="flex-1 min-w-[12rem] rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <Select value={f.group} onChange={(v) => setF((p) => ({ ...p, group: v, rep: 'all' }))}>
          <option value="all">그룹 전체</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
        <Select value={f.rep} onChange={set('rep')}>
          <option value="all">담당자 전체</option>{reps.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
        <Select value={f.stage} onChange={set('stage')}>
          <option value="all">단계 전체</option>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </Select>
        <Select value={f.status} onChange={set('status')}>
          <option value="all">진행상태 전체</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}<option value="정체">정체</option>
        </Select>
        <Select value={f.period} onChange={set('period')}>
          <option value="all">시작일 전체</option>{periods.map((m) => <option key={m} value={m}>{m.slice(2, 4)}.{m.slice(5, 7)}</option>)}
        </Select>
        <button onClick={() => setF(INIT)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-500 hover:bg-canvas">초기화</button>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-400">조건에 맞는 거래가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((d) => <DealCard onOpen={() => openDeal(d)} key={d.id} deal={d} />)}
        </div>
      )}

      <DrillModal open={!!drill} onClose={() => setDrill(null)} title={drill?.title} subtitle={drill?.subtitle} sections={drill?.sections || []} />
    </div>
  )
}

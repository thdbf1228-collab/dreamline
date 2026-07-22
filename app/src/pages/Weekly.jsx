import { useMemo, useState } from 'react'
import { useOpportunities } from '../data/useOpportunities'
import { useActivities } from '../data/useActivities'
import { useContracts } from '../data/useContracts'
import { useReps, isHiddenGroup } from '../data/useReps'
import { useHolidays } from '../data/useHolidays'
import { Card } from '../components/ui'
import { num } from '../lib/format'
import { Loading, ErrorBox } from './Overview'
import DrillModal from '../components/DrillModal'

const C_OPP = '#2F5597'
const C_ACT = '#D98E33'
const DOW = ['일', '월', '화', '수', '목', '금', '토']

function ymd(d) { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function label(s) { return s.replaceAll('-', '.').slice(5) }

export default function Weekly() {
  const { rows: opps, error: e1, loading: l1 } = useOpportunities()
  const { rows: acts, loading: l2 } = useActivities()
  const { rows: cons, loading: l3 } = useContracts()
  const { reps: repList } = useReps()
  const holidays = useHolidays()
  const [weekOffset, setWeekOffset] = useState(0)
  const [drill, setDrill] = useState(null)

  // 기준일 = 어제 (오늘 데이터는 아직 업로드 전이라 제외). weekOffset 주 단위 이동.
  const baseEnd = addDays(new Date(), weekOffset * 7 - 1)
  const range = useMemo(() => {
    const end = new Date(baseEnd)
    return { start: ymd(addDays(end, -6)), end: ymd(end) }
  }, [weekOffset])
  const prev = useMemo(() => {
    const end = addDays(new Date(baseEnd), -7)
    return { start: ymd(addDays(end, -6)), end: ymd(end) }
  }, [weekOffset])
  const yestStr = ymd(baseEnd)                    // 기준일(어제)
  const day2Str = ymd(addDays(new Date(baseEnd), -1))  // 그 전날(이틀전)

  const dOf = (v) => (v || '').slice(0, 10)
  const inRange = (v, r) => { const d = dOf(v); return d && d >= r.start && d <= r.end }
  const visible = (r) => r.group_name && !isHiddenGroup(r.group_name)
  const oppTitle = (oid) => (opps || []).find((o) => String(o.external_id) === String(oid))?.title || null

  const cur = useMemo(() => ({
    o: (opps || []).filter((r) => visible(r) && inRange(r.start_date, range)),
    a: (acts || []).filter((r) => visible(r) && inRange(r.activity_date, range)),
    c: (cons || []).filter((r) => inRange(r.contract_date, range)),
  }), [opps, acts, cons, range])

  const prevCnt = useMemo(() => ({
    o: (opps || []).filter((r) => visible(r) && inRange(r.start_date, prev)).length,
    a: (acts || []).filter((r) => visible(r) && inRange(r.activity_date, prev)).length,
    c: (cons || []).filter((r) => inRange(r.contract_date, prev)).length,
  }), [opps, acts, cons, prev])

  // 일자별 (7일)
  const days = useMemo(() => {
    const arr = []
    let cursor = new Date(range.end)
    while (arr.length < 5) {
      const day = cursor.getDay()
      if (day !== 0 && day !== 6) { // 주말은 건너뜀
        const d = ymd(cursor)
        arr.unshift({
          date: d,
          dow: DOW[day],
          holiday: holidays.includes(d),
          o: cur.o.filter((r) => dOf(r.start_date) === d).length,
          a: cur.a.filter((r) => dOf(r.activity_date) === d).length,
        })
      }
      cursor = addDays(cursor, -1)
    }
    return arr
  }, [cur, range, holidays])
  const maxDay = Math.max(1, ...days.filter((d) => !d.holiday).map((d) => Math.max(d.o, d.a)))

  const groups = useMemo(() => {
    const s = new Set()
    for (const r of repList || []) if (r.group_name) s.add(r.group_name)
    for (const r of cur.o) if (r.group_name) s.add(r.group_name)
    for (const r of cur.a) if (r.group_name) s.add(r.group_name)
    return [...s].filter((g) => !isHiddenGroup(g)).sort()
  }, [repList, cur])

  const roster = useMemo(() => (repList || [])
    .filter((r) => r.group_name && !isHiddenGroup(r.group_name))
    .map((r) => ({ rep: r.rep_name, group: r.group_name })), [repList])

  const repRows = useMemo(() => {
    const m = new Map()
    for (const r of roster) if (!m.has(r.rep)) m.set(r.rep, { rep: r.rep, group: r.group, o: 0, a: 0, yA: 0, d2A: 0 })
    for (const r of cur.o) { const x = m.get(r.rep_name); if (x) x.o += 1 }
    for (const r of cur.a) {
      const x = m.get(r.rep_name); if (!x) continue
      x.a += 1
      if (dOf(r.activity_date) === yestStr) x.yA += 1
      if (dOf(r.activity_date) === day2Str) x.d2A += 1
    }
    return [...m.values()].sort((x, y) => (y.a - x.a) || (y.o - x.o) || x.rep.localeCompare(y.rep))
  }, [roster, cur, yestStr, day2Str])

  const diff = (n, p) => { const d = n - p; return d === 0 ? '±0' : d > 0 ? `+${d}` : `${d}` }

  if (l1 || l2 || l3) return <Loading />
  if (e1) return <ErrorBox msg={e1} />

  const sub = `${label(range.start)}~${label(range.end)}`
  const openOpp = (rows, title, subtitle = sub) => rows.length && setDrill({ title, subtitle, sections: [{ kind: 'opp', rows, hide: ['external_id', 'product', 'est_amount', 'confirmed_amount', 'win_prob', 'channel'] }] })
  const openAct = (rows, title, subtitle = sub) => rows.length && setDrill({ title, subtitle, sections: [{ kind: 'act', rows: rows.map((x) => ({ ...x, _opp_title: oppTitle(x.opportunity_external_id) })), hide: ['external_id', 'opportunity_external_id', 'related_product', 'start_time', 'end_time', 'customer_name', 'companion', 'participants', 'registered_by'] }] })
  const openCon = (rows, title, subtitle = sub) => rows.length && setDrill({ title, subtitle, sections: [{ kind: 'con', rows, hide: ['external_id', 'opportunity_external_id', 'opportunity_title'] }] })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">주간현황</h1>
          <p className="text-sm text-ink-500">{range.start.replaceAll('-', '.')} ~ {range.end.replaceAll('-', '.')} · 어제까지 최근 7일</p>
        </div>
        <select value={weekOffset} onChange={(e) => setWeekOffset(Number(e.target.value))}
          className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-700 focus:border-brand">
          <option value={0}>이번 주</option>
          <option value={-1}>지난 주</option>
          <option value={-2}>2주 전</option>
          <option value={-3}>3주 전</option>
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <Card className="p-4 cursor-pointer hover:ring-2 hover:ring-brand/30" onClick={() => openOpp(cur.o, '이번 주 신규 영업기회')}>
          <div className="text-sm text-ink-500">신규 영업기회 <span className="text-ink-400">(시작일)</span></div>
          <div className="mt-1 text-2xl font-bold tnum" style={{ color: C_OPP }}>{num(cur.o.length)}건</div>
          <div className="mt-0.5 text-xs text-ink-400">지난주 {prevCnt.o}건 · {diff(cur.o.length, prevCnt.o)}</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-2 hover:ring-brand/30" onClick={() => openAct(cur.a, '이번 주 영업활동')}>
          <div className="text-sm text-ink-500">영업활동 <span className="text-ink-400">(활동일시)</span></div>
          <div className="mt-1 text-2xl font-bold tnum" style={{ color: C_ACT }}>{num(cur.a.length)}건</div>
          <div className="mt-0.5 text-xs text-ink-400">지난주 {prevCnt.a}건 · {diff(cur.a.length, prevCnt.a)}</div>
        </Card>
        <Card className="p-4 cursor-pointer hover:ring-2 hover:ring-brand/30" onClick={() => openCon(cur.c, '이번 주 계약')}>
          <div className="text-sm text-ink-500">계약 <span className="text-ink-400">(계약일)</span></div>
          <div className="mt-1 text-2xl font-bold tnum text-ink-900">{num(cur.c.length)}건</div>
          <div className="mt-0.5 text-xs text-ink-400">지난주 {prevCnt.c}건 · {diff(cur.c.length, prevCnt.c)}</div>
        </Card>
      </div>

      {/* 일자별 막대 */}
      <Card className="p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-bold text-ink-900">일자별 <span className="text-xs font-normal text-ink-400">막대 클릭 시 상세</span></span>
          <span className="text-xs text-ink-400">
            <span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: C_OPP }} />영업기회
            <span className="ml-2.5 mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: C_ACT }} />영업활동
          </span>
        </div>
        <div className="flex items-end gap-2.5" style={{ height: 140 }}>
          {days.map((d) => {
            return (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end">
                {d.holiday ? (
                  <div className="flex w-full items-end justify-center" style={{ height: '100%' }}>
                    <span className="mb-1 rounded bg-canvas px-1.5 py-0.5 text-[11px] text-ink-400">공휴일</span>
                  </div>
                ) : (
                  <div className="flex w-3/5 items-end gap-[3px]" style={{ height: '100%' }}>
                    <div className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end" title={`영업기회 ${d.o}건`}
                      onClick={() => openOpp(cur.o.filter((r) => dOf(r.start_date) === d.date), `${label(d.date)} 신규 영업기회`, label(d.date))}>
                      <span className="mb-0.5 text-xs font-bold tnum" style={{ color: d.o ? C_OPP : '#aab3c0' }}>{d.o}</span>
                      <div className="w-full rounded-t hover:opacity-80" style={{ height: `${(d.o / maxDay) * 90}%`, minHeight: d.o ? 4 : 0, background: C_OPP }} />
                    </div>
                    <div className="flex h-full flex-1 cursor-pointer flex-col items-center justify-end" title={`영업활동 ${d.a}건`}
                      onClick={() => openAct(cur.a.filter((r) => dOf(r.activity_date) === d.date), `${label(d.date)} 영업활동`, label(d.date))}>
                      <span className="mb-0.5 text-xs font-bold tnum" style={{ color: d.a ? C_ACT : '#aab3c0' }}>{d.a}</span>
                      <div className="w-full rounded-t hover:opacity-80" style={{ height: `${(d.a / maxDay) * 90}%`, minHeight: d.a ? 4 : 0, background: C_ACT }} />
                    </div>
                  </div>
                )}
                <div className="mt-1.5 text-xs font-semibold text-ink-700">{Number(d.date.slice(8))}일 ({d.dow})</div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 그룹별 */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-line px-5 py-3 text-sm font-bold text-ink-900">그룹별</div>
        <table className="w-full text-sm">
          <thead className="bg-canvas text-xs text-ink-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">그룹</th>
              <th className="px-3 py-2 text-right font-medium">영업기회</th>
              <th className="px-3 py-2 text-right font-medium">영업활동</th>
              <th className="px-5 py-2 text-right font-medium">계약</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const go = cur.o.filter((r) => r.group_name === g)
              const ga = cur.a.filter((r) => r.group_name === g)
              const gc = cur.c.filter((r) => r.group_name === g)
              return (
                <tr key={g} className="border-t border-line/70">
                  <td className="px-5 py-2.5 font-semibold text-ink-900">{g}</td>
                  <td className={`px-3 py-2.5 text-right tnum font-semibold ${go.length ? 'cursor-pointer hover:underline' : 'text-ink-300'}`} style={go.length ? { color: C_OPP } : undefined}
                    onClick={() => openOpp(go, `${g} 신규 영업기회`)}>{go.length}건</td>
                  <td className={`px-3 py-2.5 text-right tnum font-semibold ${ga.length ? 'cursor-pointer hover:underline' : 'text-ink-300'}`} style={ga.length ? { color: C_ACT } : undefined}
                    onClick={() => openAct(ga, `${g} 영업활동`)}>{ga.length}건</td>
                  <td className={`px-5 py-2.5 text-right tnum font-semibold ${gc.length ? 'cursor-pointer hover:underline text-ink-700' : 'text-ink-300'}`}
                    onClick={() => openCon(gc, `${g} 계약`)}>{gc.length}건</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {/* 담당자별 */}
      <Card className="p-0 overflow-hidden">
        <div className="border-b border-line px-5 py-3 text-sm font-bold text-ink-900">담당자별 <span className="text-xs font-normal text-ink-400">카운팅 대상 전원 · 0건 포함 · 영업기회·영업활동=주간 누계 / 날짜=영업활동 하루</span></div>
        <table className="w-full text-sm">
          <thead className="bg-canvas text-xs text-ink-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">담당자</th>
              <th className="px-3 py-2 text-left font-medium">그룹</th>
              <th className="px-3 py-2 text-right font-medium">영업기회<span className="font-normal text-ink-400"> (주간)</span></th>
              <th className="px-3 py-2 text-right font-medium">영업활동<span className="font-normal text-ink-400"> (주간)</span></th>
              <th className="px-5 py-2 text-right font-medium">{Number(day2Str.slice(8))}일/{Number(yestStr.slice(8))}일<span className="font-normal text-ink-400"> (활동)</span></th>
            </tr>
          </thead>
          <tbody>
            {repRows.map((r) => (
              <tr key={r.rep} className="border-t border-line/70">
                <td className="px-5 py-2.5 font-semibold text-ink-900">{r.rep}</td>
                <td className="px-3 py-2.5 text-ink-500">{r.group}</td>
                <td className={`px-3 py-2.5 text-right tnum font-semibold ${r.o ? 'cursor-pointer hover:underline' : ''}`} style={{ color: C_OPP, opacity: r.o ? 1 : 0.45 }}
                  onClick={() => openOpp(cur.o.filter((x) => x.rep_name === r.rep), `${r.rep} 신규 영업기회`)}>{r.o}건</td>
                <td className={`px-3 py-2.5 text-right tnum font-semibold ${r.a ? 'cursor-pointer hover:underline' : ''}`} style={{ color: C_ACT, opacity: r.a ? 1 : 0.45 }}
                  onClick={() => openAct(cur.a.filter((x) => x.rep_name === r.rep), `${r.rep} 영업활동`)}>{r.a}건</td>
                <td className="px-5 py-2.5 text-right tnum text-sm font-semibold">
                  <span className={r.d2A ? 'cursor-pointer text-ink-700 hover:underline' : 'text-ink-300'}
                    onClick={() => openAct(cur.a.filter((x) => x.rep_name === r.rep && dOf(x.activity_date) === day2Str), `${r.rep} 그제 영업활동`, label(day2Str))}>{r.d2A}</span>
                  <span className="text-ink-300"> / </span>
                  <span className={r.yA ? 'cursor-pointer text-ink-700 hover:underline' : 'text-ink-300'}
                    onClick={() => openAct(cur.a.filter((x) => x.rep_name === r.rep && dOf(x.activity_date) === yestStr), `${r.rep} 어제 영업활동`, label(yestStr))}>{r.yA}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>


      <DrillModal open={!!drill} onClose={() => setDrill(null)} title={drill?.title} subtitle={drill?.subtitle} sections={drill?.sections || []} />
    </div>
  )
}

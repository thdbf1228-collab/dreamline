import { useMemo, useState, Fragment } from 'react'
import { useRevenue } from '../data/useRevenue'

// ── 색/스타일 상수 (로즈 테마) ──
const HDR = '#6E4A54'
const TINT = { '주요매출': '#E3C0B7', '엔터프라이즈 1,2그룹': '#F7EAE6', '엔터프라이즈 3그룹': '#F7EAE6', '글로벌': '#FDF8F6', '기업': '#FDF8F6' }
const TINT_EBIT = { '합계': '#E3C0B7', '엔터프라이즈 1,2그룹': '#FDF8F6', '엔터프라이즈 3그룹': '#FDF8F6' }
const MAIN_PLANC = '#7D5B52'  // 최상위 총계행(주요매출/합계) 계획 숫자색 (진한 바탕 대비)
const FC = '#98A2B3', FCBG = '#F3F5F8', BRAND = '#1D4ED8', LOST = '#E02424'
const CUM_BORDER = '#E3CFC9', CUM_HEADBG = '#F7EAE6', CUM_CELLBG = '#FDF7F5'
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]
const comma = (v) => Math.round(Number(v) || 0).toLocaleString('ko-KR')
const fmtDate = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` }
const comma1 = (v) => { const n = Math.round((Number(v) || 0) * 10) / 10; return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }
const rate = (p, a) => { const r = p ? (a / p) * 100 : 0; return { r, c: r >= 100 ? BRAND : (p ? LOST : FC) } }

// lastConf = 마지막 확정월(자동감지). 그 이하 월은 확정, 초과는 예상.
function periodsFor(mode, lastConf = 6) {
  const mc = (m) => m <= lastConf
  if (mode === 'cum') return { cum: true, cols: [{ ms: MONTHS.filter((m) => m <= lastConf), label: `확정누계 1~${lastConf}월`, conf: true, cc: true }], tot: { ms: MONTHS, label: '2026년(연간)' } }
  if (mode === 'q') return { cols: [{ ms: [1,2,3], label: '1분기', conf: mc(3) }, { ms: [4,5,6], label: '2분기', conf: mc(6) }, { ms: [7,8,9], label: '3분기', conf: mc(9) }, { ms: [10,11,12], label: '4분기', conf: mc(12) }], tot: { ms: MONTHS, label: '2026년' } }
  if (mode === 'h1') return { cols: Array.from({ length: 6 }, (_, i) => ({ ms: [i+1], label: `${i+1}월`, conf: mc(i+1) })), tot: { ms: [1,2,3,4,5,6], label: '상반기 누계' } }
  if (mode === 'h2') return { cols: Array.from({ length: 6 }, (_, i) => ({ ms: [i+7], label: `${i+7}월`, conf: mc(i+7) })), tot: { ms: [7,8,9,10,11,12], label: '하반기 누계' } }
  return { cols: Array.from({ length: 12 }, (_, i) => ({ ms: [i+1], label: `${i+1}월`, conf: mc(i+1) })), tot: { ms: MONTHS, label: '2026년' } }
}
const agg = (row, ms) => ms.reduce((o, m) => ({ plan: o.plan + row.months[m].plan, val: o.val + row.months[m].val }), { plan: 0, val: 0 })
const aggCum = (row, lastConf) => agg(row, MONTHS.filter((m) => m <= lastConf))

// 3칸(계획/실적/달성). box=확정누계 박스, noBg=예상 회색 억제(연간칸)
function Trio({ o, conf, tot, rowBg, box, noBg, planColor }) {
  const ri = rate(o.plan, o.val)
  const bg = box ? CUM_CELLBG : (rowBg || (conf || noBg ? undefined : FCBG))
  const bs = bg ? { background: bg } : undefined
  const vcol = conf ? '#0F172A' : FC
  const lb = box ? { borderLeft: `2px solid ${CUM_BORDER}` } : (tot ? { borderLeft: '2px solid #E5E8EC' } : { borderLeft: '1px solid #EEF1F5' })
  const rb = box ? { borderRight: `2px solid ${CUM_BORDER}` } : undefined
  return (
    <>
      <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ ...lb, ...bs, color: planColor || '#94A3B8' }}>{comma(o.plan)}</td>
      <td className="px-2.5 py-1.5 text-right tabular-nums font-bold" style={{ ...bs, color: vcol }}>{comma(o.val)}</td>
      <td className="px-2.5 py-1.5 text-right tabular-nums font-bold" style={{ ...bs, ...rb, color: ri.c }}>{o.plan ? `${ri.r.toFixed(0)}%` : '–'}</td>
    </>
  )
}

function TableHead({ P, first = '구분' }) {
  return (
    <thead>
      <tr>
        <th rowSpan={2} className="px-2.5 py-2 text-left sticky left-0 z-[4] bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line" style={{ minWidth: 180, borderRight: '2px solid #E5E8EC' }}>{first}</th>
        {P.cols.map((c, i) => (
          <th key={i} colSpan={3} className="px-2.5 py-2 text-center font-semibold border-b border-line"
            style={c.cc ? { borderLeft: `2px solid ${CUM_BORDER}`, borderRight: `2px solid ${CUM_BORDER}`, borderTop: `2px solid ${CUM_BORDER}`, background: CUM_HEADBG, color: HDR } : { borderLeft: '1px solid #E5E8EC', background: '#FbFcFd', color: '#64748B' }}>
            {c.label}{!c.cc && <span className="ml-1 text-[9px] font-bold rounded-lg px-1.5 py-px" style={{ background: c.conf ? '#475569' : '#EEF0F3', color: c.conf ? '#fff' : FC }}>{c.conf ? '확정' : '예상'}</span>}
          </th>
        ))}
        <th colSpan={3} className="px-2.5 py-2 text-center bg-[#FbFcFd] font-semibold border-b border-line" style={{ borderLeft: '2px solid #E5E8EC', color: BRAND }}>{P.tot.label}</th>
      </tr>
      <tr>
        {P.cols.map((c, i) => (
          <Fragment key={i}>
            <th className="px-2.5 py-2 text-right font-semibold border-b border-line" style={c.cc ? { borderLeft: `2px solid ${CUM_BORDER}`, background: CUM_HEADBG, color: HDR } : { borderLeft: '1px solid #E5E8EC', background: '#FbFcFd', color: '#64748B' }}>계획</th>
            <th className="px-2.5 py-2 text-right font-semibold border-b border-line" style={c.cc ? { background: CUM_HEADBG, color: HDR } : { background: '#FbFcFd', color: '#64748B' }}>{c.conf ? '실적' : '예상'}</th>
            <th className="px-2.5 py-2 text-right font-semibold border-b border-line" style={c.cc ? { borderRight: `2px solid ${CUM_BORDER}`, background: CUM_HEADBG, color: HDR } : { background: '#FbFcFd', color: '#64748B' }}>달성</th>
          </Fragment>
        ))}
        <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line" style={{ borderLeft: '2px solid #E5E8EC' }}>계획</th>
        <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line">{P.cum ? '실적+예상' : '실적'}</th>
        <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line">달성</th>
      </tr>
    </thead>
  )
}

function RevTable({ rows, P, expanded, onToggle, tint = TINT }) {
  const cum = !!P.cum
  const renderRow = (row) => {
    const bg = cum ? undefined : tint[row.label]
    const pad = 12 + (row.level || 0) * 16
    const hasKid = row.kids && row.kids.length
    const exp = expanded[row.label]
    const fw = (row.level || 0) < 2 ? 700 : (row.level || 0) < 3 ? 600 : 400
    const mainPlan = (!cum && (row.level || 0) === 0) ? MAIN_PLANC : undefined   // 최상위 총계행 계획 숫자색
    return (
      <Fragment key={row.label}>
        <tr>
          <td className="px-2.5 py-1.5 text-left sticky left-0 z-[3]" style={{ background: bg || '#fff', paddingLeft: pad, fontWeight: fw, minWidth: 180, borderRight: '2px solid #E5E8EC' }}>
            {hasKid && <span onClick={() => onToggle(row.label)} className="cursor-pointer select-none text-ink-500 inline-block w-3.5 text-center mr-0.5">{exp ? '▾' : '▸'}</span>}
            {row.label}
          </td>
          {P.cols.map((c, i) => <Trio key={i} o={agg(row, c.ms)} conf={c.conf} rowBg={bg} box={cum && c.cc} planColor={mainPlan} />)}
          <Trio o={agg(row, P.tot.ms)} conf={false} tot rowBg={bg} noBg={cum} planColor={mainPlan} />
        </tr>
        {hasKid && exp && row.kids.map((k) => renderRow(k))}
      </Fragment>
    )
  }
  return (
    <table className="text-xs whitespace-nowrap w-full border-collapse">
      <TableHead P={P} />
      <tbody className="[&_td]:border-b [&_td]:border-[#EEF1F5]">{rows.map((r) => renderRow(r))}</tbody>
    </table>
  )
}

// ── 개인별(그룹별) 표 ──
function PersonTable({ owners, P, expanded, onToggle }) {
  const kidRow = (k, ownerBase) => {
    const lvl = ownerBase + (k.baseLevel || 0)
    const fw = lvl < 2 ? 700 : lvl < 3 ? 600 : 400
    const kbg = (k.baseLevel || 0) <= 1 ? '#FDF8F6' : undefined   // 글로벌/기업(주요) 소계 행에 옅은 바탕색
    return (
      <tr key={`${ownerBase}-${k.label}-${lvl}`}>
        <td className="px-2.5 py-1.5 text-left sticky left-0 z-[3]" style={{ background: kbg || '#fff', paddingLeft: 12 + lvl * 15, fontWeight: fw, minWidth: 180, borderRight: '2px solid #E5E8EC' }}>{k.label}</td>
        {P.cols.map((c, i) => <Trio key={i} o={agg(k, c.ms)} conf={c.ms.every((m) => k.months[m].conf)} rowBg={kbg} />)}
        <Trio o={agg(k, P.tot.ms)} conf={false} tot rowBg={kbg} />
      </tr>
    )
  }
  return (
    <table className="text-xs whitespace-nowrap w-full border-collapse">
      <TableHead P={P} first="담당자" />
      <tbody className="[&_td]:border-b [&_td]:border-[#EEF1F5]">
        {owners.map((o) => {
          const bg = o.isTot ? '#EFDBD5' : '#F7EAE6'
          const exp = expanded[o.key]
          const hasKid = o.kids && o.kids.length
          const ownerBase = o.isTot ? 0 : 1
          return (
            <Fragment key={o.key}>
              <tr>
                <td className="px-2.5 py-1.5 text-left sticky left-0 z-[3]" style={{ background: bg, paddingLeft: 12 + o.level * 16, fontWeight: o.isTot ? 800 : 700, minWidth: 180, borderRight: '2px solid #E5E8EC' }}>
                  {hasKid && <span onClick={() => onToggle(o.key)} className="cursor-pointer select-none text-ink-500 inline-block w-3.5 text-center mr-0.5">{exp ? '▾' : '▸'}</span>}
                  {o.name}
                </td>
                {P.cols.map((c, i) => <Trio key={i} o={agg(o, c.ms)} conf={c.ms.every((m) => o.months[m].conf)} rowBg={bg} />)}
                <Trio o={agg(o, P.tot.ms)} conf={false} tot rowBg={bg} />
              </tr>
              {hasKid && exp && o.kids.map((k) => kidRow(k, ownerBase + 1))}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}

function PipeTable({ items, grp }) {
  const all = grp === '전체'
  const has = grp !== '3그룹'   // 세부 열 (3그룹만 없음, 전체는 표시)
  const total = items.reduce((s, x) => s + (Number(x.증감액) || 0), 0)
  return (
    <table className="text-[13px] w-full border-collapse">
      <thead>
        <tr className="[&_th]:sticky [&_th]:top-0 [&_th]:bg-[#F4F1F2] [&_th]:text-ink-500 [&_th]:font-semibold [&_th]:px-2.5 [&_th]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:text-left [&_th]:whitespace-nowrap z-[2]">
          <th>반영</th>{all && <th>그룹</th>}<th>월</th><th>상품</th>{has && <th>세부</th>}<th>구분</th><th>담당</th><th>고객사</th><th>내용</th><th className="!text-right">증감액</th><th>성격</th><th className="!text-right">확률</th>
        </tr>
      </thead>
      <tbody>
        {items.map((x, i) => {
          const off = !x.반영, up = x.side === '증가', one = /1회|일회/.test(x.성격 || '')
          return (
            <tr key={i} className="[&_td]:px-2.5 [&_td]:py-2 [&_td]:border-b [&_td]:border-[#EEF1F5] [&_td]:align-top" style={off ? { color: FC, background: '#FAFAFB' } : undefined}>
              <td><span className="text-[10px] font-bold rounded-lg px-1.5 py-px" style={{ background: off ? '#F1F2F4' : '#E7EDFB', color: off ? FC : BRAND }}>{off ? '미반영' : '반영'}</span></td>
              {all && <td className="whitespace-nowrap font-semibold" style={{ color: off ? FC : HDR }}>{x.__grp}</td>}
              <td className="tabular-nums">{x.월}월</td><td>{x.상품}</td>{has && <td>{x.세부}</td>}<td>{x.구분}</td><td>{x.담당}</td><td>{x.고객사}</td>
              <td className="whitespace-normal text-ink-700" style={{ maxWidth: 280 }}>{x.내용}</td>
              <td className="text-right tabular-nums font-bold" style={{ color: off ? FC : (up ? BRAND : LOST) }}>{up ? '+' : ''}{comma1(x.증감액)}</td>
              <td><span className="text-[10px] font-bold rounded-lg px-1.5 py-px" style={{ background: one ? '#FCE7CE' : '#E7EFFB', color: one ? '#B4530A' : BRAND }}>{x.성격}</span></td>
              <td className="text-right tabular-nums font-bold" style={{ color: off ? FC : '#334155' }}>{x.확률}%</td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="[&_td]:px-2.5 [&_td]:py-2.5 [&_td]:border-t-2 [&_td]:border-line sticky bottom-0" style={{ background: '#FBF3F1' }}>
          <td colSpan={7 + (all ? 1 : 0) + (has ? 1 : 0)} className="text-left font-bold" style={{ color: HDR }}>합계 (표시 {items.length}건)</td>
          <td className="text-right tabular-nums font-extrabold" style={{ color: total >= 0 ? BRAND : LOST }}>{total >= 0 ? '+' : ''}{comma1(total)}</td>
          <td colSpan={2} />
        </tr>
      </tfoot>
    </table>
  )
}

const PERIOD_OPTS = [{ v: 'q', label: '분기' }, { v: 'h1', label: '상반기' }, { v: 'h2', label: '하반기' }, { v: 'cum', label: '확정누계' }]

export default function Revenue() {
  const { loading, error, model, pipes, updatedAt } = useRevenue()
  const [cat, setCat] = useState('all')            // all | period | pipe | group
  const [pmode, setPmode] = useState('q')          // 기간별 세부: q | h1 | h2 | cum
  const [expanded, setExpanded] = useState({})
  const [grp, setGrp] = useState('1그룹')      // 그룹별 탭
  const [pgrp, setPgrp] = useState('전체')      // 예상 파이프라인 탭 (전체 포함)
  const [flt, setFlt] = useState('all')
  const [dir, setDir] = useState('all')
  const [mon, setMon] = useState('all')

  const lastConf = model?.lastConf ?? 6
  const effMode = cat === 'period' ? pmode : 'all'
  const isCum = cat === 'period' && pmode === 'cum'
  const P = useMemo(() => periodsFor(effMode, lastConf), [effMode, lastConf])
  const toggle = (label) => setExpanded((e) => ({ ...e, [label]: !e[label] }))
  const GROUPS = ['글로벌', '기업', '엔터프라이즈 3그룹']
  const expandAll = () => { const all = GROUPS.every((g) => expanded[g]); setExpanded(Object.fromEntries(GROUPS.map((g) => [g, !all]))) }

  const persons = model?.persons || null
  const owners = persons ? (persons[grp] || []) : []
  const ownerKeys = owners.map((o) => o.key)
  const allPExp = ownerKeys.length > 0 && ownerKeys.every((k) => expanded[k])
  const expandAllP = () => setExpanded((e) => { const n = { ...e }; ownerKeys.forEach((k) => { n[k] = !allPExp }); return n })

  const pitems = useMemo(() => {
    if (!pipes) return []
    const gs = pgrp === '전체' ? ['1그룹', '2그룹', '3그룹'] : [pgrp]
    return gs.flatMap((g) => (pipes[g] || []).map((x) => ({ ...x, __grp: g })))
  }, [pipes, pgrp])
  const pmonths = useMemo(() => [...new Set(pitems.map((x) => x.월))].sort((a, b) => a - b), [pitems])
  const pview = useMemo(() => pitems
    .filter((x) => (flt === 'all' || (flt === 'on' ? x.반영 : !x.반영)) && (dir === 'all' || x.side === dir) && (mon === 'all' || x.월 === +mon))
    .sort((a, b) => a.월 - b.월 || (a.side < b.side ? -1 : 1)), [pitems, flt, dir, mon])

  if (loading) return <div className="py-20 text-center text-sm text-ink-400">불러오는 중…</div>
  if (error)   return <div className="py-20 text-center text-sm text-lost">오류: {error}</div>
  if (!model)  return <div className="py-16 text-center text-sm text-ink-400">아직 업로드된 매출현황 데이터가 없습니다. 관리자 &gt; 매출현황 업로드에서 엑셀을 올려주세요.</div>

  const tot = agg(model.rows[0], P.tot.ms)
  const ov = rate(tot.plan, tot.val), diff = tot.val - tot.plan
  const ctot = aggCum(model.rows[0], lastConf), cov = rate(ctot.plan, ctot.val)
  const seg = (cur, set, opts) => (
    <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {opts.map((o) => (
        <button key={o.v} onClick={() => set(o.v)} className="px-3 py-1.5 text-sm rounded-md" style={cur === o.v ? { background: BRAND, color: '#fff', fontWeight: 600 } : { color: '#64748B' }}>{o.label}</button>
      ))}
    </div>
  )
  const tabBtn = (c, label, extra) => (
    <button onClick={() => setCat(c)} className="px-4 py-2.5 text-sm font-semibold -mb-0.5 border-b-2 inline-flex items-center gap-1"
      style={cat === c ? { color: BRAND, borderColor: BRAND } : { color: '#475569', borderColor: 'transparent' }}>{label}{extra}</button>
  )

  return (
    <div>
      <header className="mb-1"><h1 className="text-xl font-bold text-ink-900">매출현황</h1>
        <p className="text-sm text-ink-500">2026년 예상 매출액 (Worst) · 수주확률 ≥50% · 해지확률 ≥50% · 단위 백만원</p></header>

      {/* 탭 */}
      <div className="flex gap-1 border-b-2 border-line mt-4 items-end">
        {tabBtn('all', '전체')}
        {tabBtn('period', '기간별')}
        {cat === 'period' && (
          <select value={pmode} onChange={(e) => setPmode(e.target.value)} className="mb-1 -ml-1 text-sm font-semibold rounded-lg px-2.5 py-1.5 border" style={{ borderColor: '#D9C7CC', background: '#FBF3F1', color: HDR }}>
            {PERIOD_OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
        )}
        {tabBtn('pipe', '예상 파이프라인')}
        {cat === 'pipe' && (
          <select value={pgrp} onChange={(e) => { setPgrp(e.target.value); setMon('all') }} className="mb-1 -ml-1 text-sm font-semibold rounded-lg px-2.5 py-1.5 border" style={{ borderColor: '#D9C7CC', background: '#FBF3F1', color: HDR }}>
            <option>전체</option><option>1그룹</option><option>2그룹</option><option>3그룹</option>
          </select>
        )}
        {tabBtn('group', '그룹별')}
        {cat === 'group' && (
          <select value={grp} onChange={(e) => setGrp(e.target.value)} className="mb-1 -ml-1 text-sm font-semibold rounded-lg px-2.5 py-1.5 border" style={{ borderColor: '#D9C7CC', background: '#FBF3F1', color: HDR }}>
            <option>1그룹</option><option>2그룹</option><option>3그룹</option>
          </select>
        )}
      </div>

      {/* 컨트롤 */}
      {cat === 'pipe' ? (
        <div className="flex gap-2.5 items-center my-3 flex-wrap">
          {seg(flt, setFlt, [{ v: 'all', label: '전체' }, { v: 'on', label: '반영만' }, { v: 'off', label: '미반영만' }])}
          <div className="flex items-center gap-1.5"><label className="text-xs text-ink-500">월</label>
            <select value={mon} onChange={(e) => setMon(e.target.value)} className="text-sm rounded-lg px-2.5 py-1.5 border border-line bg-white">
              <option value="all">전체</option>{pmonths.map((m) => <option key={m} value={m}>{m}월</option>)}</select></div>
          {seg(dir, setDir, [{ v: 'all', label: '전체' }, { v: '증가', label: '증가' }, { v: '감소', label: '감소' }])}
        </div>
      ) : cat === 'group' ? (
        <div className="flex gap-4 items-center my-3 flex-wrap text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm border border-line inline-block bg-white" /> 확정 — 검정</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm border border-line inline-block" style={{ background: FCBG }} /> 예상 — 회색</span>
          <span className="flex-1" />
          <button onClick={expandAllP} className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink-700">{allPExp ? '상품군 모두 접기 ▴' : '상품군 모두 펼치기 ▾'}</button>
        </div>
      ) : (
        <div className="flex gap-4 items-center my-3 flex-wrap text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm border border-line inline-block bg-white" /> 확정(1~{lastConf}월) — 검정</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm border border-line inline-block" style={{ background: FCBG }} /> 예상({lastConf+1}~12월) — 회색 · 파이프라인</span>
          {isCum && <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm inline-block" style={{ background: CUM_HEADBG, border: `1px solid ${CUM_BORDER}` }} /> 확정누계</span>}
          <span className="inline-flex items-center gap-1.5"><b style={{ color: BRAND }}>■</b> 달성 ≥100%</span>
          <span className="inline-flex items-center gap-1.5"><b style={{ color: LOST }}>■</b> 미달</span>
          <span className="flex-1" />
          <button onClick={expandAll} className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink-700">{GROUPS.every((g) => expanded[g]) ? '상품군 모두 접기 ▴' : '상품군 모두 펼치기 ▾'}</button>
        </div>
      )}

      {/* 요약 (매출현황 계열 탭만) */}
      {(cat === 'all' || cat === 'period') && !isCum && (
        <div className="flex items-center gap-5 bg-paper border border-line rounded-xl shadow-card px-4 py-3.5 mb-3.5 flex-wrap">
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">기간</span><span className="text-xl font-extrabold mt-0.5">{P.tot.label}</span></div>
          <span className="w-px self-stretch bg-line" />
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">계획</span><span className="text-xl font-extrabold tabular-nums mt-0.5">{comma(tot.plan)}</span></div>
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">실적+예상</span><span className="text-xl font-extrabold tabular-nums mt-0.5">{comma(tot.val)}</span></div>
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">차이</span><span className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: diff >= 0 ? BRAND : LOST }}>{diff >= 0 ? '+' : '−'}{comma(Math.abs(diff))}</span></div>
          <span className="w-px self-stretch bg-line" />
          <div className="flex-1 min-w-[150px]"><span className="text-[11px] text-ink-500">주요매출 달성률 <b style={{ color: ov.c }}>{ov.r.toFixed(1)}%</b></span>
            <div className="h-2.5 rounded-md bg-canvas overflow-hidden mt-1.5"><i className="block h-full rounded-md" style={{ width: `${Math.min(ov.r, 120) / 120 * 100}%`, background: ov.c }} /></div></div>
        </div>
      )}
      {isCum && (
        <div className="flex items-center gap-5 bg-paper border border-line rounded-xl shadow-card px-4 py-3.5 mb-3.5 flex-wrap">
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">확정 기준</span><span className="text-xl font-extrabold mt-0.5">1~{lastConf}월</span></div>
          <span className="w-px self-stretch bg-line" />
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">계획 누계</span><span className="text-xl font-extrabold tabular-nums mt-0.5">{comma(ctot.plan)}</span></div>
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">실적 누계</span><span className="text-xl font-extrabold tabular-nums mt-0.5">{comma(ctot.val)}</span></div>
          <span className="w-px self-stretch bg-line" />
          <div className="flex-1 min-w-[150px]"><span className="text-[11px] text-ink-500">확정누계 달성률 <b style={{ color: cov.c }}>{cov.r.toFixed(1)}%</b></span>
            <div className="h-2.5 rounded-md bg-canvas overflow-hidden mt-1.5"><i className="block h-full rounded-md" style={{ width: `${Math.min(cov.r, 120) / 120 * 100}%`, background: cov.c }} /></div></div>
        </div>
      )}

      {/* 본문 */}
      {cat === 'pipe' ? (
        <>
          <div className="text-xs text-ink-500 rounded-xl px-3.5 py-2.5 mb-3.5" style={{ background: '#FBF3F1', border: '1px solid #EFE1DE' }}>
            📌 <b>예상매출 검증용 백데이터</b> — 매출현황 {lastConf+1}~12월 예상치는 아래 <b>반영(확률 ≥50%)</b> 항목 증감액을 {lastConf}월 확정에 더해 산출. 확률 &lt;50%는 <b>미반영</b>(회색).</div>
          <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
              <span className="text-[15px] font-bold text-white">{pgrp} 파이프라인</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>표시 {pview.length}건{updatedAt && ` · 업데이트 ${fmtDate(updatedAt)}`}</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 620 }}><PipeTable items={pview} grp={pgrp} /></div>
          </div>
        </>
      ) : cat === 'group' ? (
        <>
          <div className="text-xs text-ink-700 rounded-xl px-3.5 py-2.5 mb-3.5 leading-relaxed" style={{ background: '#FBF3F1', border: '1px solid #EFE1DE' }}>
            💡 개인 합계 = 그룹 전체 정확히 일치, 실적 누계도 매출현황과 일치. <b>계획</b>은 담당자 월배분 기준이라 월별 시점값은 다를 수 있으나 <b>2026년(연간) 합계는 일치</b>합니다.</div>
          {!persons ? (
            <div className="py-16 text-center text-sm text-ink-400">개인별 데이터가 없습니다. 관리자 &gt; 매출현황 업로드에서 개인별 시트(엔터1/2/3개인별)가 포함된 엑셀을 올려주세요.</div>
          ) : (
            <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden mb-4">
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
                <span className="text-[15px] font-bold text-white">{{ '1그룹': '엔터프라이즈 1그룹', '2그룹': '엔터프라이즈 2그룹', '3그룹': '엔터프라이즈 3그룹' }[grp]} · 담당자별</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>▸ 그룹전체·담당자 클릭 시 상품군 펼침</span>
              </div>
              <div className="overflow-x-auto"><PersonTable owners={owners} P={P} expanded={expanded} onToggle={toggle} /></div>
              <div className="text-[11px] text-ink-400 px-4 py-2 text-right">단위: 백만원 · 확정 1~{lastConf}월 · 예상 {lastConf+1}~12월</div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden mb-4">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
              <span className="text-[15px] font-bold text-white">매출현황 · {isCum ? `확정누계 (1~${lastConf}월) vs 연간` : effMode === 'all' ? '전체(월별)' : effMode === 'q' ? '분기별' : effMode === 'h1' ? '상반기(월별)' : '하반기(월별)'}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>{isCum ? '확정 실적 누계와 연간(예상포함)을 나란히 · ▸ 상품군 펼침' : '각 기간: 계획 / 실적·예상 / 달성률 · ▸ 그룹 클릭 시 상품군 펼침'}</span>
            </div>
            <div className="overflow-x-auto"><RevTable rows={model.rows} P={P} expanded={expanded} onToggle={toggle} /></div>
            <div className="text-[11px] text-ink-400 px-4 py-2 text-right">단위: 백만원 · {isCum ? `확정누계 = 1~${lastConf}월 실적 합` : `예상매출 = ${lastConf}월 확정 기준 + 파이프라인(수주·해지확률 ≥50%) 반영`}</div>
          </div>
          <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden mb-4">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
              <span className="text-[15px] font-bold text-white">공헌이익2 (EBITDA)</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>별도 업로드 · 매출 합계 미포함</span>
            </div>
            <div className="overflow-x-auto"><RevTable rows={model.ebit} P={P} expanded={expanded} onToggle={toggle} tint={TINT_EBIT} /></div>
            <div className="text-[11px] text-ink-400 px-4 py-2 text-right">단위: 백만원</div>
          </div>
        </>
      )}
    </div>
  )
}

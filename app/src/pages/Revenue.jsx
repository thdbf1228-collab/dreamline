import { useMemo, useState, Fragment } from 'react'
import { useRevenue } from '../data/useRevenue'

// ── 색/스타일 상수 (로즈 테마) ──
const HDR = '#6E4A54'
const TINT = { '주요매출': '#EFDBD5', '합계': '#EFDBD5', '엔터프라이즈 1,2그룹': '#F7EAE6', '엔터프라이즈 3그룹': '#F7EAE6', '글로벌': '#FCF5F2', '기업': '#FCF5F2' }
const FC = '#98A2B3', FCBG = '#F3F5F8', BRAND = '#1D4ED8', LOST = '#E02424'
const comma = (v) => Math.round(Number(v) || 0).toLocaleString('ko-KR')
const comma1 = (v) => { const n = Math.round((Number(v) || 0) * 10) / 10; return n.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) }
const rate = (p, a) => { const r = p ? (a / p) * 100 : 0; return { r, c: r >= 100 ? BRAND : (p ? LOST : FC) } }

const CATS = [
  { c: 'all', label: '전체' }, { c: 'q', label: '분기' }, { c: 'h1', label: '상반기' }, { c: 'pipe', label: '예상 파이프라인' },
]
function periodsFor(cat) {
  if (cat === 'q') return { cols: [{ ms: [1,2,3], label: '1분기', conf: true }, { ms: [4,5,6], label: '2분기', conf: true }, { ms: [7,8,9], label: '3분기', conf: false }, { ms: [10,11,12], label: '4분기', conf: false }], tot: { ms: [1,2,3,4,5,6,7,8,9,10,11,12], label: '연간 누계', conf: false } }
  if (cat === 'h1') return { cols: Array.from({ length: 6 }, (_, i) => ({ ms: [i+1], label: `${i+1}월`, conf: true })), tot: { ms: [1,2,3,4,5,6], label: '상반기 누계', conf: true } }
  return { cols: Array.from({ length: 12 }, (_, i) => ({ ms: [i+1], label: `${i+1}월`, conf: i < 6 })), tot: { ms: [1,2,3,4,5,6,7,8,9,10,11,12], label: '연간 누계', conf: false } }
}
const agg = (row, ms) => ms.reduce((o, m) => ({ plan: o.plan + row.months[m].plan, val: o.val + row.months[m].val }), { plan: 0, val: 0 })

function Trio({ o, conf, tot, rowBg }) {
  const ri = rate(o.plan, o.val)
  const bg = rowBg || (conf ? undefined : FCBG)
  const bs = bg ? { background: bg } : undefined
  const vcol = conf ? '#0F172A' : FC
  const lb = tot ? { borderLeft: '2px solid #E5E8EC' } : { borderLeft: '1px solid #EEF1F5' }
  return (
    <>
      <td className="px-2.5 py-1.5 text-right tabular-nums text-ink-400" style={{ ...lb, ...bs }}>{comma(o.plan)}</td>
      <td className="px-2.5 py-1.5 text-right tabular-nums font-bold" style={{ ...bs, color: vcol }}>{comma(o.val)}</td>
      <td className="px-2.5 py-1.5 text-right tabular-nums font-bold" style={{ ...bs, color: ri.c }}>{o.plan ? `${ri.r.toFixed(0)}%` : '–'}</td>
    </>
  )
}

function RevTable({ rows, P, expanded, onToggle }) {
  const GROUPS = ['글로벌', '기업', '엔터프라이즈 3그룹']
  const renderRow = (row) => {
    const bg = TINT[row.label]
    const pad = 12 + (row.level || 0) * 16
    const hasKid = row.kids && row.kids.length
    const exp = expanded[row.label]
    const fw = (row.level || 0) < 2 ? 700 : (row.level || 0) < 3 ? 600 : 400
    return (
      <Fragment key={row.label}>
        <tr>
          <td className="px-2.5 py-1.5 text-left sticky left-0 z-[3]" style={{ background: bg || '#fff', paddingLeft: pad, fontWeight: fw, minWidth: 180, borderRight: '2px solid #E5E8EC' }}>
            {hasKid && <span onClick={() => onToggle(row.label)} className="cursor-pointer select-none text-ink-500 inline-block w-3.5 text-center mr-0.5">{exp ? '▾' : '▸'}</span>}
            {row.label}
          </td>
          {P.cols.map((c, i) => <Trio key={i} o={agg(row, c.ms)} conf={c.conf} rowBg={bg} />)}
          <Trio o={agg(row, P.tot.ms)} conf={false} tot rowBg={bg} />
        </tr>
        {hasKid && exp && row.kids.map((k) => renderRow(k))}
      </Fragment>
    )
  }
  return (
    <table className="text-xs whitespace-nowrap w-full border-collapse">
      <thead>
        <tr>
          <th rowSpan={2} className="px-2.5 py-2 text-left sticky left-0 z-[4] bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line" style={{ minWidth: 180, borderRight: '2px solid #E5E8EC' }}>구분</th>
          {P.cols.map((c, i) => (
            <th key={i} colSpan={3} className="px-2.5 py-2 text-center bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line" style={{ borderLeft: '1px solid #E5E8EC' }}>
              {c.label}<span className="ml-1 text-[9px] font-bold rounded-lg px-1.5 py-px" style={{ background: c.conf ? '#EDEDEF' : '#EEF0F3', color: c.conf ? '#1F2430' : FC }}>{c.conf ? '확정' : '예상'}</span>
            </th>
          ))}
          <th colSpan={3} className="px-2.5 py-2 text-center bg-[#FbFcFd] font-semibold border-b border-line" style={{ borderLeft: '2px solid #E5E8EC', color: BRAND }}>{P.tot.label}</th>
        </tr>
        <tr>
          {P.cols.map((c, i) => (
            <Fragment key={i}>
              <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line" style={{ borderLeft: '1px solid #E5E8EC' }}>계획</th>
              <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line">{c.conf ? '실적' : '예상'}</th>
              <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line">달성</th>
            </Fragment>
          ))}
          <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line" style={{ borderLeft: '2px solid #E5E8EC' }}>계획</th>
          <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line">실적</th>
          <th className="px-2.5 py-2 text-right bg-[#FbFcFd] text-ink-500 font-semibold border-b border-line">달성</th>
        </tr>
      </thead>
      <tbody className="[&_td]:border-b [&_td]:border-[#EEF1F5]">{rows.map((r) => renderRow(r))}</tbody>
    </table>
  )
}

function PipeTable({ items, grp }) {
  const has = grp !== '3그룹'
  return (
    <table className="text-xs w-full border-collapse">
      <thead>
        <tr className="[&_th]:sticky [&_th]:top-0 [&_th]:bg-[#F4F1F2] [&_th]:text-ink-500 [&_th]:font-semibold [&_th]:px-2.5 [&_th]:py-2 [&_th]:border-b [&_th]:border-line [&_th]:text-left [&_th]:whitespace-nowrap z-[2]">
          <th>반영</th><th>월</th><th>상품</th>{has && <th>세부</th>}<th>구분</th><th>담당</th><th>고객사</th><th>내용</th><th className="!text-right">증감액</th><th>성격</th><th className="!text-right">확률</th>
        </tr>
      </thead>
      <tbody>
        {items.map((x, i) => {
          const off = !x.반영, up = x.side === '증가'
          return (
            <tr key={i} className="[&_td]:px-2.5 [&_td]:py-2 [&_td]:border-b [&_td]:border-[#EEF1F5] [&_td]:align-top" style={off ? { color: FC, background: '#FAFAFB' } : undefined}>
              <td><span className="text-[10px] font-bold rounded-lg px-1.5 py-px" style={{ background: off ? '#F1F2F4' : '#E7EDFB', color: off ? FC : BRAND }}>{off ? '미반영' : '반영'}</span></td>
              <td className="tabular-nums">{x.월}월</td><td>{x.상품}</td>{has && <td>{x.세부}</td>}<td>{x.구분}</td><td>{x.담당}</td><td>{x.고객사}</td>
              <td className="whitespace-normal text-ink-700" style={{ maxWidth: 280 }}>{x.내용}</td>
              <td className="text-right tabular-nums font-bold" style={{ color: off ? FC : (up ? BRAND : LOST) }}>{up ? '+' : ''}{comma1(x.증감액)}</td>
              <td><span className="text-[10px] font-bold rounded-lg px-1.5 py-px" style={{ background: up ? '#E7EFFB' : '#FDEAEA', color: up ? BRAND : LOST }}>{x.성격}</span></td>
              <td className="text-right tabular-nums font-bold" style={{ color: off ? FC : '#334155' }}>{x.확률}%</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default function Revenue() {
  const { loading, error, model, pipes } = useRevenue()
  const [cat, setCat] = useState('all')
  const [expanded, setExpanded] = useState({})
  const [grp, setGrp] = useState('1그룹')
  const [flt, setFlt] = useState('all')
  const [dir, setDir] = useState('all')
  const [mon, setMon] = useState('all')

  const P = useMemo(() => periodsFor(cat), [cat])
  const toggle = (label) => setExpanded((e) => ({ ...e, [label]: !e[label] }))
  const GROUPS = ['글로벌', '기업', '엔터프라이즈 3그룹']
  const expandAll = () => { const all = GROUPS.every((g) => expanded[g]); setExpanded(Object.fromEntries(GROUPS.map((g) => [g, !all]))) }

  const pmonths = useMemo(() => pipes && pipes[grp] ? [...new Set(pipes[grp].map((x) => x.월))].sort((a, b) => a - b) : [], [pipes, grp])
  const pview = useMemo(() => !pipes || !pipes[grp] ? [] : pipes[grp]
    .filter((x) => (flt === 'all' || (flt === 'on' ? x.반영 : !x.반영)) && (dir === 'all' || x.side === dir) && (mon === 'all' || x.월 === +mon))
    .sort((a, b) => a.월 - b.월 || (a.side < b.side ? -1 : 1)), [pipes, grp, flt, dir, mon])

  if (loading) return <div className="py-20 text-center text-sm text-ink-400">불러오는 중…</div>
  if (error)   return <div className="py-20 text-center text-sm text-lost">오류: {error}</div>
  if (!model)  return <div className="py-16 text-center text-sm text-ink-400">아직 업로드된 매출현황 데이터가 없습니다. 관리자 &gt; 매출현황 업로드에서 엑셀을 올려주세요.</div>

  const isPipe = cat === 'pipe'
  const tot = agg(model.rows[0], P.tot.ms)
  const ov = rate(tot.plan, tot.val), diff = tot.val - tot.plan
  const seg = (val, cur, set, opts, mini) => (
    <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {opts.map((o) => (
        <button key={o.v} onClick={() => set(o.v)} className="px-3 py-1.5 text-sm rounded-md" style={cur === o.v ? { background: mini ? '#334155' : BRAND, color: '#fff', fontWeight: 600 } : { color: '#64748B' }}>{o.label}</button>
      ))}
    </div>
  )

  return (
    <div>
      <header className="mb-1"><h1 className="text-xl font-bold text-ink-900">매출현황</h1>
        <p className="text-sm text-ink-500">2026년 예상 매출액 (Worst) · 수주확률 ≥50% · 해지확률 ≥50% · 단위 백만원</p></header>

      {/* 탭 */}
      <div className="flex gap-1 border-b-2 border-line mt-4">
        {CATS.map((t) => (
          <button key={t.c} onClick={() => setCat(t.c)} className="px-4 py-2.5 text-sm font-semibold -mb-0.5 border-b-2"
            style={cat === t.c ? { color: BRAND, borderColor: BRAND } : { color: '#94A3B8', borderColor: 'transparent' }}>{t.label}</button>
        ))}
      </div>

      {/* 컨트롤 */}
      {!isPipe ? (
        <div className="flex gap-4 items-center my-3 flex-wrap text-xs text-ink-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm border border-line inline-block bg-white" /> 확정(1~6월) — 검정</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm border border-line inline-block" style={{ background: FCBG }} /> 예상(7~12월) — 회색 · 파이프라인</span>
          <span className="inline-flex items-center gap-1.5"><b style={{ color: BRAND }}>■</b> 달성 ≥100%</span>
          <span className="inline-flex items-center gap-1.5"><b style={{ color: LOST }}>■</b> 미달</span>
          <span className="flex-1" />
          <button onClick={expandAll} className="rounded-lg border border-line bg-white px-3 py-1.5 text-ink-700">{GROUPS.every((g) => expanded[g]) ? '상품군 모두 접기 ▴' : '상품군 모두 펼치기 ▾'}</button>
        </div>
      ) : (
        <div className="flex gap-2.5 items-center my-3 flex-wrap">
          <select value={grp} onChange={(e) => { setGrp(e.target.value); setMon('all') }} className="text-sm font-bold rounded-lg px-3 py-2 border" style={{ borderColor: '#D9C7CC', background: '#FBF3F1' }}>
            <option>1그룹</option><option>2그룹</option><option>3그룹</option></select>
          {seg('flt', flt, setFlt, [{ v: 'all', label: '전체' }, { v: 'on', label: '반영만' }, { v: 'off', label: '미반영만' }])}
          <div className="flex items-center gap-1.5"><label className="text-xs text-ink-500">월</label>
            <select value={mon} onChange={(e) => setMon(e.target.value)} className="text-sm rounded-lg px-2.5 py-1.5 border border-line bg-white">
              <option value="all">전체</option>{pmonths.map((m) => <option key={m} value={m}>{m}월</option>)}</select></div>
          {seg('dir', dir, setDir, [{ v: 'all', label: '전체' }, { v: '증가', label: '증가' }, { v: '감소', label: '감소' }])}
        </div>
      )}

      {/* 요약 (매출현황 탭만) */}
      {!isPipe && (
        <div className="flex items-center gap-5 bg-paper border border-line rounded-xl shadow-card px-4 py-3.5 mb-3.5 flex-wrap">
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">기간</span><span className="text-base font-extrabold mt-0.5">{P.tot.label}</span></div>
          <span className="w-px self-stretch bg-line" />
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">계획</span><span className="text-xl font-extrabold tabular-nums mt-0.5">{comma(tot.plan)}</span></div>
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">실적+예상</span><span className="text-xl font-extrabold tabular-nums mt-0.5">{comma(tot.val)}</span></div>
          <div className="flex flex-col"><span className="text-[11px] text-ink-500">차이</span><span className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: diff >= 0 ? BRAND : LOST }}>{diff >= 0 ? '+' : '−'}{comma(Math.abs(diff))}</span></div>
          <span className="w-px self-stretch bg-line" />
          <div className="flex-1 min-w-[150px]"><span className="text-[11px] text-ink-500">주요매출 달성률 <b style={{ color: ov.c }}>{ov.r.toFixed(1)}%</b></span>
            <div className="h-2.5 rounded-md bg-canvas overflow-hidden mt-1.5"><i className="block h-full rounded-md" style={{ width: `${Math.min(ov.r, 120) / 120 * 100}%`, background: ov.c }} /></div></div>
        </div>
      )}

      {/* 본문 */}
      {!isPipe ? (
        <>
          <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden mb-4">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
              <span className="text-[15px] font-bold text-white">매출현황 · {cat === 'all' ? '전체(월별)' : cat === 'q' ? '분기별' : '상반기(월별)'}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>각 기간: 계획 / 실적·예상 / 달성률 · ▸ 그룹 클릭 시 상품군 펼침</span>
            </div>
            <div className="overflow-x-auto"><RevTable rows={model.rows} P={P} expanded={expanded} onToggle={toggle} /></div>
            <div className="text-[11px] text-ink-400 px-4 py-2 text-right">단위: 백만원 · 예상매출 = 6월 확정 기준 + 파이프라인(수주·해지확률 ≥50%) 반영</div>
          </div>
          <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden mb-4">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
              <span className="text-[15px] font-bold text-white">공헌이익2 (EBITDA)</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>별도 업로드 · 매출 합계 미포함</span>
            </div>
            <div className="overflow-x-auto"><RevTable rows={model.ebit} P={P} expanded={expanded} onToggle={toggle} /></div>
            <div className="text-[11px] text-ink-400 px-4 py-2 text-right">단위: 백만원</div>
          </div>
        </>
      ) : (
        <>
          <div className="text-xs text-ink-500 rounded-xl px-3.5 py-2.5 mb-3.5" style={{ background: '#FBF3F1', border: '1px solid #EFE1DE' }}>
            📌 <b>예상매출 검증용 백데이터</b> — 매출현황 7~12월 예상치는 아래 <b>반영(확률 ≥50%)</b> 항목 증감액을 6월 확정에 더해 산출. 확률 &lt;50%는 <b>미반영</b>(회색).</div>
          <div className="bg-paper border border-line rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: HDR }}>
              <span className="text-[15px] font-bold text-white">{grp} 파이프라인</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,.66)' }}>표시 {pview.length}건</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 620 }}><PipeTable items={pview} grp={grp} /></div>
          </div>
        </>
      )}
    </div>
  )
}

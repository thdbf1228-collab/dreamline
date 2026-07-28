// v_opportunities 행들로부터 대시보드 집계 파생
// 모든 금액은 display_amount(천원) 기준.

const OPEN = '진행중'
const WON = '종료(성공)'
const LOST = '종료(실패)'

export const STAGES = [
  { id: 1, label: '기회인지' },
  { id: 2, label: '제안' },
  { id: 3, label: '견적' },
  { id: 4, label: '계약' },
  { id: 5, label: '개통완료' },
]

const amt = (r) => Number(r.display_amount) || 0

export function kpis(rows) {
  const open = rows.filter((r) => r.status === OPEN)
  const won = rows.filter((r) => r.status === WON)
  const lost = rows.filter((r) => r.status === LOST)
  const decided = won.length + lost.length
  return {
    total: rows.length,
    pipelineAmount: open.reduce((s, r) => s + amt(r), 0),
    pipelineCount: open.length,
    confirmedAmount: won.reduce((s, r) => s + amt(r), 0),
    wonCount: won.length,
    lostCount: lost.length,
    winRate: decided ? (won.length / decided) * 100 : 0,
    staleCount: rows.filter((r) => r.is_stale).length,
  }
}

export function funnel(rows) {
  return STAGES.map((s) => {
    const inStage = rows.filter((r) => r.stage_id === s.id)
    return {
      ...s,
      count: inStage.length,
      amount: inStage.reduce((acc, r) => acc + amt(r), 0),
    }
  })
}

export function byGroup(rows) {
  const m = new Map()
  for (const r of rows) {
    const g = r.group_name || '미배정'
    if (!m.has(g)) m.set(g, [])
    m.get(g).push(r)
  }
  return [...m.entries()]
    .map(([name, rs]) => ({ name, rows: rs, ...kpis(rs) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export function byAccount(rows) {
  const m = new Map()
  for (const r of rows) {
    const key = r.account_name || '미상'
    if (!m.has(key)) m.set(key, [])
    m.get(key).push(r)
  }
  return [...m.entries()]
    .map(([name, rs]) => ({
      name,
      group: rs[0].group_name,
      rep: rs[0].rep_name,
      count: rs.length,
      ...kpis(rs),
    }))
    .sort((a, b) => b.pipelineAmount + b.confirmedAmount - (a.pipelineAmount + a.confirmedAmount))
}

// 담당자별 6개 KPI (절대값)
export function repMetrics(rows, repName) {
  const rs = rows.filter((r) => r.rep_name === repName)
  const k = kpis(rs)
  const accounts = new Set(rs.map((r) => r.account_name)).size
  const avgDeal = rs.length ? rs.reduce((s, r) => s + amt(r), 0) / rs.length : 0
  return {
    기회수: k.total,
    파이프라인: k.pipelineAmount,
    확정매출: k.confirmedAmount,
    전환율: k.winRate,
    평균딜: avgDeal,
    거래처수: accounts,
    _k: k,
    _rows: rs,
  }
}

const AXES = ['기회수', '파이프라인', '확정매출', '전환율', '평균딜', '거래처수']

// 담당자 전체 대비 정규화 (min-max, 바닥 12로 두어 꼴찌도 안 비게)
export function hexData(rows, repNames, repName) {
  const all = repNames.map((n) => repMetrics(rows, n))
  const me = all.find((_, i) => repNames[i] === repName)
  const floor = 12
  return AXES.map((ax) => {
    const vals = all.map((m) => m[ax])
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const v = me[ax]
    const norm = max === min ? 100 : floor + ((v - min) / (max - min)) * (100 - floor)
    return { axis: ax, value: v, norm }
  })
}

// 매출구분(기업/글로벌) 필터
export function bySalesType(rows, t) {
  return !t || t === 'all' ? rows : rows.filter((r) => r.sales_type === t)
}

// 파이프라인 뷰용 다중 필터
export function filterDeals(rows, f) {
  return rows.filter((r) => {
    if (f.salesType && f.salesType !== 'all' && r.sales_type !== f.salesType) return false
    if (f.group && f.group !== 'all' && (r.group_name || '미배정') !== f.group) return false
    if (f.rep && f.rep !== 'all' && r.rep_name !== f.rep) return false
    if (f.stage && f.stage !== 'all' && String(r.stage_id) !== String(f.stage)) return false
    if (f.status && f.status !== 'all' && r.status !== f.status) return false
    if (f.q) {
      const q = f.q.trim()
      if (q && !((r.account_name || '').includes(q) || (r.title || '').includes(q) || (r.rep_name || '').includes(q)))
        return false
    }
    return true
  })
}

export const STATUSES = ['진행중', '종료(성공)', '종료(실패)', '보류/연기']

// 기한초과: 진행중인데 종료일이 지남
export function isOverdue(r) {
  if (r.status !== '진행중' || !r.end_date) return false
  return new Date(r.end_date) < new Date(new Date().toISOString().slice(0, 10))
}

// 월별 집계 (시작일 기준 YYYY-MM)
export function byMonth(rows) {
  const m = new Map()
  for (const r of rows) {
    const key = (r.start_date || '').slice(0, 7) || '미상'
    if (!m.has(key)) m.set(key, [])
    m.get(key).push(r)
  }
  return [...m.entries()]
    .filter(([k]) => k !== '미상')
    .map(([month, rs]) => ({ month, rows: rs, ...kpis(rs), amount: rs.reduce((a, r) => a + (Number(r.display_amount) || 0), 0) }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

export const STAGE_SHORT = ['', '인지', '제안', '견적', '계약', '개통']
export const STAGE_FILL = ['', '#8B7FD0', '#3BA9C4', '#E89B4B', '#2F5597', '#1E3A6B']

// 진행/성공/실패률 (전체 대비)
export function rates(rows) {
  const total = rows.length
  const c = (s) => rows.filter((r) => r.status === s).length
  const won = c('종료(성공)'), lost = c('종료(실패)'), prog = c('진행중'), hold = c('보류/연기')
  const p = (n) => (total ? (n / total) * 100 : 0)
  // 진행 + 성공 + 실패(보류 포함) = 100% (전체 분모)
  return { total, won, lost, prog, hold, progRate: p(prog), winRate: p(won), lostRate: p(lost + hold) }
}
// 날짜 필드 기준 월별 카운트
export function countByMonth(rows, field) {
  const m = new Map()
  for (const r of rows) { const k = (r[field] || '').slice(0, 7); if (!k) continue; m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month))
}
// 주 시작(월요일) 키 + 주별 카운트
export function weekStart(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr); if (isNaN(d)) return null
  const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}
export function countByWeek(rows, field) {
  const m = new Map()
  for (const r of rows) { const k = weekStart(r[field]); if (!k) continue; m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week))
}

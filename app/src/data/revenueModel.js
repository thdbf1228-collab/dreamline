// 매출현황 계산 모델 (순수 함수 — 파싱된 JSON을 받아 화면용 rows/ebit 생성)
// 예상매출 = 6월 확정 기준 + 파이프라인(수주·해지확률 ≥50%) 반영.
//  - 월별(recurring): 해당월부터 누적,  1회성(NI): 해당월 1회만.

export const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]
const round1 = (n) => Math.round((Number(n)||0) * 10) / 10

// 구분 → 그룹
export function gmap(gubun) {
  const g = String(gubun || '').trim()
  if (g === '글로벌') return '글로벌'
  if (g === '기업')   return '기업'
  if (g === '구로' || g === '인천') return '엔터3'
  return null
}
export const isOne = (nature) => {
  const s = String(nature || '')
  return s.includes('1회') || s.includes('일회')
}

// 파이프라인 항목 → 회선 라인 키
export function subkeyFor(group, product, sub, one) {
  if (group === '글로벌' || group === '기업') {
    if (one) return group + '_전용'                 // 1회성 → 전용회선
    const ps = String(sub || ''), p = String(product || '')
    if (ps.includes('IX') || ps.includes('인터넷') || p.includes('인터넷')) return group + '_인터넷'
    return group + '_전용'                            // DCI·전용 등
  }
  // 엔터3
  if (one) return '엔터3_NI'                          // 3그룹 1회성/NI → NI성(별도 라인)
  const p = String(product || '')
  if (p.includes('상면')) return '엔터3_코로상면'
  if (p.includes('전력')) return '엔터3_코로전력'
  if (p.includes('인터넷')) return '엔터3_인터넷'
  return '엔터3_전용'
}

// 화면 표시 라인 정의: label / 확정 실적 합산에 쓸 plan-key들 / 파이프라인 subkey
const LINE_DEF = {
  글로벌: [
    { label: '전용회선',        keys: ['글로벌_전용', '글로벌_NI'], subkey: '글로벌_전용' },
    { label: '인터넷전용회선',   keys: ['글로벌_인터넷'],            subkey: '글로벌_인터넷' },
  ],
  기업: [
    { label: '전용회선',        keys: ['기업_전용', '기업_NI'],     subkey: '기업_전용' },
    { label: '인터넷전용회선',   keys: ['기업_인터넷'],              subkey: '기업_인터넷' },
  ],
  엔터3: [
    { label: '전용회선',        keys: ['엔터3_전용'],               subkey: '엔터3_전용' },
    { label: '인터넷전용회선',   keys: ['엔터3_인터넷'],             subkey: '엔터3_인터넷' },
    { label: '코로케이션(상면)', keys: ['엔터3_코로상면', '엔터3_상면매출'], subkey: '엔터3_코로상면' },
    { label: '코로케이션(전력)', keys: ['엔터3_코로전력'],           subkey: '엔터3_코로전력' },
    { label: 'NI성',            keys: ['엔터3_NI'],                subkey: '엔터3_NI' },
  ],
}
const GROUP_KEY = { 글로벌: '글로벌', 기업: '기업', 엔터3: '엔터3' }

// plan.lines[key] = { plan:[..12], actual:[..12] }  (index 0 = 1월)
const P = (plan, key, m) => (plan.lines[key]?.plan?.[m - 1]) || 0
const A = (plan, key, m) => (plan.lines[key]?.actual?.[m - 1]) || 0
const sumP = (plan, keys, m) => keys.reduce((s, k) => s + P(plan, k, m), 0)
const sumA = (plan, keys, m) => keys.reduce((s, k) => s + A(plan, k, m), 0)

// 반영 파이프라인 항목 평탄화: { group, subkey, month, amount, one }
function flatItems(pipes) {
  const out = []
  for (const sheet of Object.keys(pipes || {})) {
    for (const it of pipes[sheet]) {
      const group = gmap(it.구분)
      if (!group) continue
      if (!it.반영) continue          // 확률 ≥50%만  (예상 구간 필터는 lastConf 기준으로 forecast()에서 처리)
      const one = isOne(it.성격)
      out.push({ group, subkey: subkeyFor(group, it.상품, it.세부, one), month: it.월, amount: Number(it.증감액) || 0, one, 담당: String(it.담당 || '').trim() })
    }
  }
  return out
}

// 예상값 = baseline(마지막 확정월 실적) + Σ(recurring, lastConf<month<=m) + (onetime, month==m>lastConf)
function forecast(items, match, baseline, m, lastConf) {
  let recur = 0, onet = 0
  for (const it of items) {
    if (!match(it)) continue
    if (it.month <= lastConf) continue        // 이미 확정 실적에 반영된 건 제외
    if (!it.one && it.month <= m) recur += it.amount
    else if (it.one && it.month === m) onet += it.amount
  }
  return baseline + recur + onet
}

// 라인/그룹의 월별 {plan, val, conf}  — lastConf 이하는 확정(실적), 초과는 예상(파이프라인)
function lineMonths(plan, items, keys, subkeyOrGroup, byGroup, lastConf) {
  const base = sumA(plan, keys, lastConf)
  const match = byGroup ? (it) => it.group === subkeyOrGroup : (it) => it.subkey === subkeyOrGroup
  const months = {}
  for (const m of MONTHS) {
    if (m <= lastConf) months[m] = { plan: round1(sumP(plan, keys, m)), val: round1(sumA(plan, keys, m)), conf: true }
    else               months[m] = { plan: round1(sumP(plan, keys, m)), val: round1(forecast(items, match, base, m, lastConf)), conf: false }
  }
  return months
}

// 합산 그룹(주요매출/엔터1,2)
function rollupMonths(plan, planKey, fcGroups, fcByMonth, lastConf) {
  const months = {}
  for (const m of MONTHS) {
    const planV = round1(P(plan, planKey, m))
    if (m <= lastConf) months[m] = { plan: planV, val: round1(A(plan, planKey, m)), conf: true }
    else               months[m] = { plan: planV, val: round1(fcGroups.reduce((s, g) => s + fcByMonth[g][m], 0)), conf: false }
  }
  return months
}

export function buildModel(plan, pipes, ebit) {
  const items = flatItems(pipes)

  // 마지막 확정월 = 주요매출 실적이 채워진 가장 큰 월 (7월 실적 채워지면 자동 7로 넘어감)
  let lastConf = 0
  for (const m of MONTHS) if (A(plan, '주요매출', m) > 0) lastConf = m

  // 그룹별 예상(월별) 미리 계산
  const fcByMonth = {}
  for (const g of ['글로벌', '기업', '엔터3']) {
    const base = A(plan, GROUP_KEY[g], lastConf)
    fcByMonth[g] = {}
    for (const m of MONTHS) fcByMonth[g][m] = m <= lastConf ? A(plan, GROUP_KEY[g], m) : forecast(items, (it) => it.group === g, base, m, lastConf)
  }

  const groupRow = (label, level, planKey, group) => ({
    label, level,
    months: lineMonths(plan, items, [planKey], group, true, lastConf),
    kids: LINE_DEF[group].map((ln) => ({ label: ln.label, level: 3, months: lineMonths(plan, items, ln.keys, ln.subkey, false, lastConf) })),
  })

  const rows = [
    { label: '주요매출',           level: 0, months: rollupMonths(plan, '주요매출', ['글로벌','기업','엔터3'], fcByMonth, lastConf) },
    { label: '엔터프라이즈 1,2그룹', level: 1, months: rollupMonths(plan, '엔터12', ['글로벌','기업'], fcByMonth, lastConf) },
    groupRow('글로벌', 2, '글로벌', '글로벌'),
    groupRow('기업',   2, '기업',   '기업'),
    groupRow('엔터프라이즈 3그룹', 1, '엔터3', '엔터3'),
  ]

  // EBITDA: 별도 업로드 파일(ebit) 우선. 없으면 매출 워크북 안의 EBITDA 행으로 대체.
  const ebitSrc = (ebit && ebit.lines && ebit.lines.ebit_all) ? ebit : plan
  const ebitRow = (label, level, key) => ({
    label, level,
    months: Object.fromEntries(MONTHS.map((m) => [m, { plan: round1(P(ebitSrc, key, m)), val: round1(A(ebitSrc, key, m)), conf: m <= lastConf }])),
  })
  const ebitRows = [
    ebitRow('합계', 0, 'ebit_all'),
    ebitRow('엔터프라이즈 1,2그룹', 1, 'ebit_12'),
    ebitRow('엔터프라이즈 3그룹', 1, 'ebit_3'),
  ]

  const persons = plan.persons ? buildPersons(plan.persons, lastConf, items) : null

  return { rows, ebit: ebitRows, lastConf, persons }
}

// ── 개인별(담당자) 실적 ──
// 확정월(≤lastConf)은 개인별 시트 실적. 예상월(>lastConf)은 매출현황과 동일 로직:
//   개인 라인의 lastConf 실적 baseline + 예상파이프라인 증감액(담당·상품라인 매칭) 반영.
//   → 개인 합 = 그룹 전체 = 매출현황(엔터12/엔터3) 예상매출과 일치.
// 엔터1,2그룹은 NI성(1회성)을 전용회선에 합산(줄 삭제), 엔터3는 NI성 유지 (매출현황 전체 로직 동일).
const NI_RE = /NI|1회|일회/
// 개인별 시트 상품라인 라벨 → 파이프라인 subkey 매칭
function leafSubkey(grp, parent, label) {
  const lb = String(label || '')
  if (grp !== '3그룹') return (parent || '글로벌') + (lb.includes('인터넷') ? '_인터넷' : '_전용')
  if (lb.includes('상면')) return '엔터3_코로상면'
  if (lb.includes('전력')) return '엔터3_코로전력'
  if (lb.includes('인터넷')) return '엔터3_인터넷'
  if (NI_RE.test(lb)) return '엔터3_NI'
  return '엔터3_전용'
}
// 라인 월별: 확정=시트 실적, 예상=baseline(lastConf 실적)+담당·subkey 매칭 파이프라인
function leafMonths(rep, subkey, planArr, actArr, items, lastConf) {
  const base = actArr[lastConf - 1] || 0
  const o = {}
  for (const m of MONTHS) {
    if (m <= lastConf) { o[m] = { plan: round1(planArr[m - 1] || 0), val: round1(actArr[m - 1] || 0), conf: true }; continue }
    let rec = 0, one = 0
    for (const it of items) {
      if (it.담당 !== rep || it.subkey !== subkey || it.month <= lastConf) continue
      if (!it.one && it.month <= m) rec += it.amount
      else if (it.one && it.month === m) one += it.amount
    }
    o[m] = { plan: round1(planArr[m - 1] || 0), val: round1(base + rec + one), conf: false }
  }
  return o
}
function sumMonths(list, lastConf) {
  const o = {}
  for (const m of MONTHS) {
    let p = 0, v = 0
    for (const mm of list) { p += mm[m].plan; v += mm[m].val }
    o[m] = { plan: round1(p), val: round1(v), conf: m <= lastConf }
  }
  return o
}
function buildPersonBlock(o, grp, lastConf, items) {
  const mergeNI = grp === '1그룹' || grp === '2그룹'
  const rep = o.name
  const kids = []       // 표시 순서: (글로벌/기업 소계) + 상품라인
  let parent = null
  for (const ln of (o.lines || []).slice(1)) {
    const lbl = String(ln.label || '').trim()
    if (mergeNI && lbl.includes('(주요)')) { parent = lbl.includes('글로벌') ? '글로벌' : '기업'; kids.push({ label: ln.label, baseLevel: ln.level || 1, sub: true }); continue }
    if (mergeNI && NI_RE.test(lbl)) {   // NI → 직전 전용회선 라인에 합산
      for (let j = kids.length - 1; j >= 0; j--) { if (!kids[j].sub && String(kids[j].label).trim() === '전용회선') { for (let i = 0; i < 12; i++) { kids[j]._p[i] += (ln.plan[i] || 0); kids[j]._a[i] += (ln.actual[i] || 0) } break } }
      continue
    }
    kids.push({ label: ln.label, baseLevel: ln.level || (grp === '3그룹' ? 1 : 2), subkey: leafSubkey(grp, parent, lbl), _p: [...(ln.plan || [])], _a: [...(ln.actual || [])] })
  }
  for (const k of kids) if (!k.sub) k.months = leafMonths(rep, k.subkey, k._p, k._a, items, lastConf)
  for (let i = 0; i < kids.length; i++) {
    if (!kids[i].sub) continue
    const leaves = []
    for (let j = i + 1; j < kids.length && !kids[j].sub; j++) leaves.push(kids[j].months)
    kids[i].months = sumMonths(leaves, lastConf)
  }
  const total = sumMonths(kids.filter((k) => !k.sub).map((k) => k.months), lastConf)
  return { name: rep, key: grp + '|' + rep, isTot: false, level: 1, months: total, kids: kids.map((k) => ({ label: k.label, baseLevel: k.baseLevel, months: k.months })) }
}
function ownerRows(owners, grp, lastConf, items) {
  const built = (owners || []).filter((o) => !/전체/.test(o.name || '')).map((o) => buildPersonBlock(o, grp, lastConf, items))
    .filter((p) => MONTHS.some((m) => p.months[m].plan || p.months[m].val))
  if (!built.length) return []
  const totalOwner = {
    name: '그룹 전체', key: grp + '|전체', isTot: true, level: 0,
    months: sumMonths(built.map((p) => p.months), lastConf),
    kids: built[0].kids.map((_, idx) => ({ label: built[0].kids[idx].label, baseLevel: built[0].kids[idx].baseLevel, months: sumMonths(built.map((p) => p.kids[idx].months), lastConf) })),
  }
  return [totalOwner, ...built]
}
export function buildPersons(persons, lastConf, items = []) {
  const out = {}
  for (const grp of ['1그룹', '2그룹', '3그룹']) out[grp] = ownerRows(persons[grp] || [], grp, lastConf, items)
  return out
}

// 매출현황 엑셀(매출현황양식.xlsx) 업로드 파서 + Supabase 저장
// 워크북 1개에 시트 4개: '매출달성계획' + '1그룹' + '2그룹' + '3그룹'
import * as XLSX from 'xlsx'
import { supabase } from './supabase'

const num = (sheet, addr) => {
  const c = sheet[addr]
  return c && typeof c.v === 'number' ? c.v : (c && c.v !== undefined && c.v !== '' ? (Number(String(c.v).replace(/,/g, '')) || 0) : 0)
}
const str = (sheet, addr) => {
  const c = sheet[addr]
  return c && c.v != null ? String(c.v).trim() : ''
}

// ── 매출달성계획 시트 파싱 (고정 행/열 = 매출현황양식.xlsx 레이아웃) ──
const PLAN_ROWS = {
  주요매출: 5, 엔터12: 7,
  글로벌: 9, 글로벌_전용: 10, 글로벌_인터넷: 11, 글로벌_NI: 12,
  기업: 13, 기업_전용: 14, 기업_인터넷: 15, 기업_NI: 16,
  엔터3: 17, 엔터3_전용: 19, 엔터3_인터넷: 20, 엔터3_상면매출: 21,
  엔터3_코로상면: 22, 엔터3_코로전력: 23, 엔터3_NI: 24,
  ebit_all: 6, ebit_12: 8, ebit_3: 18,
}
const PLAN_COL = { plan: ['F','H','J','L','N','P','R','T','V','X','Z','AB'], actual: ['G','I','K','M','O','Q','S','U','W','Y','AA','AC'] }

function parsePlan(sheet) {
  const lines = {}
  for (const [key, row] of Object.entries(PLAN_ROWS)) {
    lines[key] = {
      plan:   PLAN_COL.plan.map((c) => num(sheet, c + row)),
      actual: PLAN_COL.actual.map((c) => num(sheet, c + row)),
    }
  }
  return { lines }
}

const monthNum = (v) => { const m = String(v || '').trim().match(/(\d+)\s*월/); return m ? Number(m[1]) : null }

// ── 파이프라인 시트 파싱 (증가 좌측 / 감소 우측 두 블록) ──
// 1/2그룹: inc A,B,C,D,E,F,G,H,I,J  dec L,M,N,O,P,Q,R,S,T,U   (세부 있음)
// 3그룹  : inc A,B, ,C,D,E,F,G,H,I   dec K,L, ,M,N,O,P,Q,R,S    (세부 없음)
function parsePipeSheet(sheet, hasSub) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
  const maxRow = range.e.r + 1
  const items = []
  const inc = hasSub
    ? { 월:'A',상품:'B',세부:'C',구분:'D',담당:'E',고객사:'F',내용:'G',증감:'H',성격:'I',확률:'J' }
    : { 월:'A',상품:'B',세부:null,구분:'C',담당:'D',고객사:'E',내용:'F',증감:'G',성격:'H',확률:'I' }
  const dec = hasSub
    ? { 월:'L',상품:'M',세부:'N',구분:'O',담당:'P',고객사:'Q',내용:'R',증감:'S',성격:'T',확률:'U' }
    : { 월:'K',상품:'L',세부:null,구분:'M',담당:'N',고객사:'O',내용:'P',증감:'Q',성격:'R',확률:'S' }

  const read = (map, side) => {
    for (let r = 2; r <= maxRow; r++) {
      const m = monthNum(str(sheet, map.월 + r))
      if (!m) continue
      const amtCell = sheet[map.증감 + r]
      if (!amtCell || amtCell.v === '' || amtCell.v == null) continue
      const amount = typeof amtCell.v === 'number' ? amtCell.v : Number(String(amtCell.v).replace(/,/g, ''))
      if (!isFinite(amount)) continue
      const prob = num(sheet, map.확률 + r)
      items.push({
        side, 월: m,
        상품: str(sheet, map.상품 + r),
        세부: map.세부 ? str(sheet, map.세부 + r) : '',
        구분: str(sheet, map.구분 + r),
        담당: str(sheet, map.담당 + r),
        고객사: str(sheet, map.고객사 + r),
        내용: str(sheet, map.내용 + r),
        증감액: Math.round(amount * 100) / 100,
        성격: str(sheet, map.성격 + r),
        확률: Math.round(prob),
        반영: prob >= 50,
      })
    }
  }
  read(inc, '증가')
  read(dec, '감소')
  return items
}

// ── 파일 ① 매출데이터: 워크북(매출달성계획 + 1/2/3그룹) → { plan, pipes } 저장 ──
export async function ingestRevenueWorkbook(file, log = () => {}) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  const planSheet = wb.Sheets['매출달성계획']
  if (!planSheet) throw new Error("'매출달성계획' 시트를 찾을 수 없습니다.")
  const plan = parsePlan(planSheet)
  log('매출달성계획 파싱 완료 (계획·확정실적)')

  const pipes = {}
  for (const name of ['1그룹', '2그룹', '3그룹']) {
    const sh = wb.Sheets[name]
    if (!sh) { log(`⚠ '${name}' 시트 없음 — 건너뜀`); pipes[name] = []; continue }
    pipes[name] = parsePipeSheet(sh, name !== '3그룹')
    log(`${name} 파이프라인 ${pipes[name].length}건 (반영 ${pipes[name].filter((x) => x.반영).length})`)
  }

  const { data: u } = await supabase.auth.getUser()
  // plan/pipes 만 갱신 — ebit 컬럼은 건드리지 않음
  const { error } = await supabase.from('revenue_data')
    .upsert({ id: 1, plan, pipes, updated_at: new Date().toISOString(), updated_by: u?.user?.email || null }, { onConflict: 'id' })
  if (error) throw new Error('저장 실패: ' + error.message)
  log('Supabase 저장 완료')
  return { pipes: Object.fromEntries(Object.entries(pipes).map(([k, v]) => [k, v.length])) }
}

// ── 파일 ② 에비타(공헌이익2): 별도 파일 → { ebit } 저장 ──
// 형식: 매출달성계획과 동일 양식 시트 (합계=6행, 엔터1,2=8행, 엔터3=18행, 월별 계획/실적 열 동일).
// (실제 EBITDA 파일 레이아웃이 다르면 EBIT_ROWS 3줄만 맞추면 됩니다.)
const EBIT_ROWS = { ebit_all: 6, ebit_12: 8, ebit_3: 18 }
const EBIT_SHEET_CANDIDATES = ['매출달성계획', '공헌이익2', '공헌이익', '공헌이익2EBITDA', 'EBITDA']

export async function ingestEbitda(file, log = () => {}) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const name = EBIT_SHEET_CANDIDATES.find((n) => wb.Sheets[n]) || wb.SheetNames[0]
  const sheet = wb.Sheets[name]
  if (!sheet) throw new Error('EBITDA 시트를 찾을 수 없습니다.')
  log(`EBITDA 시트: '${name}'`)

  const lines = {}
  for (const [key, row] of Object.entries(EBIT_ROWS)) {
    lines[key] = {
      plan:   PLAN_COL.plan.map((c) => num(sheet, c + row)),
      actual: PLAN_COL.actual.map((c) => num(sheet, c + row)),
    }
  }
  const ebit = { lines }

  const { data: u } = await supabase.auth.getUser()
  const { error } = await supabase.from('revenue_data')
    .upsert({ id: 1, ebit, updated_at: new Date().toISOString(), updated_by: u?.user?.email || null }, { onConflict: 'id' })
  if (error) throw new Error('저장 실패: ' + error.message)
  log('EBITDA 저장 완료')
  return { ok: true }
}

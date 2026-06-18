import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import { parseNum, parseInt0, parseDate } from './format'

// 엑셀 -> 헤더 기반 행 객체 배열
async function readRows(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
}

function uniqBy(arr, key) {
  const m = new Map()
  for (const x of arr) if (!m.has(x[key])) m.set(x[key], x)
  return [...m.values()]
}

// ── 영업기회 적재 ──────────────────────────────────────────
export async function ingestOpportunities(file, log = () => {}) {
  const rows = (await readRows(file)).filter((r) => r['영업기회ID'] !== '')
  log(`영업기회 ${rows.length}행 읽음`)

  // 1) 거래처(고객사) upsert
  const accounts = uniqBy(
    rows
      .filter((r) => r['고객사ID'] !== '')
      .map((r) => ({ external_id: parseInt0(r['고객사ID']), name: String(r['고객사']).trim() })),
    'external_id'
  )
  if (accounts.length) {
    const { error } = await supabase.from('accounts').upsert(accounts, { onConflict: 'external_id' })
    if (error) throw new Error('거래처 upsert 실패: ' + error.message)
  }
  log(`거래처 ${accounts.length}개 반영`)

  // 2) 담당자 — 없는 이름만 추가(기존 그룹배정 보존)
  const repNames = [...new Set(rows.map((r) => String(r['담당자']).trim()).filter(Boolean))]
  const { data: existingReps } = await supabase.from('reps').select('id,name,group_id')
  const haveNames = new Set((existingReps || []).map((r) => r.name))
  const newReps = repNames.filter((n) => !haveNames.has(n)).map((name) => ({ name }))
  if (newReps.length) {
    const { error } = await supabase.from('reps').insert(newReps)
    if (error) throw new Error('담당자 추가 실패: ' + error.message)
    log(`담당자 ${newReps.length}명 신규 추가(그룹 미배정)`)
  }

  // 3) 매핑 테이블 재조회
  const [{ data: accs }, { data: reps }, { data: stages }] = await Promise.all([
    supabase.from('accounts').select('id,external_id'),
    supabase.from('reps').select('id,name,group_id'),
    supabase.from('pipeline_stages').select('id,label'),
  ])
  const accMap = new Map((accs || []).map((a) => [a.external_id, a.id]))
  const repMap = new Map((reps || []).map((r) => [r.name, r]))
  const stageMap = new Map((stages || []).map((s) => [s.label, s.id]))

  // 4) 영업기회 행 구성
  const opps = rows.map((r) => {
    const rep = repMap.get(String(r['담당자']).trim())
    return {
      external_id: parseInt0(r['영업기회ID']),
      title: String(r['영업기회'] || '').trim(),
      account_id: accMap.get(parseInt0(r['고객사ID'])) || null,
      rep_id: rep?.id || null,
      group_id: rep?.group_id || null,
      stage_id: stageMap.get(String(r['단계']).trim()) || null,
      status: String(r['진행상태'] || '').trim() || null,
      est_amount: parseNum(r['예상매출']),
      win_prob: parseInt0(r['성공확률(%)']),
      product: String(r['제품'] || '').trim() || null,
      sales_type: String(r['매출구분'] || '').trim() || null,
      lost_reason: String(r['실패구분'] || '').trim() || null,
      channel: String(r['인지경로'] || '').trim() || null,
      note: String(r['비고'] || '').trim() || null,
      start_date: parseDate(r['시작일']),
      end_date: parseDate(r['종료일']),
      registered_at: parseDate(r['등록일']),
      changed_at: parseDate(r['변경일']) ? parseDate(r['변경일']) + 'T00:00:00Z' : null,
    }
  })

  const { error } = await supabase.from('opportunities').upsert(opps, { onConflict: 'external_id' })
  if (error) throw new Error('영업기회 upsert 실패: ' + error.message)
  log(`영업기회 ${opps.length}건 반영 완료`)
  return { accounts: accounts.length, reps: newReps.length, opportunities: opps.length }
}

// ── 계약 적재 (영업기회에 없는 건은 버림) ──────────────────
export async function ingestContracts(file, log = () => {}) {
  const rows = (await readRows(file)).filter((r) => r['계약ID'] !== '')
  log(`계약 ${rows.length}행 읽음`)

  // 기준: 현재 영업기회 external_id 집합
  const { data: opps } = await supabase.from('opportunities').select('external_id')
  const validOpp = new Set((opps || []).map((o) => o.external_id))

  const [{ data: accs }, { data: reps }] = await Promise.all([
    supabase.from('accounts').select('id,external_id'),
    supabase.from('reps').select('id,name'),
  ])
  const accMap = new Map((accs || []).map((a) => [a.external_id, a.id]))
  const repMap = new Map((reps || []).map((r) => [r.name, r.id]))

  let dropped = 0
  const contracts = []
  for (const r of rows) {
    const oppId = parseInt0(r['영업기회ID'])
    if (!r['영업기회ID'] || !validOpp.has(oppId)) {
      dropped++
      continue // 고아 계약 제외
    }
    contracts.push({
      external_id: parseInt0(r['계약ID']),
      opportunity_external_id: oppId,
      title: String(r['계약명'] || '').trim(),
      account_id: accMap.get(parseInt0(r['고객사ID'])) || null,
      rep_id: repMap.get(String(r['담당자']).trim()) || null,
      supply_amount: parseNum(r['공급가액']),
      tax_amount: parseNum(r['세액']),
      total_amount: parseNum(r['합계금액']),
      product: String(r['연관제품'] || '').trim() || null,
      line_count: parseInt0(r['회선수']),
      contract_type: String(r['계약구분'] || '').trim() || null,
      contract_date: parseDate(r['계약일']),
      start_date: parseDate(r['시작일']),
      end_date: parseDate(r['종료일']),
      renewal_date: parseDate(r['갱신예정일']),
      note: String(r['비고'] || '').trim() || null,
    })
  }

  if (contracts.length) {
    const { error } = await supabase.from('contracts').upsert(contracts, { onConflict: 'external_id' })
    if (error) throw new Error('계약 upsert 실패: ' + error.message)
  }
  log(`계약 ${contracts.length}건 반영, 영업기회 없는 ${dropped}건 제외`)
  return { contracts: contracts.length, dropped }
}

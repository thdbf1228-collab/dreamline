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
export async function ingestOpportunities(file, log = () => {}, replace = false) {
  const rows = (await readRows(file)).filter((r) => r['영업기회ID'] !== '')
  if (replace && rows.length === 0) throw new Error('영업기회 파일에 데이터가 없어 전체 교체를 중단했습니다.')
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

  if (replace) { const { error: de } = await supabase.from('opportunities').delete().not('id', 'is', null); if (de) throw new Error('기존 영업기회 삭제 실패: ' + de.message); log('기존 영업기회 전체 삭제 후 교체') }
  const { error } = await supabase.from('opportunities').upsert(opps, { onConflict: 'external_id' })
  if (error) throw new Error('영업기회 upsert 실패: ' + error.message)
  log(`영업기회 ${opps.length}건 반영 완료`)
  return { accounts: accounts.length, reps: newReps.length, opportunities: opps.length }
}

// ── 계약 적재 (영업기회에 없는 건은 버림) ──────────────────
export async function ingestContracts(file, log = () => {}, replace = false) {
  const rows = (await readRows(file)).filter((r) => r['계약ID'] !== '')
  if (replace && rows.length === 0) throw new Error('계약 파일에 데이터가 없어 전체 교체를 중단했습니다.')
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
    if (replace) { const { error: de } = await supabase.from('contracts').delete().not('id', 'is', null); if (de) throw new Error('기존 계약 삭제 실패: ' + de.message); log('기존 계약 전체 삭제 후 교체') }
    const { error } = await supabase.from('contracts').upsert(contracts, { onConflict: 'external_id' })
    if (error) throw new Error('계약 upsert 실패: ' + error.message)
  }
  log(`계약 ${contracts.length}건 반영, 영업기회 없는 ${dropped}건 제외`)
  return { contracts: contracts.length, dropped }
}

// ── 영업활동 적재 ──────────────────────────────────────────
export async function ingestActivities(file, log = () => {}, replace = false) {
  const rows = (await readRows(file)).filter((r) => r['영업활동ID'] !== '')
  if (replace && rows.length === 0) throw new Error('영업활동 파일에 데이터가 없어 전체 교체를 중단했습니다.')
  log(`영업활동 ${rows.length}행 읽음`)

  // 담당자 — 없는 이름만 추가(기존 그룹배정 보존)
  const repNames = [...new Set(rows.map((r) => String(r['담당자']).trim()).filter(Boolean))]
  const { data: existingReps } = await supabase.from('reps').select('id,name')
  const have = new Set((existingReps || []).map((r) => r.name))
  const newReps = repNames.filter((n) => !have.has(n)).map((name) => ({ name }))
  if (newReps.length) {
    const { error } = await supabase.from('reps').insert(newReps)
    if (error) throw new Error('담당자 추가 실패: ' + error.message)
    log(`담당자 ${newReps.length}명 신규 추가(그룹 미배정)`)
  }
  const { data: reps } = await supabase.from('reps').select('id,name')
  const repMap = new Map((reps || []).map((r) => [r.name, r.id]))

  const acts = rows.map((r) => {
    let type = String(r['활동분류'] || '').trim()
    if (!type || type.startsWith('선택하세요')) type = '미분류'
    return {
      external_id: parseInt0(r['영업활동ID']),
      rep_id: repMap.get(String(r['담당자']).trim()) || null,
      account_external_id: parseInt0(r['고객사ID']) || null,
      account_name: String(r['고객사'] || '').trim() || null,
      opportunity_external_id: parseInt0(r['영업기회ID']) || null,
      activity_type: type,
      activity_purpose: String(r['활동목적'] || '').trim() || null,
      activity_content: String(r['활동내용'] || '').trim() || null,
      plan_content: String(r['계획내용'] || '').trim() || null,
      start_time: String(r['활동시작시간'] || '').trim() || null,
      end_time: String(r['활동종료시간'] || '').trim() || null,
      opportunity_title: String(r['영업기회'] || '').trim() || null,
      related_product: String(r['연관제품'] || '').trim() || null,
      companion: String(r['동반'] || '').trim() || null,
      participants: String(r['참가자'] || '').trim() || null,
      customer_name: String(r['고객'] || '').trim() || null,
      registered_by: String(r['등록자'] || '').trim() || null,
      registered_at: parseDate(r['등록일']),
      activity_date: parseDate(r['활동일시']),
    }
  })

  if (replace) { const { error: de } = await supabase.from('activities').delete().not('id', 'is', null); if (de) throw new Error('기존 영업활동 삭제 실패: ' + de.message); log('기존 영업활동 전체 삭제 후 교체') }
  const { error } = await supabase.from('activities').upsert(acts, { onConflict: 'external_id' })
  if (error) throw new Error('영업활동 upsert 실패: ' + error.message)
  log(`영업활동 ${acts.length}건 반영 완료`)
  return { activities: acts.length, reps: newReps.length }
}

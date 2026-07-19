import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ingestOpportunities, ingestContracts, ingestActivities } from '../lib/upload'
import { Card } from '../components/ui'

const PHOTO_BUCKET = 'rep-photos'

function NoticePanel() {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'notice').maybeSingle().then(({ data }) => { setText(data?.value || ''); setLoaded(true) })
  }, [])
  async function save() {
    const { error } = await supabase.from('app_settings').upsert({ key: 'notice', value: text.trim() || null, updated_at: new Date().toISOString() })
    setMsg(error ? '저장 실패: ' + error.message : (text.trim() ? '공지 저장됨 (뷰어 상단에 표시)' : '공지 삭제됨'))
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">공지사항</h2>
      <p className="text-xs text-ink-400 mb-3">모든 뷰어 화면 상단에 배너로 표시됩니다. 비우고 저장하면 내려갑니다.</p>
      {msg && <p className="mb-2 text-xs text-ink-500">{msg}</p>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!loaded} rows={3} placeholder="예: 6월 마감은 6/30까지 입력 바랍니다."
        className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
      <div className="mt-2"><button onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">저장</button></div>
    </Card>
  )
}

export default function Admin() {
  const [groups, setGroups] = useState([])
  const loadGroups = () =>
    supabase.from('groups').select('id,name,sort_order').order('sort_order').then(({ data }) => setGroups(data || []))
  useEffect(() => { loadGroups() }, [])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink-900">설정 · 업로드</h1>
        <p className="text-sm text-ink-500">관리자 전용</p>
      </header>
      <UploadPanel />
      <NoticePanel />
      <GroupPanel groups={groups} reload={loadGroups} />
      <RepPanel groups={groups} />
    </div>
  )
}

function UploadPanel() {
  const oppRef = useRef(); const conRef = useRef(); const actRef = useRef()
  const [busy, setBusy] = useState(false); const [logs, setLogs] = useState([]); const [replace, setReplace] = useState(false)
  const log = (m) => setLogs((l) => [...l, m])

  // DB에 상세 컬럼이 실제로 만들어졌는지 점검
  async function checkDb() {
    setLogs([])
    const need = {
      v_activities: ['activity_content', 'plan_content', 'opportunity_title', 'related_product', 'start_time', 'end_time', 'customer_name', 'companion', 'participants', 'registered_by'],
      v_contracts: ['related_product'],
    }
    for (const [view, keys] of Object.entries(need)) {
      const { data, error } = await supabase.from(view).select('*').limit(1)
      if (error) { log(`${view} 조회 실패: ${error.message}`); continue }
      if (!data || data.length === 0) { log(`${view}: 데이터가 없어 점검 불가`); continue }
      const have = Object.keys(data[0])
      const missing = keys.filter((k) => !have.includes(k))
      if (missing.length === 0) log(`✅ ${view}: 컬럼 정상 (SQL 실행됨)`)
      else log(`❌ ${view}: 없는 컬럼 → ${missing.join(', ')}  → add_detail_columns.sql 을 실행하세요`)
      // 값이 실제로 채워졌는지
      if (view === 'v_activities' && have.includes('activity_content')) {
        const { count } = await supabase.from(view).select('id', { count: 'exact', head: true }).not('activity_content', 'is', null)
        log(`   활동내용이 채워진 행: ${count ?? 0}건` + ((count ?? 0) === 0 ? '  → 영업활동 엑셀을 다시 업로드하세요' : ''))
      }
    }
  }
  async function run() {
    const o = oppRef.current?.files?.[0]; const c = conRef.current?.files?.[0]; const ac = actRef.current?.files?.[0]
    if (!o && !c && !ac) return log('업로드할 파일을 선택하세요.')
    setBusy(true); setLogs([])
    try { if (o) await ingestOpportunities(o, log, replace); if (c) await ingestContracts(c, log, replace); if (ac) await ingestActivities(ac, log, replace); log('✅ 완료.') }
    catch (e) { log('❌ ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">주간 데이터 업로드</h2>
      <p className="text-xs text-ink-400 mb-4">필요한 것만 올려도 됩니다 (예: 영업활동만). 빈 칸은 건드리지 않습니다. 여러 개를 함께 올리면 영업기회 → 계약 → 영업활동 순으로 처리됩니다.</p>
      <div className="grid md:grid-cols-3 gap-4">
        <FileField label="영업기회" inputRef={oppRef} />
        <FileField label="계약" inputRef={conRef} />
        <FileField label="영업활동" inputRef={actRef} />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="w-4 h-4 accent-brand" />
        <span className={replace ? 'font-semibold text-lost' : 'text-ink-700'}>전체 교체 (올린 종류의 기존 데이터를 지우고 이 파일로 덮어쓰기)</span>
      </label>
      <button onClick={run} disabled={busy} className="mt-3 block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {busy ? '처리 중…' : (replace ? '전체 교체 업로드' : '업로드 · 반영(누적)')}
      </button>
      <button onClick={checkDb} className="mt-3 ml-2 rounded-lg border border-line px-3 py-2.5 text-sm text-ink-600 hover:bg-canvas">DB 점검</button>
      {logs.length > 0 && <div className="mt-4 rounded-lg bg-canvas p-3 text-xs text-ink-700 space-y-1 font-mono">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>}
    </Card>
  )
}
function FileField({ label, inputRef }) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-700 mb-1">{label}</label>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand" />
    </div>
  )
}

function GroupPanel({ groups, reload }) {
  const [name, setName] = useState(''); const [msg, setMsg] = useState('')
  async function add() {
    const n = name.trim(); if (!n) return
    const { error } = await supabase.from('groups').insert({ name: n, sort_order: groups.length + 1 })
    setMsg(error ? '추가 실패: ' + error.message : `'${n}' 추가됨`); setName(''); reload()
  }
  async function remove(id) {
    if (!confirm('이 그룹을 삭제할까요? (소속 담당자는 미배정이 됩니다)')) return
    const { error } = await supabase.from('groups').delete().eq('id', id)
    setMsg(error ? '삭제 실패: ' + error.message : '삭제됨'); reload()
  }
  async function rename(g, v) {
    const nv = v.trim()
    if (!nv || nv === g.name) return
    const { error } = await supabase.from('groups').update({ name: nv }).eq('id', g.id)
    setMsg(error ? '변경 실패: ' + error.message : `그룹명 '${g.name}' → '${nv}' 변경되었습니다`); reload()
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">그룹 관리</h2>
      <p className="text-xs text-ink-400 mb-3">그룹명을 클릭해 바로 수정할 수 있습니다. 여기서 추가한 그룹이 담당자 드랍다운에 나옵니다.</p>
      {msg && <p className="mb-2 text-xs text-ink-500">{msg}</p>}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {groups.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1 rounded-lg bg-canvas px-2.5 py-1 text-sm text-ink-700">
            <input defaultValue={g.name} onBlur={(e) => rename(g, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="w-20 bg-transparent text-ink-700 border-b border-transparent focus:border-brand focus:outline-none" />
            <button onClick={() => remove(g.id)} className="text-ink-400 hover:text-lost">×</button>
          </span>
        ))}
        {groups.length === 0 && <span className="text-xs text-ink-400">그룹 없음 — 추가하세요 (예: 1그룹)</span>}
      </div>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="그룹명 (예: 1그룹)" className="w-44 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <button onClick={add} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">그룹 추가</button>
      </div>
    </Card>
  )
}

function RepPanel({ groups }) {
  const [reps, setReps] = useState([]); const [msg, setMsg] = useState('')
  const [running, setRunning] = useState(false)
  const [leaving, setLeaving] = useState(null)
  const [transferTo, setTransferTo] = useState('')
  const [showLeft, setShowLeft] = useState(false)
  const [nn, setNn] = useState(''); const [ng, setNg] = useState(''); const [ne, setNe] = useState('')
  const newPhoto = useRef()

  const load = () => supabase.from('reps').select('id,name,group_id,email,photo_url,active,excluded').order('name').then(({ data }) => setReps(data || []))
  useEffect(() => { load() }, [])

  async function update(id, patch) {
    const { error } = await supabase.from('reps').update(patch).eq('id', id)
    setMsg(error ? '변경 실패: ' + error.message : '저장됨.'); load()
  }
  async function uploadPhoto(repId, file) {
    if (!file) return null
    const ext = file.name.split('.').pop()
    const path = `${repId}.${ext}`
    const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true })
    if (up.error) { setMsg(`사진 업로드 실패: ${up.error.message} (Storage '${PHOTO_BUCKET}' 공개버킷 필요)`); return null }
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl + '?t=' + Date.now()
  }
  async function addRep() {
    const n = nn.trim(); if (!n) return setMsg('이름을 입력하세요.')
    const { data, error } = await supabase.from('reps').insert({ name: n, group_id: ng || null }).select().single()
    if (error) return setMsg('담당자 추가 실패: ' + error.message)
    const file = newPhoto.current?.files?.[0]
    if (file && data) { const url = await uploadPhoto(data.id, file); if (url) await supabase.from('reps').update({ photo_url: url }).eq('id', data.id) }
    setNn(''); setNg(''); if (newPhoto.current) newPhoto.current.value = ''
    setMsg(`'${n}' 추가됨`); load()
  }
  async function removeRep(rep) {
    if (!confirm(`담당자 '${rep.name}' 완전 삭제할까요?\n· 담당자 정보 삭제\n· 로그인 계정도 삭제\n(영업기회의 담당자 연결은 해제됩니다. 보통은 '퇴사'를 권장)`)) return
    if (rep.email) { try { await supabase.functions.invoke('reset-password', { body: { email: rep.email, action: 'delete' } }) } catch {} }
    const { error } = await supabase.from('reps').delete().eq('id', rep.id)
    setMsg(error ? '삭제 실패: ' + error.message : `${rep.name} 삭제됨`); load()
  }
  async function confirmLeave() {
    const rep = leaving
    if (!confirm(`${rep.name} 퇴사 처리할까요?\n· 담당 거래 ${transferTo ? '이관' : '유지'}\n· 담당자별 화면에서 숨김\n· 로그인 차단`)) return
    let moved = ''
    if (transferTo) {
      const t = reps.find((r) => r.id === transferTo)
      const { error } = await supabase.from('opportunities').update({ rep_id: t.id, group_id: t.group_id || null }).eq('rep_id', rep.id)
      if (error) return setMsg('거래 이관 실패: ' + error.message)
      moved = ` · 담당 거래를 ${t.name}에게 이관`
    }
    const { error: e2 } = await supabase.from('reps').update({ active: false }).eq('id', rep.id)
    if (e2) return setMsg('퇴사 처리 실패: ' + e2.message)
    let lgn = ''
    if (rep.email) {
      const { data, error } = await supabase.functions.invoke('reset-password', { body: { email: rep.email, action: 'disable' } })
      if (error) { let d = error.message; try { const b = await error.context.json(); if (b?.error) d = b.error } catch {}; lgn = ` · 로그인 차단 실패: ${d}` }
      else lgn = ` · ${data?.message || '로그인 차단'}`
    }
    setLeaving(null); setTransferTo(''); setMsg(`${rep.name} 퇴사 처리됨${moved}${lgn}`); load()
  }
  async function restore(rep) {
    await supabase.from('reps').update({ active: true }).eq('id', rep.id)
    let lgn = ''
    if (rep.email) {
      const { data, error } = await supabase.functions.invoke('reset-password', { body: { email: rep.email, action: 'enable' } })
      if (!error) lgn = ` · ${data?.message || '로그인 차단 해제'}`
    }
    setMsg(`${rep.name} 복구됨${lgn}`); load()
  }
  async function toggleExclude(rep) {
    const next = !rep.excluded
    if (next && !confirm(`${rep.name} 카운팅 제외할까요?\n전체·파이프라인·활동 화면 집계에서 빠집니다. (계약탭은 그대로 유지 · 다시 살리기 가능)`)) return
    const { error } = await supabase.from('reps').update({ excluded: next }).eq('id', rep.id)
    setMsg(error ? '실패: ' + error.message : `${rep.name} ${next ? '카운팅 제외됨' : '카운팅 복구됨'}`); load()
  }
  async function resetPw(email) {
    if (!email) return setMsg('먼저 이 담당자의 아이디(이메일)를 입력하세요.')
    if (!confirm(`'${email}' 로그인 계정을 비번 111111로 설정합니다.\n(계정이 없으면 새로 생성, 있으면 111111로 초기화 — 다음 로그인 시 변경 강제)`)) return
    setMsg('초기화 중…')
    const { data, error } = await supabase.functions.invoke('reset-password', { body: { email } })
    if (error) {
      let detail = error.message
      try { const b = await error.context.json(); if (b?.error) detail = b.error } catch {}
      return setMsg('초기화 실패: ' + detail)
    }
    setMsg(data?.message || `${email} 비밀번호 111111로 초기화됨`)
  }
  async function provisionAll() {
    const targets = reps.filter((r) => r.active !== false && r.email && r.email.trim())
    const noEmail = reps.length - targets.length
    if (!targets.length) return setMsg('아이디(이메일)가 채워진 담당자가 없습니다. 먼저 각 담당자 이메일을 입력하세요.')
    if (!confirm(`${targets.length}명의 로그인 계정을 생성/초기화합니다 (비번 111111).${noEmail ? `\n(이메일 없는 ${noEmail}명은 건너뜀)` : ''}`)) return
    setRunning(true); setMsg('전체 처리 중… 0/' + targets.length)
    let ok = 0; const fails = []
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i]
      const { data, error } = await supabase.functions.invoke('reset-password', { body: { email: r.email.trim() } })
      if (error) { let d = error.message; try { const b = await error.context.json(); if (b?.error) d = b.error } catch {}; fails.push(`${r.name}(${r.email}): ${d}`) }
      else ok++
      setMsg(`전체 처리 중… ${i + 1}/${targets.length}`)
    }
    setRunning(false)
    setMsg(`완료 — 성공 ${ok}명${noEmail ? `, 이메일없음 ${noEmail}명 제외` : ''}${fails.length ? `, 실패 ${fails.length}명:\n· ` + fails.join('\n· ') : ''}`)
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">담당자 관리</h2>
      {msg && <p className="mb-3 text-xs text-ink-500 whitespace-pre-line">{msg}</p>}

      {/* 추가 폼: 이름 / 그룹 / 사진 */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-canvas">
        <input value={nn} onChange={(e) => setNn(e.target.value)} placeholder="새 담당자 이름" className="w-32 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <select value={ng} onChange={(e) => setNg(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand">
          <option value="">그룹 선택</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input ref={newPhoto} type="file" accept="image/*" className="text-xs text-ink-500 file:mr-2 file:rounded file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:text-brand" />
        <button onClick={addRep} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">담당자 추가</button>
      </div>

      <div className="hidden md:flex items-center gap-2 pb-2 mb-1 text-[11px] font-medium text-ink-400 border-b border-line">
        <span className="w-9" />
        <span className="w-16">이름</span>
        <span className="w-[116px]">그룹</span>
        <span>사진</span>
      </div>
      {leaving && (
        <div className="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm">
          <div className="mb-2"><b>{leaving.name}</b> 퇴사 처리 — 담당 거래를 이관할 대상을 고르세요.</div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm">
              <option value="">이관 안 함 (거래에 퇴사자 이름 유지)</option>
              {reps.filter((r) => r.active !== false && r.id !== leaving.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={confirmLeave} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600">퇴사 처리</button>
            <button onClick={() => { setLeaving(null); setTransferTo('') }} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-500">취소</button>
          </div>
        </div>
      )}
      <label className="flex items-center gap-2 mb-2 text-xs text-ink-500 cursor-pointer select-none">
        <input type="checkbox" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} className="w-3.5 h-3.5 accent-brand" /> 퇴사자 포함 보기
      </label>
      <div className="divide-y divide-line">
        {[...reps].filter((r) => showLeft || r.active !== false).sort((a, b) => (a.active === false) - (b.active === false) || a.name.localeCompare(b.name)).map((rep) => {
          const left = rep.active === false
          return (
          <div key={rep.id} className={`py-3 flex flex-wrap items-center gap-2 ${left ? 'opacity-50' : ''}`}>
            <Thumb url={rep.photo_url} name={rep.name} />
            <span className="w-16 text-sm font-medium text-ink-900">{rep.name}</span>
            {left && <span className="rounded bg-canvas border border-line px-1.5 py-0.5 text-[11px] text-ink-500">퇴사</span>}
            {rep.excluded && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-stale">집계제외</span>}
            <select value={rep.group_id || ''} onChange={(e) => update(rep.id, { group_id: e.target.value || null })} className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand">
              <option value="">미배정</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {!left && (
              <label className="text-xs text-brand cursor-pointer hover:underline">사진
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const url = await uploadPhoto(rep.id, e.target.files?.[0]); if (url) update(rep.id, { photo_url: url }) }} />
              </label>
            )}
            {left
              ? <button onClick={() => restore(rep)} className="ml-auto text-xs text-brand hover:underline">복구</button>
              : <button onClick={() => { setLeaving(rep); setTransferTo('') }} className="ml-auto text-xs text-stale hover:underline">퇴사</button>}
            <button onClick={() => toggleExclude(rep)} className={`text-xs hover:underline ${rep.excluded ? 'text-brand' : 'text-ink-400'}`}>{rep.excluded ? '집계복구' : '카운팅제외'}</button>
            <button onClick={() => removeRep(rep)} className="text-xs text-lost hover:underline">삭제</button>
          </div>
        )})}
      </div>
    </Card>
  )
}

function Thumb({ url, name }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover border border-line" />
  return <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand">{name?.slice(-2)}</div>
}

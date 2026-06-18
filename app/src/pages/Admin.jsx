import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ingestOpportunities, ingestContracts } from '../lib/upload'
import { Card } from '../components/ui'

const PHOTO_BUCKET = 'rep-photos'

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
      <GroupPanel groups={groups} reload={loadGroups} />
      <RepPanel groups={groups} />
    </div>
  )
}

function UploadPanel() {
  const oppRef = useRef(); const conRef = useRef()
  const [busy, setBusy] = useState(false); const [logs, setLogs] = useState([])
  const log = (m) => setLogs((l) => [...l, m])
  async function run() {
    const o = oppRef.current?.files?.[0]; const c = conRef.current?.files?.[0]
    if (!o && !c) return log('업로드할 파일을 선택하세요.')
    setBusy(true); setLogs([])
    try { if (o) await ingestOpportunities(o, log); if (c) await ingestContracts(c, log); log('✅ 완료.') }
    catch (e) { log('❌ ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">주간 데이터 업로드</h2>
      <p className="text-xs text-ink-400 mb-4">영업기회ID 기준 갱신 (영업기회 → 계약 순). 중복 없이 누적·갱신.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <FileField label="영업기회 (전체)" inputRef={oppRef} />
        <FileField label="계약 (확정금액)" inputRef={conRef} />
      </div>
      <button onClick={run} disabled={busy} className="mt-4 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {busy ? '처리 중…' : '업로드 · 반영'}
      </button>
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
    const { error } = await supabase.from('groups').delete().eq('id', id)
    setMsg(error ? '삭제 실패: ' + error.message : '삭제됨'); reload()
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">그룹 관리</h2>
      <p className="text-xs text-ink-400 mb-3">여기서 추가한 그룹이 담당자 그룹 드랍다운에 바로 나옵니다.</p>
      {msg && <p className="mb-2 text-xs text-ink-500">{msg}</p>}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {groups.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1 rounded-lg bg-canvas px-2.5 py-1 text-sm text-ink-700">
            {g.name}
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
  const [nn, setNn] = useState(''); const [ng, setNg] = useState(''); const [ne, setNe] = useState('')
  const newPhoto = useRef()

  const load = () => supabase.from('reps').select('id,name,group_id,email,photo_url,active').order('name').then(({ data }) => setReps(data || []))
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
    const { data, error } = await supabase.from('reps').insert({ name: n, group_id: ng || null, email: ne.trim() || null }).select().single()
    if (error) return setMsg('담당자 추가 실패: ' + error.message)
    const file = newPhoto.current?.files?.[0]
    if (file && data) { const url = await uploadPhoto(data.id, file); if (url) await supabase.from('reps').update({ photo_url: url }).eq('id', data.id) }
    setNn(''); setNg(''); setNe(''); if (newPhoto.current) newPhoto.current.value = ''
    setMsg(`'${n}' 추가됨`); load()
  }
  async function removeRep(id, name) {
    if (!confirm(`담당자 '${name}' 삭제? (영업기회의 담당자 연결은 해제됩니다)`)) return
    const { error } = await supabase.from('reps').delete().eq('id', id)
    setMsg(error ? '삭제 실패: ' + error.message : '삭제됨'); load()
  }
  async function resetPw(email) {
    if (!email) return setMsg('먼저 이 담당자의 아이디(이메일)를 입력하세요.')
    if (!confirm(`'${email}' 비밀번호를 1111로 초기화하고, 다음 로그인 시 변경을 강제합니다.`)) return
    setMsg('초기화 중…')
    const { data, error } = await supabase.functions.invoke('reset-password', { body: { email } })
    if (error) return setMsg('초기화 실패: ' + error.message + " (Edge Function 'reset-password' 배포 필요 — README 참고)")
    setMsg(data?.message || `${email} 비밀번호 1111로 초기화됨`)
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">담당자 관리</h2>
      <p className="text-xs text-ink-400 mb-3">추가 · 그룹배정 · 아이디(이메일) · 사진 · 비번 초기화(1111) · 삭제</p>
      {msg && <p className="mb-3 text-xs text-ink-500">{msg}</p>}

      {/* 추가 폼: 이름 / 그룹 / 아이디 / 사진 */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-canvas">
        <input value={nn} onChange={(e) => setNn(e.target.value)} placeholder="새 담당자 이름" className="w-32 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <select value={ng} onChange={(e) => setNg(e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand">
          <option value="">그룹 선택</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input value={ne} onChange={(e) => setNe(e.target.value)} placeholder="아이디 (이메일)" className="w-48 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <input ref={newPhoto} type="file" accept="image/*" className="text-xs text-ink-500 file:mr-2 file:rounded file:border-0 file:bg-brand-soft file:px-2 file:py-1 file:text-xs file:text-brand" />
        <button onClick={addRep} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">담당자 추가</button>
      </div>

      <div className="hidden md:flex items-center gap-2 pb-2 mb-1 text-[11px] font-medium text-ink-400 border-b border-line">
        <span className="w-9" />
        <span className="w-16">이름</span>
        <span className="w-[116px]">그룹</span>
        <span className="w-52">아이디(이메일)</span>
        <span>사진</span>
        <span>비번</span>
      </div>
      <div className="divide-y divide-line">
        {reps.map((rep) => (
          <div key={rep.id} className="py-3 flex flex-wrap items-center gap-2">
            <Thumb url={rep.photo_url} name={rep.name} />
            <span className="w-16 text-sm font-medium text-ink-900">{rep.name}</span>
            <select value={rep.group_id || ''} onChange={(e) => update(rep.id, { group_id: e.target.value || null })} className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand">
              <option value="">미배정</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input type="email" defaultValue={rep.email || ''} placeholder="아이디 (이메일)"
              onBlur={(e) => { const v = e.target.value.trim(); if (v !== (rep.email || '')) update(rep.id, { email: v || null }) }}
              className="w-52 rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-brand" />
            <label className="text-xs text-brand cursor-pointer hover:underline">
              사진
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const url = await uploadPhoto(rep.id, e.target.files?.[0]); if (url) update(rep.id, { photo_url: url }) }} />
            </label>
            <button onClick={() => resetPw(rep.email)} className="text-xs text-stale hover:underline">비밀번호 변경</button>
            <button onClick={() => removeRep(rep.id, rep.name)} className="ml-auto text-xs text-lost hover:underline">삭제</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Thumb({ url, name }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover border border-line" />
  return <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand">{name?.slice(-2)}</div>
}

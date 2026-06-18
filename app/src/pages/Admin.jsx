import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ingestOpportunities, ingestContracts } from '../lib/upload'
import { Card } from '../components/ui'

const PHOTO_BUCKET = 'rep-photos'

export default function Admin() {
  const [msg, setMsg] = useState('')
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink-900">설정 · 업로드</h1>
        <p className="text-sm text-ink-500">관리자 전용</p>
      </header>
      {msg && <div className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand">{msg}</div>}
      <UploadPanel />
      <GroupPanel notify={setMsg} />
      <RepPanel notify={setMsg} />
      <AccountPanel notify={setMsg} />
    </div>
  )
}

function UploadPanel() {
  const oppRef = useRef(); const conRef = useRef()
  const [busy, setBusy] = useState(false)
  const [logs, setLogs] = useState([])
  const log = (m) => setLogs((l) => [...l, m])
  async function run() {
    const oppFile = oppRef.current?.files?.[0]; const conFile = conRef.current?.files?.[0]
    if (!oppFile && !conFile) return log('업로드할 파일을 선택하세요.')
    setBusy(true); setLogs([])
    try {
      if (oppFile) await ingestOpportunities(oppFile, log)
      if (conFile) await ingestContracts(conFile, log)
      log('✅ 완료. 대시보드에 반영됨.')
    } catch (e) { log('❌ ' + e.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">주간 데이터 업로드</h2>
      <p className="text-xs text-ink-400 mb-4">영업기회ID 기준 갱신 (영업기회 → 계약 순). 전체/주간 어느 파일이든 중복 없이 누적·갱신.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <FileField label="영업기회 (전체)" inputRef={oppRef} />
        <FileField label="계약 (확정금액)" inputRef={conRef} />
      </div>
      <button onClick={run} disabled={busy} className="mt-4 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">{busy ? '처리 중…' : '업로드 · 반영'}</button>
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

// 그룹 관리
function GroupPanel({ notify }) {
  const [groups, setGroups] = useState([])
  const [name, setName] = useState('')
  const load = () => supabase.from('groups').select('id,name,sort_order').order('sort_order').then(({ data }) => setGroups(data || []))
  useEffect(() => { load() }, [])
  async function add() {
    const n = name.trim(); if (!n) return
    const { error } = await supabase.from('groups').insert({ name: n, sort_order: groups.length + 1 })
    notify(error ? '그룹 추가 실패: ' + error.message : `'${n}' 추가됨`); setName(''); load()
  }
  async function remove(id) {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    notify(error ? '삭제 실패: ' + error.message : '그룹 삭제됨'); load()
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-3">그룹 관리</h2>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {groups.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1 text-sm">
            {g.name}
            <button onClick={() => remove(g.id)} className="text-ink-400 hover:text-lost">✕</button>
          </span>
        ))}
        {groups.length === 0 && <span className="text-xs text-ink-400">그룹 없음 — 추가하세요 (예: 1그룹)</span>}
      </div>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="새 그룹명 (예: 1그룹)" className="w-44 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <button onClick={add} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">그룹 추가</button>
      </div>
    </Card>
  )
}

// 담당자 관리 (추가/수정/삭제 + 사진)
function RepPanel({ notify }) {
  const [reps, setReps] = useState([]); const [groups, setGroups] = useState([])
  const [newName, setNewName] = useState('')
  async function load() {
    const [{ data: r }, { data: g }] = await Promise.all([
      supabase.from('reps').select('id,name,group_id,photo_url,active').order('name'),
      supabase.from('groups').select('id,name').order('sort_order'),
    ])
    setReps(r || []); setGroups(g || [])
  }
  useEffect(() => { load() }, [])
  async function update(id, patch) {
    const { error } = await supabase.from('reps').update(patch).eq('id', id)
    notify(error ? '변경 실패: ' + error.message : '저장됨'); load()
  }
  async function addRep() {
    const n = newName.trim(); if (!n) return
    const { error } = await supabase.from('reps').insert({ name: n })
    notify(error ? '담당자 추가 실패: ' + error.message : `'${n}' 추가됨`); setNewName(''); load()
  }
  async function removeRep(id, name) {
    if (!confirm(`담당자 '${name}' 삭제? (영업기회의 담당자 연결은 해제됩니다)`)) return
    const { error } = await supabase.from('reps').delete().eq('id', id)
    notify(error ? '삭제 실패: ' + error.message : '삭제됨'); load()
  }
  async function uploadPhoto(rep, file) {
    if (!file) return
    notify('사진 업로드 중…')
    const ext = file.name.split('.').pop(); const path = `${rep.id}.${ext}`
    const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true })
    if (up.error) return notify(`사진 실패: ${up.error.message} ('${PHOTO_BUCKET}' 공개 버킷 필요)`)
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
    update(rep.id, { photo_url: data.publicUrl + '?t=' + Date.now() })
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">담당자 관리</h2>
      <p className="text-xs text-ink-400 mb-4">추가 · 그룹배정 · 사진 · 삭제</p>
      <div className="flex gap-2 mb-4">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addRep()} placeholder="새 담당자 이름" className="w-44 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand" />
        <button onClick={addRep} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">담당자 추가</button>
      </div>
      <div className="divide-y divide-line">
        {reps.map((rep) => (
          <div key={rep.id} className="py-3 flex flex-wrap items-center gap-3">
            <Thumb url={rep.photo_url} name={rep.name} />
            <input defaultValue={rep.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== rep.name) update(rep.id, { name: v }) }} className="w-28 rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand" />
            <select value={rep.group_id || ''} onChange={(e) => update(rep.id, { group_id: e.target.value || null })} className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand">
              <option value="">미배정</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <label className="text-xs text-brand cursor-pointer hover:underline">사진<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(rep, e.target.files?.[0])} /></label>
            <button onClick={() => removeRep(rep.id, rep.name)} className="ml-auto text-xs text-lost hover:underline">삭제</button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 계정 관리 (로그인 계정: 권한 + 비번 초기화 요청)
function AccountPanel({ notify }) {
  const [accts, setAccts] = useState([])
  const load = () => supabase.from('profiles').select('id,email,role,must_change_password').order('email').then(({ data }) => setAccts(data || []))
  useEffect(() => { load() }, [])
  async function setRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    notify(error ? '권한 변경 실패: ' + error.message : '권한 변경됨'); load()
  }
  async function reqReset(id, email) {
    if (!confirm(`'${email}' 다음 로그인 시 비밀번호 변경을 강제합니다.\n(실제 비번 초기화는 Supabase 대시보드에서 1111로 리셋하세요)`)) return
    const { error } = await supabase.from('profiles').update({ must_change_password: true }).eq('id', id)
    notify(error ? '실패: ' + error.message : '초기화 요청됨 — 대시보드에서 비번을 1111로 리셋하세요'); load()
  }
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">계정 관리</h2>
      <p className="text-xs text-ink-400 mb-4">로그인 계정 권한 · 비밀번호 초기화. 계정 생성/비번 리셋은 Supabase 대시보드에서.</p>
      <div className="divide-y divide-line">
        {accts.map((a) => (
          <div key={a.id} className="py-3 flex flex-wrap items-center gap-3">
            <span className="flex-1 min-w-0 truncate text-sm text-ink-900">{a.email}</span>
            {a.must_change_password && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-stale">변경 대기</span>}
            <select value={a.role} onChange={(e) => setRole(a.id, e.target.value)} className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand">
              <option value="viewer">뷰어</option>
              <option value="admin">관리자</option>
            </select>
            <button onClick={() => reqReset(a.id, a.email)} className="text-xs text-brand hover:underline">비번 초기화 요청</button>
          </div>
        ))}
        {accts.length === 0 && <p className="py-4 text-xs text-ink-400">계정 없음</p>}
      </div>
    </Card>
  )
}

function Thumb({ url, name }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover border border-line" />
  return <div className="w-9 h-9 rounded-full bg-brand-soft flex items-center justify-center text-xs font-bold text-brand">{name?.slice(-2)}</div>
}

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ingestOpportunities, ingestContracts } from '../lib/upload'
import { Card } from '../components/ui'

const PHOTO_BUCKET = 'rep-photos'

export default function Admin() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-ink-900">설정 · 업로드</h1>
        <p className="text-sm text-ink-500">관리자 전용</p>
      </header>
      <UploadPanel />
      <RepPanel />
    </div>
  )
}

function UploadPanel() {
  const oppRef = useRef()
  const conRef = useRef()
  const [busy, setBusy] = useState(false)
  const [logs, setLogs] = useState([])
  const log = (m) => setLogs((l) => [...l, m])

  async function run() {
    const oppFile = oppRef.current?.files?.[0]
    const conFile = conRef.current?.files?.[0]
    if (!oppFile && !conFile) return log('업로드할 파일을 선택하세요.')
    setBusy(true)
    setLogs([])
    try {
      if (oppFile) await ingestOpportunities(oppFile, log)
      if (conFile) await ingestContracts(conFile, log)
      log('✅ 완료. 대시보드에 반영됨.')
    } catch (e) {
      log('❌ ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">주간 데이터 업로드</h2>
      <p className="text-xs text-ink-400 mb-4">
        영업기회ID 기준으로 갱신됩니다 (영업기회 → 계약 순). 전체 파일이든 주간 파일이든 중복 없이 누적·갱신.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <FileField label="영업기회 (전체)" inputRef={oppRef} />
        <FileField label="계약 (확정금액)" inputRef={conRef} />
      </div>
      <button onClick={run} disabled={busy} className="mt-4 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
        {busy ? '처리 중…' : '업로드 · 반영'}
      </button>
      {logs.length > 0 && (
        <div className="mt-4 rounded-lg bg-canvas p-3 text-xs text-ink-700 space-y-1 font-mono">
          {logs.map((l, i) => (<div key={i}>{l}</div>))}
        </div>
      )}
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

function RepPanel() {
  const [reps, setReps] = useState([])
  const [groups, setGroups] = useState([])
  const [msg, setMsg] = useState('')

  async function load() {
    const [{ data: r }, { data: g }] = await Promise.all([
      supabase.from('reps').select('id,name,group_id,photo_url,email,active').order('name'),
      supabase.from('groups').select('id,name').order('sort_order'),
    ])
    setReps(r || [])
    setGroups(g || [])
  }
  useEffect(() => { load() }, [])

  async function update(id, patch) {
    const { error } = await supabase.from('reps').update(patch).eq('id', id)
    if (error) setMsg('변경 실패: ' + error.message)
    else { setMsg('저장됨.'); load() }
  }

  async function uploadPhoto(rep, file) {
    if (!file) return
    setMsg('사진 업로드 중…')
    const ext = file.name.split('.').pop()
    const path = `${rep.id}.${ext}`
    const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: true })
    if (up.error) return setMsg(`사진 업로드 실패: ${up.error.message} (Storage에 '${PHOTO_BUCKET}' 공개 버킷 필요)`)
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
    await update(rep.id, { photo_url: data.publicUrl + '?t=' + Date.now() })
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-1">담당자 관리</h2>
      <p className="text-xs text-ink-400 mb-4">그룹 배정 · 이메일 · 얼굴 사진. (이메일은 비밀번호 재설정 발송 대상)</p>
      {msg && <p className="mb-3 text-xs text-ink-500">{msg}</p>}
      <div className="divide-y divide-line">
        {reps.map((rep) => (
          <div key={rep.id} className="py-3 flex flex-wrap items-center gap-3">
            <Thumb url={rep.photo_url} name={rep.name} />
            <span className="w-16 text-sm font-medium text-ink-900">{rep.name}</span>
            <select
              value={rep.group_id || ''}
              onChange={(e) => update(rep.id, { group_id: e.target.value || null })}
              className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-brand"
            >
              <option value="">미배정</option>
              {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
            </select>
            <input
              type="email"
              defaultValue={rep.email || ''}
              placeholder="이메일"
              onBlur={(e) => { const v = e.target.value.trim(); if (v !== (rep.email || '')) update(rep.id, { email: v || null }) }}
              className="w-56 rounded-lg border border-line px-2.5 py-1.5 text-sm focus:border-brand"
            />
            <label className="ml-auto text-xs text-brand cursor-pointer hover:underline">
              사진 변경
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPhoto(rep, e.target.files?.[0])} />
            </label>
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

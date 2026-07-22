import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function SetNewPassword() {
  const { changeOwnPassword, clearRecovery } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault(); setErr('')
    if (pw.length < 6) return setErr('비밀번호는 6자 이상이어야 합니다.')
    if (pw !== pw2) return setErr('비밀번호가 일치하지 않습니다.')
    setBusy(true)
    const { error } = await changeOwnPassword(pw)
    setBusy(false)
    if (error) return setErr('변경 실패: ' + error.message)
    clearRecovery(); nav('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-paper rounded-xl shadow-card border border-line p-6 space-y-4">
        <h1 className="text-lg font-bold text-ink-900">새 비밀번호 설정</h1>
        <p className="text-xs text-ink-500">메일 링크로 인증되었습니다. 새 비밀번호를 입력하세요.</p>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">새 비밀번호 (6자 이상)</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 mb-1">새 비밀번호 확인</label>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
        </div>
        {err && <p className="text-sm text-lost">{err}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {busy ? '변경 중…' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}

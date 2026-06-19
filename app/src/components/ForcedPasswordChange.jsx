import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function ForcedPasswordChange() {
  const { changeOwnPassword, signOut } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg('')
    if (pw === '111111') return setMsg('초기 비밀번호(111111)는 사용할 수 없습니다. 다른 비밀번호로 설정하세요.')
    if (pw.length < 6) return setMsg('비밀번호는 6자 이상이어야 합니다.')
    if (pw !== pw2) return setMsg('비밀번호가 일치하지 않습니다.')
    setBusy(true)
    const { error } = await changeOwnPassword(pw)
    setBusy(false)
    if (error) setMsg('변경 실패: ' + error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-ink-900">비밀번호 설정</h1>
        <p className="mb-6 text-sm text-ink-500">첫 로그인입니다. 사용할 비밀번호를 새로 설정하세요.</p>
        <form onSubmit={submit} className="bg-paper rounded-xl shadow-card border border-line p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">새 비밀번호</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">새 비밀번호 확인</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
          </div>
          {msg && <p className="text-sm text-lost">{msg}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? '설정 중…' : '비밀번호 설정'}
          </button>
          <button type="button" onClick={signOut} className="w-full text-center text-xs text-ink-400 hover:text-ink-700">로그아웃</button>
        </form>
      </div>
    </div>
  )
}

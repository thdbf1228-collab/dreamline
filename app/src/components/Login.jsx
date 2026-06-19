import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

const KEY = 'dl_saved_id'
const getSaved = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }

export default function Login() {
  const { signIn } = useAuth()
  const saved = getSaved()
  const [email, setEmail] = useState(saved)
  const [remember, setRemember] = useState(!!saved)
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const id = email.trim()
    const { error } = await signIn(id, pw)
    setBusy(false)
    if (error) { setErr('로그인 실패 — 아이디 또는 비밀번호를 확인하세요.'); return }
    try { remember ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY) } catch {}
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="text-xs font-medium tracking-widest text-brand">DREAMLINE</div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">영업 파이프라인</h1>
          <p className="mt-1 text-sm text-ink-500">사내 계정으로 로그인하세요.</p>
        </div>
        <form onSubmit={submit} className="bg-paper rounded-xl shadow-card border border-line p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">아이디 (이메일)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" placeholder="name@dreamline.co.kr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">비밀번호</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand" />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={(e) => { setRemember(e.target.checked); if (!e.target.checked) { try { localStorage.removeItem(KEY) } catch {} } }} className="w-4 h-4 accent-brand" />
            아이디 저장
          </label>
          {err && <p className="text-sm text-lost">{err}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? '로그인 중…' : '로그인'}
          </button>
          <p className="text-center text-[11px] text-ink-400">비밀번호 분실 시 관리자에게 초기화를 요청하세요.</p>
        </form>
      </div>
    </div>
  )
}

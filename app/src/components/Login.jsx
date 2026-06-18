import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function Login() {
  const { signIn, sendReset } = useAuth()
  const [mode, setMode] = useState('login') // login | reset
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function login(e) {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    const { error } = await signIn(email.trim(), pw)
    setBusy(false)
    if (error) setMsg('로그인 실패 — 이메일 또는 비밀번호를 확인하세요.')
  }

  async function reset(e) {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    const { error } = await sendReset(email.trim())
    setBusy(false)
    setMsg(
      error
        ? '메일 발송 실패: ' + error.message
        : '재설정 메일을 보냈습니다. 메일의 링크로 비밀번호를 새로 설정하세요. (안 오면 스팸함 확인)'
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="text-xs font-medium tracking-widest text-brand">DREAMLINE</div>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">영업 파이프라인</h1>
          <p className="mt-1 text-sm text-ink-500">
            {mode === 'login' ? '사내 계정으로 로그인하세요.' : '가입한 이메일로 재설정 링크를 보냅니다.'}
          </p>
        </div>
        <form onSubmit={mode === 'login' ? login : reset} className="bg-paper rounded-xl shadow-card border border-line p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand"
              placeholder="name@dreamline.co.kr"
            />
          </div>
          {mode === 'login' && (
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand"
              />
            </div>
          )}
          {msg && <p className={`text-sm ${msg.startsWith('재설정') ? 'text-won' : 'text-lost'}`}>{msg}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? '처리 중…' : mode === 'login' ? '로그인' : '재설정 메일 보내기'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'reset' : 'login')
              setMsg('')
            }}
            className="w-full text-center text-xs text-ink-500 hover:text-brand"
          >
            {mode === 'login' ? '비밀번호를 잊으셨나요?' : '로그인으로 돌아가기'}
          </button>
        </form>
      </div>
    </div>
  )
}

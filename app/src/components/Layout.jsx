import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const NAV = [
  { to: '/', label: '전체', end: true },
  { to: '/groups', label: '그룹별' },
  { to: '/accounts', label: '거래처별' },
  { to: '/reps', label: '담당자별' },
]

export default function Layout({ children }) {
  const { user, isAdmin, signOut } = useAuth()
  const nav = useNavigate()

  const linkClass = ({ isActive }) =>
    [
      'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-soft text-brand' : 'text-ink-500 hover:bg-canvas hover:text-ink-900',
    ].join(' ')

  return (
    <div className="min-h-screen flex bg-canvas">
      <aside className="w-56 shrink-0 border-r border-line bg-paper flex flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-[11px] font-semibold tracking-widest text-brand">DREAMLINE</div>
          <div className="text-sm font-bold text-ink-900">영업 파이프라인</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="pt-3 mt-2 border-t border-line" />
              <NavLink to="/admin" className={linkClass}>
                설정 · 업로드
              </NavLink>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="px-3 py-1 text-xs text-ink-400 truncate">{user?.email}</div>
          <div className="px-3 pb-2 text-[11px] text-ink-400">{isAdmin ? '관리자' : '뷰어'}</div>
          <button
            onClick={async () => {
              await signOut()
              nav('/')
            }}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm text-ink-700 hover:bg-canvas"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}

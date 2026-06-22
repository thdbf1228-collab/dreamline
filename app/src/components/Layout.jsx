import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const NAV = [
  { to: '/', label: '전체', end: true },
  { to: '/accounts', label: '거래처별' },
  { to: '/reps', label: '담당자별' },
  { to: '/contracts', label: '계약' },
  { to: '/activity', label: '활동' },
]

export default function Layout({ children }) {
  const { session, signOut } = useAuth()
  const nav = useNavigate()
  const logout = async () => { await signOut(); nav('/') }

  const sideClass = ({ isActive }) =>
    ['block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-soft text-brand' : 'text-ink-500 hover:bg-canvas hover:text-ink-900'].join(' ')
  const pillClass = ({ isActive }) =>
    ['shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-brand text-white' : 'bg-canvas text-ink-600'].join(' ')
  const items = [...NAV, { to: '/admin', label: '관리자' }]

  return (
    <div className="min-h-screen bg-canvas md:flex">
      <aside className="hidden md:flex w-56 shrink-0 border-r border-line bg-paper flex-col">
        <div className="px-5 py-5 border-b border-line">
          <div className="text-[11px] font-semibold tracking-widest text-brand">DREAMLINE</div>
          <div className="text-sm font-bold text-ink-900">영업 파이프라인</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={sideClass}>{n.label}</NavLink>)}
          <div className="pt-3 mt-2 border-t border-line" />
          <NavLink to="/admin" className={sideClass}>관리자</NavLink>
        </nav>
        <div className="p-3 border-t border-line">
          {session ? (
            <>
              <div className="px-3 py-1 text-xs text-ink-400 truncate">{session.user?.email}</div>
              <button onClick={logout} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink-700 hover:bg-canvas">로그아웃</button>
            </>
          ) : (
            <div className="px-3 py-1 text-[11px] text-ink-300">열람은 로그인 없이 가능</div>
          )}
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-20 bg-paper border-b border-line">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold tracking-widest text-brand">DREAMLINE</div>
            <div className="text-sm font-bold text-ink-900">영업 파이프라인</div>
          </div>
          {session && <button onClick={logout} className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-600">로그아웃</button>}
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          {items.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={pillClass}>{n.label}</NavLink>)}
        </nav>
      </header>

      <main className="flex-1 min-w-0 md:overflow-auto">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 md:py-8 overflow-x-hidden">{children}</div>
      </main>
    </div>
  )
}

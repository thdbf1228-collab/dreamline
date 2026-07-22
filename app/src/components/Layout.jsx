import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useNotice } from '../data/useNotice'

const NAV = [
  { to: '/', label: '전체', end: true },
  { to: '/weekly', label: '주간현황', badge: 'NEW' },
  { to: '/accounts', label: '파이프라인' },
  { to: '/contracts', label: '계약' },
  { to: '/activity', label: '활동' },
]

export default function Layout({ children }) {
  const { session, isAdmin, signOut } = useAuth()
  const nav = useNavigate()
  const logout = async () => { await signOut(); nav('/') }
  const notice = useNotice()
  const loc = useLocation()
  const showNotice = notice && !['/contracts', '/activity'].includes(loc.pathname)

  const sideClass = ({ isActive }) =>
    ['block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-soft text-brand' : 'text-ink-500 hover:bg-canvas hover:text-ink-900'].join(' ')
  const pillClass = ({ isActive }) =>
    ['shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-brand text-white' : 'bg-canvas text-ink-600'].join(' ')
  const items = [...NAV, ...(isAdmin ? [{ to: '/admin', label: '관리자' }] : [])]

  return (
    <div className="min-h-screen bg-canvas md:flex">
      {/* 데스크톱 사이드바 — 고정(스크롤 무관) */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-line bg-paper flex-col md:sticky md:top-0 md:h-screen">
        <div className="px-5 py-4 border-b border-line">
          <div className="text-[11px] font-semibold tracking-widest text-brand">DREAMLINE</div>
          <div className="text-sm font-bold text-ink-900">영업 파이프라인</div>
        </div>
        {session && (
          <div className="px-3 py-3 border-b border-line">
            <div className="px-1 text-xs text-ink-400 truncate mb-1">{session.user?.email}</div>
            <button onClick={logout} className="w-full rounded-lg border border-line px-3 py-1.5 text-sm text-ink-700 hover:bg-canvas">로그아웃</button>
          </div>
        )}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={sideClass}>
              {n.label}
              {n.badge && <span className="ml-2 rounded bg-lost px-1.5 py-0.5 text-[10px] font-bold text-white align-middle badge-pulse">{n.badge}</span>}
            </NavLink>
          ))}
          {isAdmin && (<>
            <div className="pt-3 mt-2 border-t border-line" />
            <NavLink to="/admin" className={sideClass}>관리자</NavLink>
          </>)}
        </nav>
      </aside>

      {/* 모바일 상단바 */}
      <header className="md:hidden sticky top-0 z-20 bg-paper border-b border-line">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold tracking-widest text-brand">DREAMLINE</div>
            <div className="text-sm font-bold text-ink-900">영업 파이프라인</div>
          </div>
          {session && <button onClick={logout} className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-600">로그아웃</button>}
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={pillClass}>
              {n.label}
              {n.badge && <span className="ml-1 rounded bg-lost px-1 text-[9px] font-bold text-white badge-pulse">{n.badge}</span>}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 md:py-8 overflow-x-hidden">
          {showNotice && (
            <div className="notice-flash mb-5 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 whitespace-pre-wrap">
              <span className="mr-2 font-bold">📢 공지</span>{notice}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}

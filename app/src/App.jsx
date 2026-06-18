import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Login from './components/Login'
import ForcedPasswordChange from './components/ForcedPasswordChange'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Groups from './pages/Groups'
import Accounts from './pages/Accounts'
import Reps from './pages/Reps'
import Monthly from './pages/Monthly'

const Admin = lazy(() => import('./pages/Admin'))

function Gate() {
  const { session, isAdmin, loading, mustChange } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-ink-400">로딩 중…</div>
  if (!session) return <Login />
  if (mustChange) return <ForcedPasswordChange />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/reps" element={<Reps />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <Suspense fallback={<div className="py-20 text-center text-sm text-ink-400">불러오는 중…</div>}>
                <Admin />
              </Suspense>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}

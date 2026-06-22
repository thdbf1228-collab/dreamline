import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import Login from './components/Login'
import ForcedPasswordChange from './components/ForcedPasswordChange'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Accounts from './pages/Accounts'
import Contracts from './pages/Contracts'
import Activity from './pages/Activity'

const Admin = lazy(() => import('./pages/Admin'))

function AdminGate() {
  const { session, isAdmin, mustChange } = useAuth()
  if (!session) return <Login />
  if (mustChange) return <ForcedPasswordChange />
  if (!isAdmin) return <Navigate to="/" replace />
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-ink-400">불러오는 중…</div>}>
      <Admin />
    </Suspense>
  )
}

function Gate() {
  const { loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-ink-400">로딩 중…</div>
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/admin" element={<AdminGate />} />
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

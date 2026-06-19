import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // {role, must_change_password}
  const [loading, setLoading] = useState(true)

  async function loadProfile(uid) {
    if (!uid) return setProfile(null)
    const { data } = await supabase.from('profiles').select('role, must_change_password').eq('id', uid).single()
    setProfile(data || { role: 'viewer', must_change_password: false })
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      loadProfile(s?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user || null,
    role: profile?.role || null,
    isAdmin: profile?.role === 'admin',
    mustChange: !!profile?.must_change_password,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    // 본인 비밀번호 변경 + 강제변경 플래그 해제
    changeOwnPassword: async (password) => {
      const res = await supabase.auth.updateUser({ password })
      if (!res.error && session?.user?.id) {
        await supabase.rpc('clear_must_change')
        await loadProfile(session.user.id)
      }
      return res
    },
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

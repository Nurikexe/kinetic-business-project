import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [coachProfile, setCoachProfile] = useState(null)
  const [loading, setLoading]         = useState(true)

  const fetchCoachProfile = async (userId) => {
    const { data } = await supabase
      .from('coaches')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    setCoachProfile(data)
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchCoachProfile(u.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchCoachProfile(u.id)
      else { setCoachProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const login = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  const refreshCoachProfile = () => user && fetchCoachProfile(user.id)

  return (
    <AuthContext.Provider value={{ user, coachProfile, loading, login, logout, refreshCoachProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

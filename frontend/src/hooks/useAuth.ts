'use client'
import { useState, useEffect } from 'react'
import { User } from '@/types'
import { loadUserFromSession, login as authLogin, logout as authLogout } from '@/lib/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(loadUserFromSession())
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authLogin(email, password)
    setUser(data.user)
    return data
  }

  const logout = () => { authLogout(); setUser(null) }

  return { user, loading, login, logout }
}

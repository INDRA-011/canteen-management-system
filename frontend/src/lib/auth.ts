import { User, AuthResponse } from '@/types'
import { setToken } from './api'
import api from './api'

let _user: User | null = null

export const getUser = () => _user

function setCookies(user: User) {
  if (typeof document === 'undefined') return
  document.cookie = 'has_session=1; path=/; SameSite=Lax'
  document.cookie = 'role=' + user.role + '; path=/; SameSite=Lax'
}

function clearCookies() {
  if (typeof document === 'undefined') return
  document.cookie = 'has_session=; path=/; max-age=0'
  document.cookie = 'role=; path=/; max-age=0'
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password })
  setToken(data.token)
  _user = data.user
  setCookies(data.user)
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('canteen_user', JSON.stringify(data.user))
    sessionStorage.setItem('canteen_token', data.token)
  }
  return data
}

export function logout() {
  setToken(null)
  _user = null
  clearCookies()
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('canteen_user')
    sessionStorage.removeItem('canteen_token')
  }
}

export function loadUserFromSession(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('canteen_user')
    const token = sessionStorage.getItem('canteen_token')
    if (raw && token) {
      _user = JSON.parse(raw)
      setToken(token)
      return _user
    }
  } catch {}
  return null
}

export function isAdmin() { return _user?.role === 'ADMIN' }
export function isStudent() { return _user?.role === 'STUDENT' }

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.user.must_change_password && data.user.role === 'STUDENT') {
        router.push('/change-password')
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else {
        router.push('/home')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#F0F2F8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: '1rem',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { background: #fff; border-radius: 20px; padding: 2.5rem 2rem; width: 100%; max-width: 400px; box-shadow: 0 4px 40px rgba(0,0,0,0.08); }
        .logo { font-family: Syne, sans-serif; font-weight: 800; font-size: 1.5rem; color: #E85D24; letter-spacing: -0.03em; }
        .tag { font-size: 0.8rem; color: #999; margin-top: 2px; margin-bottom: 2rem; }
        .bar { width: 36px; height: 4px; background: #E85D24; border-radius: 2px; margin-bottom: 1.5rem; }
        .field { margin-bottom: 1rem; }
        .field label { display: block; font-size: 0.75rem; font-weight: 500; color: #555; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .field input { width: 100%; border: 1.5px solid #E5E3DC; border-radius: 10px; padding: 0.72rem 1rem; font-size: 0.95rem; font-family: DM Sans, sans-serif; outline: none; background: #FAFAF8; transition: border-color 0.15s; }
        .field input:focus { border-color: #E85D24; }
        .btn { width: 100%; background: #E85D24; color: #fff; border: none; border-radius: 10px; padding: 0.85rem; font-size: 1rem; font-weight: 500; font-family: DM Sans, sans-serif; cursor: pointer; margin-top: 0.5rem; transition: opacity 0.15s; }
        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .err { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.85rem; color: #DC2626; margin-bottom: 1rem; }
      `}</style>
      <div className="card">
        <div className="logo">TCMIT Canteen</div>
        <div className="tag">Sign in to your account</div>
        <div className="bar" />
        {error && <div className="err">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@tcmit.edu.np" required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </main>
  )
}

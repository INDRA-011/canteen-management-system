'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { logout } from '@/lib/auth'

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.bg-photo{position:absolute;inset:0;background-image:url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80');background-size:cover;background-position:center;filter:blur(6px) brightness(0.3) saturate(1.2);transform:scale(1.05);z-index:0}
.bg-overlay{position:absolute;inset:0;background:linear-gradient(135deg,rgba(20,8,0,0.8),rgba(120,40,0,0.6),rgba(20,8,0,0.85));z-index:1}
.card{position:relative;z-index:2;width:100%;max-width:420px;background:rgba(255,255,255,0.08);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.15);border-radius:24px;padding:2.5rem 2.25rem;box-shadow:0 8px 60px rgba(0,0,0,0.5)}
.inp{width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:11px;padding:0.8rem 1rem;font-size:0.95rem;font-family:DM Sans,sans-serif;color:#fff;outline:none;transition:all 0.15s}
.inp::placeholder{color:rgba(255,255,255,0.25)}
.inp:focus{border-color:#E85D24;background:rgba(255,255,255,0.11);box-shadow:0 0 0 3px rgba(232,93,36,0.18)}
.btn{width:100%;margin-top:0.75rem;background:linear-gradient(135deg,#E85D24,#F59E0B);color:#fff;border:none;border-radius:12px;padding:0.92rem;font-size:0.97rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;box-shadow:0 4px 20px rgba(232,93,36,0.4);transition:opacity 0.15s,transform 0.1s}
.btn:hover{opacity:0.9;transform:translateY(-1px)}
.btn:disabled{opacity:0.45;cursor:not-allowed;transform:none}
`

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) { setError('Passwords do not match'); return }
    if (form.new_password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(''); setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setSuccess(true)
      // CRITICAL: clear old token (has must_change_password=true baked in)
      // Force fresh login so they get a new token with must_change_password=false
      setTimeout(() => {
        logout()
        router.push('/login')
      }, 2000)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to change password')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{GS}</style>
      <main style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: '1rem', overflow: 'hidden' }}>
        <div className='bg-photo' />
        <div className='bg-overlay' />
        <div className='card'>
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: '0.5rem' }}>Password Updated!</h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>Redirecting you to login with your new password…</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#FCD34D', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔐 <span>First login — please set a new password to continue</span>
              </div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.65rem', color: '#fff', marginBottom: '0.25rem', letterSpacing: '-0.03em' }}>Set your password</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>Current password is your College ID</p>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, padding: '0.65rem 0.9rem', fontSize: '0.84rem', color: '#FCA5A5', marginBottom: '1rem' }}>⚠️ {error}</div>
              )}
              <form onSubmit={submit}>
                {[
                  { label: 'Current Password', key: 'current_password', ph: 'Your College ID' },
                  { label: 'New Password', key: 'new_password', ph: 'Minimum 8 characters' },
                  { label: 'Confirm New Password', key: 'confirm_password', ph: 'Repeat new password' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>{f.label}</label>
                    <input type='password' className='inp' placeholder={f.ph} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} required />
                  </div>
                ))}
                <button type='submit' className='btn' disabled={loading}>
                  {loading ? 'Saving…' : 'Set Password & Continue →'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  )
}

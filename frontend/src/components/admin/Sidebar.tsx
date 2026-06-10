'use client'
import { useRouter, usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

const NAV = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '◈' },
  { label: 'Orders',    href: '/admin/orders',    icon: '🧾' },
  { label: 'Menu',      href: '/admin/menu',      icon: '🍱' },
  { label: 'Students',  href: '/admin/students',  icon: '👥' },
  { label: 'Settings',  href: '/admin/settings',  icon: '⚙️' },
  { label: 'Reports',   href: '/admin/reports',   icon: '📊' },
]

export default function AdminSidebar() {
  const router   = useRouter()
  const pathname = usePathname()

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <aside style={{
        width: 230, minHeight: '100vh',
        background: 'linear-gradient(180deg, #0D1535 0%, #1a0a02 100%)',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 0',
        fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
        borderRight: '1px solid rgba(232,93,36,0.15)',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #E85D24, #F59E0B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#fff',
              boxShadow: '0 4px 12px rgba(232,93,36,0.4)',
            }}>TC</div>
            <div>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem',
                background: 'linear-gradient(90deg, #fff, #F59E0B)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>TCMIT Canteen</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <button key={item.href} onClick={() => router.push(item.href)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left',
                padding: '0.72rem 1.5rem', border: 'none', cursor: 'pointer',
                background: active ? 'linear-gradient(90deg, rgba(232,93,36,0.2), rgba(245,158,11,0.08))' : 'transparent',
                color: active ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                fontFamily: 'DM Sans, sans-serif',
                borderLeft: active ? '3px solid #E85D24' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if(!active)(e.currentTarget.style.color='rgba(255,255,255,0.8)') }}
              onMouseLeave={e => { if(!active)(e.currentTarget.style.color='rgba(255,255,255,0.5)') }}
              >
                <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '0 1rem' }}>
          <button onClick={() => { logout(); router.push('/login') }} style={{
            width: '100%', padding: '0.65rem 1rem',
            border: '1px solid rgba(232,93,36,0.25)',
            borderRadius: 10, background: 'rgba(232,93,36,0.08)',
            color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem',
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(232,93,36,0.18)'; e.currentTarget.style.color='#F59E0B' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(232,93,36,0.08)'; e.currentTarget.style.color='rgba(255,255,255,0.5)' }}
          >
            🚪 Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

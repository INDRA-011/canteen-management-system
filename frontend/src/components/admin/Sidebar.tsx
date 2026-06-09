'use client'
import { useRouter, usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

const NAV = [
  { label: 'Dashboard',  href: '/admin/dashboard' },
  { label: 'Orders',     href: '/admin/orders'    },
  { label: 'Menu',       href: '/admin/menu'      },
  { label: 'Students',   href: '/admin/students'  },
  { label: 'Settings',   href: '/admin/settings'  },
  { label: 'Reports',    href: '/admin/reports'   },
]

export default function AdminSidebar() {
  const router   = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#0D1535',
      display: 'flex', flexDirection: 'column', padding: '1.5rem 0',
      fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
    }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem' }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem',
          background: 'linear-gradient(90deg, #fff, #D4187C)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>TCMIT Canteen</div>
        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: 2 }}>Admin Portal</div>
      </div>

      <nav style={{ flex: 1 }}>
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <button key={item.href} onClick={() => router.push(item.href)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '0.7rem 1.5rem', border: 'none', cursor: 'pointer',
              background: active ? 'linear-gradient(90deg, #1B2A6B, #D4187C)' : 'transparent',
              color: active ? '#fff' : '#8899BB',
              fontSize: '0.88rem', fontWeight: active ? 500 : 400,
              fontFamily: 'DM Sans, sans-serif',
              borderLeft: active ? '3px solid #D4187C' : '3px solid transparent',
              transition: 'all 0.15s',
            }}>
              {item.label}
            </button>
          )
        })}
      </nav>

      <button onClick={handleLogout} style={{
        margin: '0 1rem', padding: '0.65rem 1rem', border: '1px solid #1B2A6B',
        borderRadius: 8, background: 'transparent', color: '#8899BB',
        fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
      }}>
        Sign out
      </button>
    </aside>
  )
}

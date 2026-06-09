'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { loadUserFromSession } from '@/lib/auth'
import AdminSidebar from '@/components/admin/Sidebar'
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    const user = loadUserFromSession()
    if (!user || user.role !== 'ADMIN') router.push('/login')
  }, [pathname])
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F2F8', fontFamily: 'DM Sans, sans-serif' }}>
      <AdminSidebar />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>{children}</main>
    </div>
  )
}

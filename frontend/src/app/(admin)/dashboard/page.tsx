'use client'
import { useEffect, useState } from 'react'
import { loadUserFromSession } from '@/lib/auth'
import api from '@/lib/api'

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', CONFIRMED: '#1B2A6B', PREPARING: '#7C3AED',
  READY: '#1D9E75', COLLECTED: '#6B7280', CANCELLED: '#EF4444',
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const user = typeof window !== 'undefined' ? loadUserFromSession() : null

  useEffect(() => {
    api.get('/orders').then(r => { setOrders(r.data?.orders || []); setLoading(false) }).catch(() => setLoading(false))
    const id = setInterval(() => {
      api.get('/orders').then(r => setOrders(r.data?.orders || [])).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const today = orders.filter(o => new Date(o.placed_at).toDateString() === new Date().toDateString())
  const pending = today.filter(o => o.status === 'PENDING').length
  const revenue = today.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
  const active = today.filter(o => !['COLLECTED','CANCELLED'].includes(o.status))

  return (
    <div style={{ padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');`}</style>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: '#1B2A6B', marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>Welcome back{user ? ', ' + user.name : ''}. Here is today at a glance.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: "Today's Orders", value: today.length, color: '#1B2A6B' },
          { label: 'Pending', value: pending, color: '#F59E0B' },
          { label: 'Revenue', value: 'Rs ' + revenue.toFixed(0), color: '#1D9E75' },
          { label: 'Active', value: active.length, color: '#7C3AED' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', flex: '1 1 160px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '0.72rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '2rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #F0F2F8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#1B2A6B' }}>Live Order Queue</div>
          <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Auto-refreshes every 10s</div>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>Loading orders…</div>
        ) : active.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa' }}>No active orders right now</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F9FB' }}>
                {['Token', 'Student', 'Pickup', 'Items', 'Amount', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.sort((a: any, b: any) => a.pickup_time?.localeCompare(b.pickup_time)).map((o: any) => (
                <tr key={o.id} style={{ borderTop: '1px solid #F0F2F8' }}>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#1B2A6B', fontSize: '1.1rem' }}>#{o.token_number}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#333' }}>{o.user?.name || 'Student'}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#555', fontWeight: 500 }}>{o.pickup_time}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#777' }}>{o.items?.length || 0} item(s)</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', color: '#333' }}>Rs {o.total_amount}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ background: STATUS_COLOR[o.status] + '18', color: STATUS_COLOR[o.status], borderRadius: 6, padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

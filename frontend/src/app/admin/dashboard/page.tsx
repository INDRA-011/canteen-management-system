'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadUserFromSession } from '@/lib/auth'
import api from '@/lib/api'

const SC: Record<string,{bg:string;color:string}> = {
  PENDING:   {bg:'rgba(245,158,11,0.15)',  color:'#F59E0B'},
  CONFIRMED: {bg:'rgba(232,93,36,0.15)',   color:'#E85D24'},
  PREPARING: {bg:'rgba(124,58,237,0.15)',  color:'#A78BFA'},
  READY:     {bg:'rgba(29,158,117,0.15)',  color:'#34D399'},
  COLLECTED: {bg:'rgba(107,114,128,0.15)', color:'#9CA3AF'},
  CANCELLED: {bg:'rgba(239,68,68,0.15)',   color:'#F87171'},
}

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.kcard{position:relative;overflow:hidden;border-radius:16px;padding:1.5rem;border:1px solid rgba(255,255,255,0.08);transition:transform 0.2s,box-shadow 0.2s}
.kcard:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.3)}
.kcard::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0));pointer-events:none}
.tr{transition:background 0.15s}
.tr:hover{background:rgba(232,93,36,0.06)!important}
`

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [kpi, setKpi] = useState({orders:0,pending:0,revenue:0,cancelled:0})
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    const u = loadUserFromSession()
    if (!u) { router.push('/login'); return }
    setUser(u)
    fetchData()
    const t = setInterval(fetchData, 10000)
    return () => clearInterval(t)
  }, [])

  async function fetchData() {
    try {
      const [k, o] = await Promise.all([api.get('/admin/dashboard'), api.get('/admin/orders')])
      setKpi(k.data)
      setOrders(Array.isArray(o.data?.orders) ? o.data.orders : Array.isArray(o.data) ? o.data : [])
      setLastUpdated(new Date().toLocaleTimeString('en-NP',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  const KPI = [
    { label: "Today's Orders", value: kpi.orders,    icon: '🧾', grad: 'linear-gradient(135deg,#1a1a2e,#16213e)', accent: '#E85D24' },
    { label: 'Pending',        value: kpi.pending,   icon: '⏳', grad: 'linear-gradient(135deg,#1a1200,#2a1e00)', accent: '#F59E0B' },
    { label: 'Revenue',        value: `Rs ${Number(kpi.revenue).toLocaleString()}`, icon: '💰', grad: 'linear-gradient(135deg,#001a12,#002a1e)', accent: '#34D399' },
    { label: 'Cancelled',      value: kpi.cancelled, icon: '❌', grad: 'linear-gradient(135deg,#1a0505,#2a0808)', accent: '#F87171' },
  ]

  return (
    <>
      <style>{GS}</style>
      <div style={{padding:'2rem',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#0a0a0f'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',margin:0,letterSpacing:'-0.03em',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              Dashboard
            </h1>
            <p style={{color:'rgba(255,255,255,0.4)',margin:'0.3rem 0 0',fontSize:'0.9rem'}}>
              Welcome back, {user?.name ?? 'Admin'} 👋
            </p>
          </div>
          <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'0.5rem 1rem',fontSize:'0.78rem',color:'rgba(255,255,255,0.4)'}}>
            {loading ? 'Updating…' : `Updated ${lastUpdated}`}
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
          {KPI.map(c => (
            <div key={c.label} className='kcard' style={{background:c.grad}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1rem'}}>
                <div style={{fontSize:'0.68rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{c.label}</div>
                <span style={{fontSize:'1.25rem'}}>{c.icon}</span>
              </div>
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2.2rem',color:c.accent,lineHeight:1}}>
                {loading ? <span style={{opacity:0.3}}>—</span> : c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Live Queue */}
        <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden',backdropFilter:'blur(10px)'}}>
          <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#fff',margin:0}}>Live Order Queue</h2>
            <span style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',background:'rgba(232,93,36,0.1)',border:'1px solid rgba(232,93,36,0.2)',padding:'3px 10px',borderRadius:20}}>↻ 10s</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
              <thead>
                <tr style={{background:'rgba(255,255,255,0.03)'}}>
                  {['Token','Student','College ID','Items','Amount','Pickup','Status'].map(h=>(
                    <th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{padding:'3rem',textAlign:'center',color:'rgba(255,255,255,0.2)'}}>Loading orders…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} style={{padding:'3rem',textAlign:'center'}}>
                    <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>🍽️</div>
                    <div style={{color:'rgba(255,255,255,0.3)',fontSize:'0.9rem'}}>No orders today yet</div>
                  </td></tr>
                ) : orders.map((o:any,i:number) => {
                  const s = SC[o.status] ?? SC.PENDING
                  return (
                    <tr key={o.id??i} className='tr' style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'0.9rem 1rem',fontFamily:'Syne,sans-serif',fontWeight:800,color:'#E85D24',fontSize:'1rem'}}>
                        #{String(o.token_number??0).padStart(3,'0')}
                      </td>
                      <td style={{padding:'0.9rem 1rem',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{o.student_name??'—'}</td>
                      <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.4)',fontSize:'0.78rem',fontFamily:'monospace'}}>{o.college_id??'—'}</td>
                      <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.6)'}}>{o.item_count??o.items?.length??'—'}</td>
                      <td style={{padding:'0.9rem 1rem',fontWeight:600,color:'#F59E0B'}}>Rs {Number(o.total_amount??0).toLocaleString()}</td>
                      <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>{o.pickup_time??'—'}</td>
                      <td style={{padding:'0.9rem 1rem'}}>
                        <span style={{background:s.bg,color:s.color,borderRadius:6,padding:'0.25rem 0.7rem',fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.04em',border:`1px solid ${s.color}30`}}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

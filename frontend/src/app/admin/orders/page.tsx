'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

const SC: Record<string,{bg:string;color:string}> = {
  PENDING:   {bg:'rgba(245,158,11,0.15)',  color:'#F59E0B'},
  CONFIRMED: {bg:'rgba(232,93,36,0.15)',   color:'#E85D24'},
  PREPARING: {bg:'rgba(124,58,237,0.15)',  color:'#A78BFA'},
  READY:     {bg:'rgba(29,158,117,0.15)',  color:'#34D399'},
  COLLECTED: {bg:'rgba(107,114,128,0.15)', color:'#9CA3AF'},
  CANCELLED: {bg:'rgba(239,68,68,0.15)',   color:'#F87171'},
}
const NEXT: Record<string,{label:string;color:string;bg:string}[]> = {
  PENDING:   [{label:'Confirm',bg:'#E85D24',color:'#fff'},{label:'Cancel',bg:'rgba(239,68,68,0.2)',color:'#F87171'}],
  CONFIRMED: [{label:'Preparing',bg:'rgba(124,58,237,0.3)',color:'#A78BFA'}],
  PREPARING: [{label:'Ready',bg:'rgba(29,158,117,0.3)',color:'#34D399'}],
  READY:     [{label:'Collected',bg:'rgba(107,114,128,0.2)',color:'#9CA3AF'}],
}
const ACTION_STATUS: Record<string,string> = {Confirm:'CONFIRMED',Cancel:'CANCELLED',Preparing:'PREPARING',Ready:'READY',Collected:'COLLECTED'}

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.filt{padding:0.4rem 1rem;border-radius:20px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;transition:all 0.15s;border:1px solid}
.tr:hover{background:rgba(232,93,36,0.06)!important}
.abtn{padding:0.3rem 0.8rem;border-radius:7px;border:1px solid transparent;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;transition:all 0.15s}
.abtn:hover{filter:brightness(1.2)}
`

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [updating, setUpdating] = useState<number|null>(null)

  useEffect(()=>{ fetchOrders() },[])

  async function fetchOrders() {
    try {
      const r = await api.get('/admin/orders')
      const data = r.data?.orders ?? r.data
      setOrders(Array.isArray(data) ? data : [])
    } catch(e){ console.error(e) } finally{ setLoading(false) }
  }

  async function updateStatus(id:number, status:string) {
    setUpdating(id)
    try { await api.patch(`/admin/orders/${id}/status`,{status}); await fetchOrders() }
    catch(e){ console.error(e) } finally{ setUpdating(null) }
  }

  const statuses = ['ALL','PENDING','CONFIRMED','PREPARING','READY','COLLECTED','CANCELLED']
  const filtered = filter==='ALL' ? orders : orders.filter(o=>o.status===filter)

  return (
    <>
      <style>{GS}</style>
      <div style={{padding:'2rem',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#0a0a0f'}}>
        <div style={{marginBottom:'1.75rem'}}>
          <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',margin:0,letterSpacing:'-0.03em',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Orders</h1>
          <p style={{color:'rgba(255,255,255,0.4)',margin:'0.3rem 0 0',fontSize:'0.9rem'}}>{orders.length} total</p>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:'1.5rem',flexWrap:'wrap'}}>
          {statuses.map(s => {
            const active = filter===s
            const sc = SC[s]
            return (
              <button key={s} className='filt' onClick={()=>setFilter(s)} style={{
                background: active ? (sc?.bg ?? 'rgba(232,93,36,0.2)') : 'rgba(255,255,255,0.04)',
                color: active ? (sc?.color ?? '#E85D24') : 'rgba(255,255,255,0.4)',
                borderColor: active ? (sc?.color+'40' ?? 'rgba(232,93,36,0.3)') : 'rgba(255,255,255,0.08)',
              }}>{s}</button>
            )
          })}
        </div>

        <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
              <thead>
                <tr style={{background:'rgba(255,255,255,0.03)'}}>
                  {['Token','Student','Pickup','Items','Amount','Status','Actions'].map(h=>(
                    <th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{padding:'3rem',textAlign:'center',color:'rgba(255,255,255,0.2)'}}>Loading…</td></tr>
                ) : filtered.length===0 ? (
                  <tr><td colSpan={7} style={{padding:'3rem',textAlign:'center'}}>
                    <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>📭</div>
                    <div style={{color:'rgba(255,255,255,0.3)'}}>No {filter==='ALL'?'':''+filter.toLowerCase()+' '}orders</div>
                  </td></tr>
                ) : filtered.map((o:any,i:number)=>{
                  const s=SC[o.status]??SC.PENDING
                  const actions=NEXT[o.status]??[]
                  return (
                    <tr key={o.id??i} className='tr' style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'0.9rem 1rem',fontFamily:'Syne,sans-serif',fontWeight:800,color:'#E85D24',fontSize:'1rem'}}>#{String(o.token_number??0).padStart(3,'0')}</td>
                      <td style={{padding:'0.9rem 1rem'}}>
                        <div style={{fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{o.student_name??'—'}</div>
                        <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.3)',fontFamily:'monospace'}}>{o.college_id??''}</div>
                      </td>
                      <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>{o.pickup_time??'—'}</td>
                      <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.6)'}}>{o.item_count??o.items?.length??'—'}</td>
                      <td style={{padding:'0.9rem 1rem',fontWeight:600,color:'#F59E0B'}}>Rs {Number(o.total_amount??0).toLocaleString()}</td>
                      <td style={{padding:'0.9rem 1rem'}}>
                        <span style={{background:s.bg,color:s.color,borderRadius:6,padding:'0.25rem 0.7rem',fontSize:'0.7rem',fontWeight:700,border:`1px solid ${s.color}30`}}>{o.status}</span>
                      </td>
                      <td style={{padding:'0.9rem 1rem'}}>
                        <div style={{display:'flex',gap:6}}>
                          {actions.map(a=>(
                            <button key={a.label} className='abtn' disabled={updating===o.id}
                              onClick={()=>updateStatus(o.id,ACTION_STATUS[a.label])}
                              style={{background:a.bg,color:a.color,borderColor:`${a.color}30`,opacity:updating===o.id?0.5:1}}>
                              {updating===o.id?'…':a.label}
                            </button>
                          ))}
                        </div>
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

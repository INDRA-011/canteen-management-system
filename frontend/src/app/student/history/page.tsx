'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const SC: Record<string,{bg:string;color:string}> = {
  PENDING:   {bg:'#F59E0B18',color:'#B45309'},
  CONFIRMED: {bg:'#1B2A6B18',color:'#1B2A6B'},
  PREPARING: {bg:'#7C3AED18',color:'#6D28D9'},
  READY:     {bg:'#1D9E7518',color:'#0F6E56'},
  COLLECTED: {bg:'#6B728018',color:'#4B5563'},
  CANCELLED: {bg:'#EF444418',color:'#B91C1C'},
}

export default function HistoryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)

  useEffect(()=>{
    api.get('/orders/history').then(r=>setOrders(r.data?.orders??r.data??[])).catch(console.error).finally(()=>setLoading(false))
  },[])

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{minHeight:'100vh',background:'#F0F2F8',fontFamily:'DM Sans,sans-serif'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>router.push('/student/home')} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#6B7280'}}>←</button>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#1B2A6B'}}>Order History</div>
        </div>

        <div style={{padding:'1.25rem'}}>
          {loading ? <p style={{textAlign:'center',color:'#9CA3AF',padding:'3rem'}}>Loading…</p>
          : orders.length===0 ? (
            <div style={{textAlign:'center',padding:'4rem',color:'#9CA3AF'}}>
              <div style={{fontSize:'3rem',marginBottom:'1rem'}}>📋</div>
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#6B7280'}}>No orders yet</div>
            </div>
          ) : orders.map((o:any,i:number)=>{
            const s=SC[o.status]??SC.COLLECTED
            const isExp=expanded===o.id
            return (
              <div key={o.id??i} style={{background:'#fff',borderRadius:14,marginBottom:'0.875rem',border:'1px solid #F0F2F8',overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
                <div onClick={()=>setExpanded(isExp?null:o.id)} style={{padding:'1rem 1.25rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
                    <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#1B2A6B',flexShrink:0}}>#{String(o.token_number??0).padStart(3,'0')}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:'0.82rem',color:'#9CA3AF',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {o.created_at?new Date(o.created_at).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):''}
                      </div>
                      <div style={{fontSize:'0.88rem',color:'#374151',fontWeight:500}}>{o.item_count??o.items?.length??0} items · Rs {Number(o.total_amount??0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <span style={{background:s.bg,color:s.color,borderRadius:6,padding:'0.22rem 0.6rem',fontSize:'0.7rem',fontWeight:700}}>{o.status}</span>
                    <span style={{color:'#9CA3AF',fontSize:'0.85rem'}}>{isExp?'▲':'▼'}</span>
                  </div>
                </div>
                {isExp && (
                  <div style={{padding:'0 1.25rem 1.25rem',borderTop:'1px solid #F9FAFB'}}>
                    {o.items?.map((item:any,j:number)=>(
                      <div key={j} style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',color:'#6B7280',padding:'0.4rem 0',borderBottom:'1px solid #F9FAFB'}}>
                        <span>{item.name} × {item.quantity}</span>
                        <span style={{fontWeight:600,color:'#374151'}}>Rs {(item.price*item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.75rem'}}>
                      <span style={{fontSize:'0.8rem',color:'#9CA3AF'}}>Payment: {o.payment_method??'—'}</span>
                      <span style={{fontSize:'0.8rem',color:'#9CA3AF'}}>Pickup: {o.pickup_time??'—'}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { OrderStatus } from '@/types'

const SC: Record<OrderStatus,{bg:string;color:string;border:string}> = {
  PENDING:   {bg:'rgba(245,158,11,0.12)',  color:'#F59E0B', border:'rgba(245,158,11,0.25)'},
  CONFIRMED: {bg:'rgba(232,93,36,0.12)',   color:'#E85D24', border:'rgba(232,93,36,0.25)'},
  PREPARING: {bg:'rgba(124,58,237,0.12)',  color:'#A78BFA', border:'rgba(124,58,237,0.25)'},
  READY:     {bg:'rgba(29,158,117,0.12)',  color:'#34D399', border:'rgba(29,158,117,0.25)'},
  COLLECTED: {bg:'rgba(107,114,128,0.1)',  color:'#9CA3AF', border:'rgba(107,114,128,0.2)'},
  CANCELLED: {bg:'rgba(239,68,68,0.1)',    color:'#F87171', border:'rgba(239,68,68,0.2)'},
}

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.ocard{background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;margin-bottom:0.875rem;animation:fadeIn 0.3s ease both;transition:border-color 0.2s}
.ocard:hover{border-color:rgba(232,93,36,0.2)}
.skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}
`

export default function HistoryPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number|null>(null)

  useEffect(() => {
    api.get('/orders/history')
      .then(r => { const d=r.data?.orders??r.data??[]; setOrders(Array.isArray(d)?d:[]) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:'100vh',background:'#0a0a0f',fontFamily:'DM Sans,sans-serif'}}>
        <div style={{background:'rgba(10,10,15,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(232,93,36,0.15)',padding:'0.9rem 1.25rem',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>router.push('/student/home')} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.6)',fontSize:'1rem'}}>←</button>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.05rem',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Order History</div>
          <div style={{marginLeft:'auto',fontSize:'0.8rem',color:'rgba(255,255,255,0.3)'}}>{orders.length} orders</div>
        </div>

        <div style={{padding:'1.25rem'}}>
          {loading && [...Array(4)].map((_,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:'1rem 1.25rem',marginBottom:'0.875rem',display:'flex',alignItems:'center',gap:12}}>
              <div className='skeleton' style={{width:44,height:44,borderRadius:10,flexShrink:0}}/>
              <div style={{flex:1}}><div className='skeleton' style={{height:14,width:'40%',marginBottom:8}}/><div className='skeleton' style={{height:12,width:'65%'}}/></div>
              <div className='skeleton' style={{height:24,width:72,borderRadius:6}}/>
            </div>
          ))}

          {!loading && orders.length===0 && (
            <div style={{textAlign:'center',padding:'5rem 1rem'}}>
              <div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>📋</div>
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.2rem',color:'rgba(255,255,255,0.5)',marginBottom:'0.5rem'}}>No orders yet</div>
              <div style={{color:'rgba(255,255,255,0.25)',fontSize:'0.9rem',marginBottom:'1.5rem'}}>Your order history will appear here</div>
              <button onClick={()=>router.push('/student/home')} style={{background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:12,padding:'0.75rem 1.5rem',fontSize:'0.9rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Browse Menu</button>
            </div>
          )}

          {!loading && orders.map((o:any,i:number) => {
            const s=SC[o.status as OrderStatus]??SC.COLLECTED
            const isExp=expanded===o.id
            const date=o.placed_at?new Date(o.placed_at).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric'}):'—'
            const time=o.placed_at?new Date(o.placed_at).toLocaleTimeString('en-NP',{hour:'2-digit',minute:'2-digit'}):''
            return (
              <div key={o.id??i} className='ocard' style={{animationDelay:`${i*0.04}s`}}>
                <div style={{padding:'1rem 1.25rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}} onClick={()=>setExpanded(isExp?null:o.id)}>
                  <div style={{width:44,height:44,borderRadius:10,background:'rgba(232,93,36,0.12)',border:'1px solid rgba(232,93,36,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'0.82rem',color:'#E85D24'}}>#{String(o.token_number??0).padStart(3,'0')}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.85)',fontWeight:500,marginBottom:'0.2rem'}}>
                      {o.item_count??o.items?.length??'?'} items · <span style={{color:'#F59E0B',fontFamily:'Syne,sans-serif',fontWeight:700}}>Rs {Number(o.total_amount??0).toLocaleString()}</span>
                    </div>
                    <div style={{fontSize:'0.74rem',color:'rgba(255,255,255,0.3)'}}>{date} {time} · Pickup {o.pickup_time??'—'}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <span style={{background:s.bg,color:s.color,borderRadius:6,padding:'0.22rem 0.6rem',fontSize:'0.68rem',fontWeight:700,border:`1px solid ${s.border}`,whiteSpace:'nowrap'}}>{o.status}</span>
                    <span style={{color:'rgba(255,255,255,0.2)',fontSize:'0.75rem',transition:'transform 0.2s',display:'inline-block',transform:isExp?'rotate(180deg)':'none'}}>▼</span>
                  </div>
                </div>
                {isExp && (
                  <div style={{padding:'0 1.25rem 1.25rem',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                    <div style={{paddingTop:'0.9rem'}}>
                      {Array.isArray(o.items)&&o.items.length>0 ? (
                        <>
                          {o.items.map((item:any,j:number)=>(
                            <div key={j} style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',padding:'0.4rem 0',borderBottom:j<o.items.length-1?'1px solid rgba(255,255,255,0.04)':'none'}}>
                              <span style={{color:'rgba(255,255,255,0.55)'}}>{item.name??item.item_name} × {item.quantity}</span>
                              <span style={{color:'#F59E0B',fontWeight:600}}>Rs {(Number(item.unit_price??item.price??0)*item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                            <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.3)'}}>Payment: {o.payment_method??'—'}</span>
                            <span style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.3)'}}>Type: {o.order_type}</span>
                          </div>
                        </>
                      ):(
                        <div style={{color:'rgba(255,255,255,0.25)',fontSize:'0.85rem',paddingTop:'0.5rem'}}>No item details available</div>
                      )}
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

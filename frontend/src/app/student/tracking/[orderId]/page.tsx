'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'

const STEPS = [
  { key:'PENDING',   label:'Order Placed',       icon:'📋', desc:'We received your order' },
  { key:'CONFIRMED', label:'Confirmed',           icon:'✅', desc:'Payment verified' },
  { key:'PREPARING', label:'Preparing',           icon:'👨‍🍳', desc:'Kitchen is cooking' },
  { key:'READY',     label:'Ready for Pickup',    icon:'🔔', desc:'Go to the counter now!' },
  { key:'COLLECTED', label:'Collected',           icon:'🎉', desc:'Enjoy your meal!' },
]

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(0.97)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(232,93,36,0.4)}50%{box-shadow:0 0 40px rgba(245,158,11,0.6)}}

.token-num{
  font-family:Syne,sans-serif;font-weight:800;
  font-size:6rem;line-height:1;letter-spacing:-0.04em;
  background:linear-gradient(135deg,#E85D24,#F59E0B);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:glow 2s ease-in-out infinite;
}
.token-num.ready{
  background:linear-gradient(135deg,#F59E0B,#FCD34D);
  animation:pulse 1s ease-in-out infinite;
}

.step-row{display:flex;align-items:center;gap:14px;padding:0.9rem 0;animation:fadeIn 0.3s ease both}
.step-icon{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;transition:all 0.3s}
.step-icon.done{background:rgba(29,158,117,0.2);border:2px solid rgba(29,158,117,0.4)}
.step-icon.active{background:rgba(232,93,36,0.2);border:2px solid #E85D24;animation:pulse 1.5s ease-in-out infinite}
.step-icon.future{background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.08)}
.step-icon.cancelled{background:rgba(239,68,68,0.15);border:2px solid rgba(239,68,68,0.3)}

.connector{width:2px;height:24px;margin-left:19px;border-radius:1px;transition:background 0.3s}
.connector.done{background:rgba(29,158,117,0.4)}
.connector.future{background:rgba(255,255,255,0.06)}

.ready-banner{
  background:linear-gradient(135deg,rgba(232,93,36,0.2),rgba(245,158,11,0.15));
  border:1px solid rgba(245,158,11,0.3);
  border-radius:14px;padding:1rem 1.25rem;
  text-align:center;animation:pulse 1.5s ease-in-out infinite;
}
`

export default function TrackingPage() {
  const router = useRouter()
  const { orderId } = useParams<{orderId:string}>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout|null>(null)

  useEffect(() => {
    fetchOrder()
    intervalRef.current = setInterval(fetchOrder, 5000)
    return () => { if(intervalRef.current) clearInterval(intervalRef.current) }
  }, [orderId])

  async function fetchOrder() {
    try {
      const r = await api.get('/orders/my')
      const orders = r.data?.orders ?? r.data ?? []
      const found = Array.isArray(orders) ? orders.find((o:any) => String(o.id) === String(orderId)) : null
      if (found) {
        setOrder(found)
        if (found.status === 'COLLECTED' || found.status === 'CANCELLED') {
          if(intervalRef.current) clearInterval(intervalRef.current)
        }
      }
    } catch(e){ console.error(e) }
    finally { setLoading(false) }
  }

  const stepIdx = order ? STEPS.findIndex(s => s.key === order.status) : 0
  const isCancelled = order?.status === 'CANCELLED'
  const isReady = order?.status === 'READY'

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.3)',fontFamily:'DM Sans,sans-serif'}}>
      Loading order…
    </div>
  )

  return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:'100vh',background:'radial-gradient(ellipse at top,#1a0a02 0%,#0a0a0f 50%)',fontFamily:'DM Sans,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
        <div style={{width:'100%',maxWidth:400}}>

          {/* Token */}
          <div style={{textAlign:'center',marginBottom:'2rem'}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:'0.5rem'}}>Your Token Number</div>
            <div className={`token-num${isReady?' ready':''}`}>
              #{String(order?.token_number??'???').padStart(3,'0')}
            </div>
            {isCancelled && (
              <div style={{marginTop:'0.75rem',background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,padding:'0.5rem 1rem',display:'inline-block',fontSize:'0.85rem',color:'#F87171',fontWeight:600}}>
                Order Cancelled
              </div>
            )}
          </div>

          {/* Ready Banner */}
          {isReady && (
            <div className='ready-banner' style={{marginBottom:'1.5rem'}}>
              <div style={{fontSize:'1.5rem',marginBottom:'0.3rem'}}>🔔</div>
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#F59E0B',marginBottom:'0.2rem'}}>Your order is ready!</div>
              <div style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.5)'}}>Please go to the counter now</div>
            </div>
          )}

          {/* Steps */}
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)',padding:'1.25rem',marginBottom:'1.25rem'}}>
            {STEPS.map((step, i) => {
              const done = !isCancelled && stepIdx > i
              const active = !isCancelled && stepIdx === i
              const iconClass = isCancelled ? 'cancelled' : done ? 'done' : active ? 'active' : 'future'
              const isLast = i === STEPS.length - 1
              return (
                <div key={step.key}>
                  <div className='step-row' style={{animationDelay:`${i*0.05}s`}}>
                    <div className={`step-icon ${iconClass}`}>
                      {done ? '✓' : step.icon}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:active?700:500,fontSize:'0.9rem',color:done||active?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.3)',transition:'color 0.3s'}}>{step.label}</div>
                      {active && <div style={{fontSize:'0.75rem',color:'#E85D24',marginTop:2}}>{step.desc}</div>}
                    </div>
                    {done && <span style={{fontSize:'0.7rem',color:'#34D399',fontWeight:600}}>Done</span>}
                  </div>
                  {!isLast && <div className={`connector ${done?'done':'future'}`}/>}
                </div>
              )
            })}
          </div>

          {/* Items */}
          {Array.isArray(order?.items) && order.items.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.03)',borderRadius:14,border:'1px solid rgba(255,255,255,0.06)',padding:'1rem',marginBottom:'1rem'}}>
              {order.items.map((item:any,i:number) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',color:'rgba(255,255,255,0.5)',padding:'0.3rem 0',borderBottom:i<order.items.length-1?'1px solid rgba(255,255,255,0.04)':'none'}}>
                  <span>{item.item_name ?? item.name} × {item.quantity}</span>
                  <span style={{color:'#F59E0B',fontWeight:600}}>Rs {(Number(item.unit_price??item.price??0)*item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{fontWeight:600,color:'rgba(255,255,255,0.6)',fontSize:'0.85rem'}}>Total</span>
                <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,color:'#F59E0B'}}>Rs {Number(order.total_amount??0).toLocaleString()}</span>
              </div>
            </div>
          )}

          <p style={{textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:'0.72rem',marginBottom:'1.25rem'}}>
            🔄 Auto-updates every 5 seconds · Show this screen at the counter
          </p>

          <button onClick={()=>router.push('/student/home')} style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'0.8rem',fontSize:'0.88rem',cursor:'pointer',color:'rgba(255,255,255,0.35)',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s'}}>
            ← Back to Menu
          </button>
        </div>
      </div>
    </>
  )
}

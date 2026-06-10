'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'

const STEPS = ['PENDING','CONFIRMED','PREPARING','READY','COLLECTED']
const STEP_LABELS: Record<string,string> = {PENDING:'Order Placed',CONFIRMED:'Confirmed',PREPARING:'Preparing',READY:'Ready for Pickup!',COLLECTED:'Collected'}

export default function TrackingPage() {
  const router = useRouter()
  const { orderId } = useParams<{orderId:string}>()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetchOrder()
    const t = setInterval(()=>{ fetchOrder() },5000)
    return ()=>clearInterval(t)
  },[])

  async function fetchOrder() {
    try {
      const r = await api.get('/orders/my')
      const orders = r.data?.orders??r.data??[]
      const found = orders.find((o:any)=>String(o.id)===String(orderId))
      if(found) {
        setOrder(found)
        if(found.status==='COLLECTED'||found.status==='CANCELLED') clearInterval(0)
      }
    } catch(e){console.error(e)} finally{setLoading(false)}
  }

  const stepIdx = order ? STEPS.indexOf(order.status) : 0

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',color:'#9CA3AF'}}>Loading…</div>

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0D1535,#1B2A6B)',fontFamily:'DM Sans,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
        <div style={{width:'100%',maxWidth:400}}>

          <div style={{textAlign:'center',marginBottom:'2rem'}}>
            <div style={{fontSize:'0.78rem',fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.5rem'}}>Your Token</div>
            <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'5rem',color:order?.status==='READY'?'#F59E0B':'#fff',lineHeight:1,letterSpacing:'-0.04em'}}>
              #{String(order?.token_number??'???').padStart(3,'0')}
            </div>
            {order?.status==='READY' && (
              <div style={{marginTop:'0.75rem',background:'#F59E0B',color:'#fff',borderRadius:10,padding:'0.5rem 1rem',fontSize:'0.88rem',fontWeight:700,display:'inline-block',animation:'pulse 1.5s infinite'}}>
                🔔 Ready at the counter!
              </div>
            )}
          </div>

          <div style={{background:'rgba(255,255,255,0.08)',borderRadius:16,padding:'1.5rem',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.12)',marginBottom:'1.5rem'}}>
            {STEPS.filter(s=>s!=='COLLECTED').map((step,i)=>{
              const done = stepIdx > i
              const active = stepIdx === i
              const cancelled = order?.status==='CANCELLED'
              return (
                <div key={step} style={{display:'flex',alignItems:'center',gap:12,marginBottom:i<3?'1rem':'0'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',fontWeight:700,
                    background: cancelled?'rgba(239,68,68,0.2)': done?'#1D9E75':active?'#E85D24':'rgba(255,255,255,0.1)',
                    color: cancelled?'#FCA5A5': done||active?'#fff':'rgba(255,255,255,0.4)',
                    border: active?'2px solid #E85D24':'2px solid transparent',
                    transition:'all 0.3s'
                  }}>{done?'✓':i+1}</div>
                  <div>
                    <div style={{fontSize:'0.9rem',fontWeight:active?700:500,color:done||active?'#fff':'rgba(255,255,255,0.45)',transition:'color 0.3s'}}>{STEP_LABELS[step]}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {order?.items?.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.06)',borderRadius:12,padding:'1rem',marginBottom:'1rem',border:'1px solid rgba(255,255,255,0.08)'}}>
              {order.items.map((item:any,i:number)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'0.85rem',color:'rgba(255,255,255,0.7)',padding:'0.25rem 0'}}>
                  <span>{item.name} × {item.quantity}</span>
                  <span>Rs {(item.price*item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <p style={{textAlign:'center',color:'rgba(255,255,255,0.4)',fontSize:'0.78rem'}}>Show this screen at the counter · Auto-updates every 5s</p>

          <button onClick={()=>router.push('/student/home')} style={{width:'100%',marginTop:'1.5rem',background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:12,padding:'0.8rem',fontSize:'0.88rem',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Back to Menu</button>
        </div>
      </div>
    </>
  )
}

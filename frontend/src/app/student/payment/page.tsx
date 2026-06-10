'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'

export default function PaymentPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading'|'success'|'failed'>('loading')
  const [order, setOrder] = useState<any>(null)

  useEffect(()=>{
    const s = params.get('status')||params.get('transaction_status')
    const orderId = params.get('oid')||params.get('order_id')||params.get('transaction_id')
    if(s==='success'||s==='Completed'){
      setStatus('success')
      if(orderId) api.get(`/payments/status/${orderId}`).then(r=>setOrder(r.data)).catch(()=>{})
    } else { setStatus('failed') }
  },[])

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{minHeight:'100vh',background:status==='success'?'linear-gradient(135deg,#0D1535,#1B2A6B)':'linear-gradient(135deg,#1a0505,#3b0a0a)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',padding:'1.5rem'}}>
        <div style={{background:'rgba(255,255,255,0.97)',borderRadius:24,padding:'2.5rem 2rem',width:'100%',maxWidth:380,textAlign:'center',boxShadow:'0 24px 60px rgba(0,0,0,0.4)'}}>
          {status==='loading' ? (
            <p style={{color:'#9CA3AF'}}>Verifying payment…</p>
          ) : status==='success' ? (<>
            <div style={{width:64,height:64,borderRadius:'50%',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem',fontSize:'1.75rem'}}>✅</div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.5rem',color:'#1B2A6B',margin:'0 0 0.5rem'}}>Order Confirmed!</h2>
            {order?.token_number && (
              <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'3rem',color:'#E85D24',margin:'1rem 0',lineHeight:1}}>
                #{String(order.token_number).padStart(3,'0')}
              </div>
            )}
            <p style={{color:'#6B7280',fontSize:'0.9rem',marginBottom:'1.5rem'}}>Show this token at the counter when your order is ready.</p>
            <button onClick={()=>router.push(order?.id?`/student/tracking/${order.id}`:'/student/home')} style={{width:'100%',background:'linear-gradient(135deg,#1B2A6B,#D4187C)',color:'#fff',border:'none',borderRadius:12,padding:'0.9rem',fontSize:'0.95rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
              Track My Order →
            </button>
          </>) : (<>
            <div style={{width:64,height:64,borderRadius:'50%',background:'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem',fontSize:'1.75rem'}}>❌</div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.5rem',color:'#B91C1C',margin:'0 0 0.5rem'}}>Payment Failed</h2>
            <p style={{color:'#6B7280',fontSize:'0.9rem',marginBottom:'1.5rem'}}>Something went wrong. Your cart is saved — try again.</p>
            <button onClick={()=>router.push('/student/cart')} style={{width:'100%',background:'#EF4444',color:'#fff',border:'none',borderRadius:12,padding:'0.9rem',fontSize:'0.95rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Try Again</button>
          </>)}
        </div>
      </div>
    </>
  )
}

'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { loadUserFromSession } from '@/lib/auth'

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
@keyframes pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.icon-circle{animation:pop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards}
.content{animation:fadeUp 0.4s 0.2s ease both}
`

function PaymentContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading'|'success'|'failed'>('loading')
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    loadUserFromSession()
    // Parse gateway callback params
    const txnStatus = params.get('status') ?? params.get('transaction_status') ?? params.get('pidx')
    const orderId   = params.get('oid') ?? params.get('order_id') ?? params.get('purchase_order_id')
    const refId     = params.get('refId') ?? params.get('transaction_id')

    const isSuccess = txnStatus === 'success' || txnStatus === 'Completed' || !!refId

    if (isSuccess) {
      setStatus('success')
      if (orderId) {
        api.get(`/payments/status/${orderId}`)
          .then(r => setOrder(r.data?.order ?? r.data))
          .catch(() => {})
      }
    } else {
      setStatus('failed')
    }
  }, [])

  const isSuccess = status === 'success'

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem',
      background:isSuccess
        ? 'radial-gradient(ellipse at top, #0d2b1a 0%, #0a0a0f 60%)'
        : 'radial-gradient(ellipse at top, #2b0d0d 0%, #0a0a0f 60%)'
    }}>
      {status==='loading' ? (
        <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)'}}>
          <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>⏳</div>
          Verifying payment…
        </div>
      ) : (
        <div style={{width:'100%',maxWidth:380,textAlign:'center'}}>
          {/* Icon */}
          <div className='icon-circle' style={{width:80,height:80,borderRadius:'50%',margin:'0 auto 1.5rem',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',
            background:isSuccess?'rgba(29,158,117,0.15)':'rgba(239,68,68,0.15)',
            border:`2px solid ${isSuccess?'rgba(29,158,117,0.3)':'rgba(239,68,68,0.3)'}`,
          }}>
            {isSuccess?'✅':'❌'}
          </div>

          <div className='content'>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.75rem',marginBottom:'0.4rem',
              background:isSuccess?'linear-gradient(90deg,#34D399,#6EE7B7)':'linear-gradient(90deg,#F87171,#FCA5A5)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'
            }}>
              {isSuccess?'Order Confirmed!':'Payment Failed'}
            </h2>

            {isSuccess && order?.token_number && (
              <div style={{margin:'1.5rem 0'}}>
                <div style={{fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.4rem'}}>Your Token</div>
                <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'5rem',lineHeight:1,
                  background:'linear-gradient(135deg,#E85D24,#F59E0B)',
                  WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'
                }}>
                  #{String(order.token_number).padStart(3,'0')}
                </div>
              </div>
            )}

            <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.9rem',marginBottom:'2rem',lineHeight:1.6}}>
              {isSuccess
                ? 'Your order is being prepared. Show this token at the counter.'
                : 'Something went wrong with your payment. Your items are still in the cart.'
              }
            </p>

            <button
              onClick={()=>router.push(isSuccess&&order?.id?`/student/tracking/${order.id}`:isSuccess?'/student/home':'/student/cart')}
              style={{width:'100%',border:'none',borderRadius:14,padding:'1rem',fontSize:'0.97rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',
                background:isSuccess?'linear-gradient(135deg,#E85D24,#F59E0B)':'rgba(239,68,68,0.2)',
                color:isSuccess?'#fff':'#F87171',
                boxShadow:isSuccess?'0 6px 24px rgba(232,93,36,0.35)':'none',
              }}>
              {isSuccess?'Track My Order →':'Try Again'}
            </button>

            {isSuccess&&(
              <button onClick={()=>router.push('/student/home')} style={{marginTop:'0.75rem',width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'0.8rem',fontSize:'0.88rem',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontFamily:'DM Sans,sans-serif'}}>
                Back to Menu
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PaymentPage() {
  return (
    <>
      <style>{GS}</style>
      <Suspense fallback={<div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.3)'}}>Loading…</div>}>
        <PaymentContent />
      </Suspense>
    </>
  )
}

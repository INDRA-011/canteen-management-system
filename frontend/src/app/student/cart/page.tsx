'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cartStore'
import api from '@/lib/api'

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f}

.section{
  background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));
  border:1px solid rgba(255,255,255,0.08);
  border-radius:16px;padding:1.25rem;margin-bottom:1rem;
}
.section-label{
  font-size:0.65rem;font-weight:700;
  color:rgba(255,255,255,0.35);
  text-transform:uppercase;letter-spacing:0.1em;
  margin-bottom:0.9rem;
}
.qty-btn{
  width:30px;height:30px;border-radius:8px;
  border:1px solid rgba(255,255,255,0.1);
  background:rgba(255,255,255,0.06);
  color:rgba(255,255,255,0.8);font-size:1rem;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all 0.15s;font-family:DM Sans,sans-serif;
}
.qty-btn:hover{background:rgba(232,93,36,0.2);border-color:rgba(232,93,36,0.4);color:#E85D24}

.type-btn{
  flex:1;padding:0.65rem;border-radius:10px;
  border:1px solid rgba(255,255,255,0.1);
  background:rgba(255,255,255,0.04);
  color:rgba(255,255,255,0.4);
  font-size:0.85rem;font-weight:600;cursor:pointer;
  font-family:DM Sans,sans-serif;transition:all 0.15s;
}
.type-btn.active{
  background:rgba(232,93,36,0.15);
  color:#E85D24;border-color:rgba(232,93,36,0.35);
}

.pay-btn{
  flex:1;padding:0.8rem;border-radius:12px;
  border:2px solid rgba(255,255,255,0.08);
  background:rgba(255,255,255,0.04);
  font-size:0.9rem;font-weight:700;cursor:pointer;
  font-family:DM Sans,sans-serif;transition:all 0.2s;
  display:flex;flex-direction:column;align-items:center;gap:3px;
}
.pay-btn.active-esewa{background:rgba(29,158,117,0.12);color:#34D399;border-color:rgba(29,158,117,0.35)}
.pay-btn.active-khalti{background:rgba(124,58,237,0.12);color:#A78BFA;border-color:rgba(124,58,237,0.35)}
.pay-btn:not(.active-esewa):not(.active-khalti){color:rgba(255,255,255,0.35)}

.place-btn{
  width:100%;background:linear-gradient(135deg,#E85D24,#F59E0B);
  color:#fff;border:none;border-radius:14px;
  padding:1.1rem;font-size:1rem;font-weight:600;
  cursor:pointer;font-family:DM Sans,sans-serif;
  box-shadow:0 6px 24px rgba(232,93,36,0.35);
  transition:opacity 0.15s,transform 0.1s;
}
.place-btn:hover{opacity:0.9;transform:translateY(-1px)}
.place-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}

.slot-select{
  width:100%;background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.1);border-radius:10px;
  padding:0.75rem 0.9rem;font-size:0.9rem;
  font-family:DM Sans,sans-serif;color:#fff;
  outline:none;cursor:pointer;transition:all 0.15s;
  appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 0.9rem center;
}
.slot-select:focus{border-color:#E85D24;background-color:rgba(232,93,36,0.08);box-shadow:0 0 0 3px rgba(232,93,36,0.12)}

.member-input{
  width:100%;background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.1);border-radius:10px;
  padding:0.75rem 0.9rem;font-size:0.85rem;
  font-family:DM Sans,sans-serif;color:#fff;
  outline:none;resize:vertical;
  transition:all 0.15s;
}
.member-input::placeholder{color:rgba(255,255,255,0.2)}
.member-input:focus{border-color:#E85D24;box-shadow:0 0 0 3px rgba(232,93,36,0.12)}
`

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQty, clearCart, total } = useCartStore()
  const [slots, setSlots] = useState<string[]>([])
  const [pickup, setPickup] = useState('')
  const [orderType, setOrderType] = useState<'INDIVIDUAL'|'GROUP'>('INDIVIDUAL')
  const [memberIds, setMemberIds] = useState('')
  const [payment, setPayment] = useState<'esewa'|'khalti'>('esewa')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/settings/slots')
      .then(r => {
        const s = r.data?.slots ?? r.data ?? []
        const arr = Array.isArray(s) ? s : []
        setSlots(arr)
        if (arr.length) setPickup(arr[0])
      })
      .catch(console.error)
  }, [])

  const cartTotal = total()

  async function placeOrder() {
    if (!pickup) { setError('Please select a pickup time'); return }
    if (items.length === 0) { setError('Your cart is empty'); return }
    setError('')
    setPlacing(true)
    try {
      const body: any = {
        items: items.map(i => ({ menu_item_id: i.menuItem.id, quantity: i.quantity })),
        pickup_time: pickup,
        order_type: orderType,
        payment_method: payment.toUpperCase(),
      }
      if (orderType === 'GROUP' && memberIds.trim()) {
        body.member_college_ids = memberIds.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      }

      const orderRes = await api.post('/orders', body)
      const orderId = orderRes.data?.order_id ?? orderRes.data?.id

      const payRes = await api.post(`/payments/${payment}/initiate`, { order_id: orderId })
      clearCart()

      // eSewa — POST form redirect
      if (payment === 'esewa' && payRes.data?.form_data) {
        const f = document.createElement('form')
        f.method = 'POST'
        f.action = payRes.data.gateway_url ?? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
        Object.entries(payRes.data.form_data).forEach(([k,v]) => {
          const inp = document.createElement('input')
          inp.type = 'hidden'; inp.name = k; inp.value = String(v)
          f.appendChild(inp)
        })
        document.body.appendChild(f)
        f.submit()
        return
      }

      // Khalti — redirect to payment URL
      if (payRes.data?.payment_url) {
        window.location.href = payRes.data.payment_url
        return
      }

      // Fallback — go straight to tracking
      router.push(`/student/tracking/${orderId}`)
    } catch(e: any) {
      setError(e.response?.data?.error || 'Failed to place order. Try again.')
    } finally { setPlacing(false) }
  }

  // Empty state
  if (items.length === 0) return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',gap:'1rem',padding:'2rem',textAlign:'center'}}>
        <div style={{fontSize:'4rem'}}>🛒</div>
        <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.4rem',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Cart is empty
        </div>
        <div style={{color:'rgba(255,255,255,0.35)',fontSize:'0.9rem'}}>Add some delicious items from the menu</div>
        <button onClick={()=>router.push('/student/home')} style={{marginTop:'0.5rem',background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:12,padding:'0.8rem 1.75rem',fontSize:'0.95rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 16px rgba(232,93,36,0.3)'}}>
          Browse Menu →
        </button>
      </div>
    </>
  )

  return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:'100vh',background:'#0a0a0f',fontFamily:'DM Sans,sans-serif',paddingBottom:'2rem'}}>

        {/* Header */}
        <div style={{background:'rgba(10,10,15,0.85)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(232,93,36,0.15)',padding:'0.9rem 1.25rem',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>router.back()} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.6)',fontSize:'1rem'}}>←</button>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.05rem',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Your Order</div>
          <div style={{marginLeft:'auto',fontSize:'0.82rem',color:'rgba(255,255,255,0.35)'}}>{items.reduce((a,i)=>a+i.quantity,0)} items</div>
        </div>

        <div style={{padding:'1.25rem'}}>

          {/* Items */}
          <div className='section'>
            <div className='section-label'>Order Items</div>
            {items.map((item) => (
              <div key={item.menuItem.id} style={{display:'flex',alignItems:'center',gap:10,paddingBottom:'1rem',marginBottom:'1rem',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,color:'rgba(255,255,255,0.88)',fontSize:'0.92rem',marginBottom:'0.2rem'}}>{item.menuItem.name}</div>
                  <div style={{fontSize:'0.8rem',color:'#F59E0B',fontFamily:'Syne,sans-serif',fontWeight:700}}>Rs {Number(item.menuItem.price).toLocaleString()}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <button className='qty-btn' onClick={()=>updateQty(item.menuItem.id, item.quantity-1)}>−</button>
                  <span style={{fontWeight:700,minWidth:22,textAlign:'center',color:'#fff',fontSize:'0.95rem'}}>{item.quantity}</span>
                  <button className='qty-btn' onClick={()=>item.quantity<5 && updateQty(item.menuItem.id, item.quantity+1)}>+</button>
                </div>
                <div style={{minWidth:72,textAlign:'right',fontWeight:600,color:'rgba(255,255,255,0.7)',fontSize:'0.88rem'}}>
                  Rs {(Number(item.menuItem.price)*item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
            {/* Total */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'0.25rem'}}>
              <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.9rem'}}>Subtotal</span>
              <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.4rem',background:'linear-gradient(90deg,#E85D24,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                Rs {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Order Type */}
          <div className='section'>
            <div className='section-label'>Order Type</div>
            <div style={{display:'flex',gap:8,marginBottom:orderType==='GROUP'?'1rem':'0'}}>
              {(['INDIVIDUAL','GROUP'] as const).map(t=>(
                <button key={t} className={`type-btn${orderType===t?' active':''}`} onClick={()=>setOrderType(t)}>
                  {t==='INDIVIDUAL'?'👤 Individual':'👥 Group'}
                </button>
              ))}
            </div>
            {orderType==='GROUP'&&(
              <div>
                <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.35)',marginBottom:6}}>Member College IDs (one per line or comma-separated)</div>
                <textarea className='member-input' rows={3} value={memberIds} onChange={e=>setMemberIds(e.target.value)} placeholder='e.g. TCMIT002, TCMIT003' />
              </div>
            )}
          </div>

          {/* Pickup Time */}
          <div className='section'>
            <div className='section-label'>Pickup Time</div>
            {slots.length === 0 ? (
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:'0.85rem'}}>Loading slots…</div>
            ) : (
              <select className='slot-select' value={pickup} onChange={e=>setPickup(e.target.value)}>
                {slots.map(s=><option key={s} value={s} style={{background:'#1a1a2e'}}>{s}</option>)}
              </select>
            )}
          </div>

          {/* Payment */}
          <div className='section'>
            <div className='section-label'>Payment Method</div>
            <div style={{display:'flex',gap:10}}>
              <button className={`pay-btn${payment==='esewa'?' active-esewa':''}`} onClick={()=>setPayment('esewa')}>
                <span style={{fontSize:'1.3rem'}}>💚</span>
                <span style={{fontSize:'0.82rem'}}>eSewa</span>
              </button>
              <button className={`pay-btn${payment==='khalti'?' active-khalti':''}`} onClick={()=>setPayment('khalti')}>
                <span style={{fontSize:'1.3rem'}}>💜</span>
                <span style={{fontSize:'0.82rem'}}>Khalti</span>
              </button>
            </div>
          </div>

          {/* Error */}
          {error&&(
            <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,padding:'0.75rem 1rem',color:'#F87171',fontSize:'0.85rem',marginBottom:'1rem'}}>
              ⚠️ {error}
            </div>
          )}

          {/* Place Order */}
          <button className='place-btn' disabled={placing||slots.length===0} onClick={placeOrder}>
            {placing ? 'Placing Order…' : `Pay Rs ${cartTotal.toLocaleString()} via ${payment==='esewa'?'eSewa':'Khalti'} →`}
          </button>

        </div>
      </div>
    </>
  )
}

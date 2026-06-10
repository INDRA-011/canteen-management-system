'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cartStore'
import api from '@/lib/api'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, clearCart } = useCartStore()
  const [slots, setSlots] = useState<string[]>([])
  const [pickup, setPickup] = useState('')
  const [orderType, setOrderType] = useState<'INDIVIDUAL'|'GROUP'>('INDIVIDUAL')
  const [memberIds, setMemberIds] = useState('')
  const [payment, setPayment] = useState<'esewa'|'khalti'>('esewa')
  const [placing, setPlacing] = useState(false)

  useEffect(()=>{
    api.get('/settings/slots').then(r=>{ const s=r.data?.slots??r.data??[]; setSlots(s); if(s.length) setPickup(s[0]) }).catch(console.error)
  },[])

  const total = items.reduce((a:number,i:any)=>a+i.price*i.quantity,0)

  async function placeOrder() {
    if(!pickup){alert('Please select a pickup time');return}
    setPlacing(true)
    try {
      const body:any = {
        items: items.map((i:any)=>({menu_item_id:i.id,quantity:i.quantity})),
        pickup_time: pickup,
        order_type: orderType,
        payment_method: payment.toUpperCase(),
      }
      if(orderType==='GROUP'&&memberIds.trim()) body.member_college_ids = memberIds.split(/[\n,]+/).map((s:string)=>s.trim()).filter(Boolean)
      const orderRes = await api.post('/orders',body)
      const orderId = orderRes.data?.order_id??orderRes.data?.id
      const payRes = await api.post(`/payments/${payment}/initiate`,{order_id:orderId})
      clearCart()
      if(payment==='esewa'&&payRes.data?.form_data) {
        const f=document.createElement('form'); f.method='POST'; f.action=payRes.data.gateway_url??'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
        Object.entries(payRes.data.form_data).forEach(([k,v])=>{ const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=String(v); f.appendChild(i) })
        document.body.appendChild(f); f.submit()
      } else if(payRes.data?.payment_url) {
        window.location.href=payRes.data.payment_url
      } else { router.push(`/student/tracking/${orderId}`) }
    } catch(e:any){ alert(e.response?.data?.error||'Failed to place order') }
    finally{setPlacing(false)}
  }

  if(items.length===0) return (
    <div style={{minHeight:'100vh',background:'#F0F2F8',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',gap:'1rem'}}>
      <div style={{fontSize:'3rem'}}>🛒</div>
      <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.2rem',color:'#1B2A6B'}}>Your cart is empty</div>
      <button onClick={()=>router.push('/student/home')} style={{background:'linear-gradient(135deg,#1B2A6B,#D4187C)',color:'#fff',border:'none',borderRadius:10,padding:'0.75rem 1.5rem',fontSize:'0.9rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>Browse Menu</button>
    </div>
  )

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div style={{minHeight:'100vh',background:'#F0F2F8',fontFamily:'DM Sans,sans-serif',paddingBottom:'2rem'}}>
        <div style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10}}>
          <button onClick={()=>router.back()} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'#6B7280'}}>←</button>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#1B2A6B'}}>Your Order</div>
        </div>

        <div style={{padding:'1.25rem'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'1.25rem',marginBottom:'1rem',border:'1px solid #F0F2F8'}}>
            {items.map((item:any)=>(
              <div key={item.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:'1rem',marginBottom:'1rem',borderBottom:'1px solid #F9FAFB'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,color:'#111827',fontSize:'0.95rem'}}>{item.name}</div>
                  <div style={{fontSize:'0.82rem',color:'#E85D24',fontFamily:'Syne,sans-serif',fontWeight:700}}>Rs {item.price}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <button onClick={()=>item.quantity>1?updateQuantity(item.id,item.quantity-1):removeItem(item.id)} style={{width:28,height:28,borderRadius:8,border:'1px solid #E5E7EB',background:'#F9FAFB',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>−</button>
                  <span style={{fontWeight:700,minWidth:20,textAlign:'center',color:'#111827'}}>{item.quantity}</span>
                  <button onClick={()=>updateQuantity(item.id,item.quantity+1)} style={{width:28,height:28,borderRadius:8,border:'1px solid #E5E7EB',background:'#F9FAFB',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',color:'#374151'}}>+</button>
                </div>
                <div style={{minWidth:70,textAlign:'right',fontWeight:600,color:'#111827',marginLeft:12}}>Rs {(item.price*item.quantity).toLocaleString()}</div>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:600,color:'#111827'}}>Total</span>
              <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.3rem',color:'#1B2A6B'}}>Rs {total.toLocaleString()}</span>
            </div>
          </div>

          <div style={{background:'#fff',borderRadius:14,padding:'1.25rem',marginBottom:'1rem',border:'1px solid #F0F2F8'}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.75rem'}}>Order Type</div>
            <div style={{display:'flex',gap:8,marginBottom: orderType==='GROUP'?'1rem':'0'}}>
              {(['INDIVIDUAL','GROUP'] as const).map(t=>(
                <button key={t} onClick={()=>setOrderType(t)} style={{flex:1,padding:'0.6rem',borderRadius:10,border:'1px solid',fontSize:'0.85rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',background:orderType===t?'#1B2A6B':'#fff',color:orderType===t?'#fff':'#6B7280',borderColor:orderType===t?'#1B2A6B':'#E5E7EB'}}>{t}</button>
              ))}
            </div>
            {orderType==='GROUP' && (
              <textarea value={memberIds} onChange={e=>setMemberIds(e.target.value)} placeholder='Enter college IDs, one per line or comma-separated' rows={3} style={{width:'100%',background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:9,padding:'0.7rem',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif',outline:'none',color:'#111827',resize:'vertical'}} />
            )}
          </div>

          <div style={{background:'#fff',borderRadius:14,padding:'1.25rem',marginBottom:'1rem',border:'1px solid #F0F2F8'}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.75rem'}}>Pickup Time</div>
            <select value={pickup} onChange={e=>setPickup(e.target.value)} style={{width:'100%',background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:9,padding:'0.7rem 0.9rem',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',outline:'none',color:'#111827'}}>
              {slots.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{background:'#fff',borderRadius:14,padding:'1.25rem',marginBottom:'1.5rem',border:'1px solid #F0F2F8'}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:'0.75rem'}}>Payment Method</div>
            <div style={{display:'flex',gap:8}}>
              {[{id:'esewa',label:'eSewa',color:'#1D9E75'},{id:'khalti',label:'Khalti',color:'#7C3AED'}].map(p=>(
                <button key={p.id} onClick={()=>setPayment(p.id as any)} style={{flex:1,padding:'0.75rem',borderRadius:10,border:'2px solid',fontSize:'0.88rem',fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s',background:payment===p.id?p.color+'18':'#fff',color:payment===p.id?p.color:'#6B7280',borderColor:payment===p.id?p.color:'#E5E7EB'}}>{p.label}</button>
              ))}
            </div>
          </div>

          <button onClick={placeOrder} disabled={placing} style={{width:'100%',background:'linear-gradient(135deg,#1B2A6B,#D4187C)',color:'#fff',border:'none',borderRadius:14,padding:'1.1rem',fontSize:'1rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',opacity:placing?0.6:1,boxShadow:'0 4px 20px rgba(27,42,107,0.3)'}}>
            {placing?'Placing Order…':`Pay Rs ${total.toLocaleString()} via ${payment==='esewa'?'eSewa':'Khalti'}`}
          </button>
        </div>
      </div>
    </>
  )
}

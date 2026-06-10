'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadUserFromSession, logout } from '@/lib/auth'
import { useCartStore } from '@/stores/cartStore'
import api from '@/lib/api'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menu, setMenu] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [cat, setCat] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const { items, addItem, getTotalItems, getTotalPrice } = useCartStore()

  useEffect(()=>{
    const u = loadUserFromSession()
    if(!u){router.push('/login');return}
    setUser(u)
    fetchData()
  },[])

  async function fetchData() {
    try {
      const [m,s] = await Promise.all([api.get('/orders/menu'),api.get('/settings')])
      setMenu(m.data?.menuItems??m.data?.items??m.data??[])
      setSettings(s.data?.settings??s.data)
    } catch(e){console.error(e)} finally{setLoading(false)}
  }

  const cats = ['ALL',...Array.from(new Set(menu.map((i:any)=>i.item_type??i.category_name??'OTHER')))]
  const filtered = cat==='ALL' ? menu : menu.filter((i:any)=>(i.item_type??i.category_name)===cat)
  const totalItems = getTotalItems?.()??items.reduce((a:number,i:any)=>a+i.quantity,0)
  const totalPrice = getTotalPrice?.()??items.reduce((a:number,i:any)=>a+i.price*i.quantity,0)

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
      *{box-sizing:border-box}
      .add-btn{background:linear-gradient(135deg,#E85D24,#F59E0B);color:#fff;border:none;border-radius:8px;padding:0.45rem 1rem;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;transition:opacity 0.15s}
      .add-btn:hover{opacity:0.88}
      .add-btn:disabled{opacity:0.4;cursor:not-allowed}
      `}</style>
      <div style={{minHeight:'100vh',background:'#F0F2F8',fontFamily:'DM Sans,sans-serif',paddingBottom:80}}>

        <div style={{background:'#fff',borderBottom:'1px solid #E5E7EB',padding:'1rem 1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#1B2A6B',letterSpacing:'-0.02em'}}>TCMIT Canteen</div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:'0.85rem',color:'#6B7280'}}>{user?.name}</span>
            <button onClick={()=>{logout();router.push('/login')}} style={{padding:'0.35rem 0.85rem',borderRadius:8,border:'1px solid #E5E7EB',background:'#fff',fontSize:'0.8rem',cursor:'pointer',color:'#6B7280',fontFamily:'DM Sans,sans-serif'}}>Logout</button>
          </div>
        </div>

        {settings && (
          <div style={{margin:'1rem 1.25rem',padding:'0.65rem 1rem',borderRadius:10,background:settings.is_open?'#F0FDF4':'#FEF2F2',border:`1px solid ${settings.is_open?'#BBF7D0':'#FECACA'}`,color:settings.is_open?'#166534':'#B91C1C',fontSize:'0.85rem',fontWeight:500}}>
            {settings.is_open ? `🟢 Canteen Open · ${settings.open_time} – ${settings.close_time}` : '🔴 Canteen Closed — Orders not accepted right now'}
          </div>
        )}

        <div style={{display:'flex',gap:8,padding:'0.75rem 1.25rem',overflowX:'auto'}}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{padding:'0.4rem 1rem',borderRadius:20,border:'1px solid',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s',background:cat===c?'#1B2A6B':'#fff',color:cat===c?'#fff':'#6B7280',borderColor:cat===c?'#1B2A6B':'#E5E7EB'}}>{c}</button>
          ))}
        </div>

        {loading ? <p style={{textAlign:'center',color:'#9CA3AF',padding:'3rem'}}>Loading menu…</p> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'0.875rem',padding:'0 1.25rem'}}>
            {filtered.map((item:any,i:number)=>(
              <div key={item.id??i} style={{background:'#fff',borderRadius:14,padding:'1rem',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',border:'1px solid #F0F2F8'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}>
                  <span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.2rem 0.55rem',borderRadius:6,background:item.item_type==='MEAL'?'#1B2A6B18':'#1D9E7518',color:item.item_type==='MEAL'?'#1B2A6B':'#0F6E56'}}>{item.item_type??'MEAL'}</span>
                  {item.stock<5&&<span style={{fontSize:'0.68rem',color:'#EF4444',fontWeight:600}}>Low stock</span>}
                </div>
                <div style={{fontWeight:600,fontSize:'0.95rem',color:'#111827',marginBottom:'0.25rem',lineHeight:1.3}}>{item.name}</div>
                <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#E85D24',marginBottom:'0.75rem'}}>Rs {Number(item.price).toLocaleString()}</div>
                <button className='add-btn' disabled={!item.is_available||item.stock===0} onClick={()=>addItem({id:item.id,name:item.name,price:item.price,quantity:1})}>
                  {!item.is_available?'Unavailable':item.stock===0?'Out of stock':'Add +'}
                </button>
              </div>
            ))}
          </div>
        )}

        {totalItems > 0 && (
          <div style={{position:'fixed',bottom:16,left:'50%',transform:'translateX(-50%)',width:'calc(100% - 2.5rem)',maxWidth:480,zIndex:20}}>
            <button onClick={()=>router.push('/student/cart')} style={{width:'100%',background:'linear-gradient(135deg,#1B2A6B,#D4187C)',color:'#fff',border:'none',borderRadius:14,padding:'1rem 1.5rem',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 20px rgba(27,42,107,0.35)'}}>
              <span style={{background:'rgba(255,255,255,0.2)',borderRadius:8,padding:'0.2rem 0.6rem',fontSize:'0.85rem',fontWeight:700}}>{totalItems} items</span>
              <span style={{fontWeight:600,fontSize:'0.95rem'}}>View Cart · Rs {totalPrice.toLocaleString()}</span>
              <span style={{fontSize:'1.1rem'}}>→</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}

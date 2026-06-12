'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadUserFromSession, logout } from '@/lib/auth'
import { useCartStore } from '@/stores/cartStore'
import { MenuItem } from '@/types'
import api from '@/lib/api'

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f}
.navbar{position:sticky;top:0;z-index:20;background:rgba(10,10,15,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(232,93,36,0.15);padding:0.9rem 1.25rem;display:flex;align-items:center;justify-content:space-between}
.cat-tab{padding:0.45rem 1.1rem;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.4);font-size:0.8rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;white-space:nowrap;transition:all 0.15s}
.cat-tab.active{background:linear-gradient(135deg,#E85D24,#F59E0B);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(232,93,36,0.35)}
.cat-tab:hover:not(.active){border-color:rgba(232,93,36,0.3);color:rgba(255,255,255,0.7)}
.menu-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0.875rem;padding:0 1.25rem 6rem}
.mcard{background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s,border-color 0.2s}
.mcard:hover{transform:translateY(-2px);border-color:rgba(232,93,36,0.25);box-shadow:0 8px 32px rgba(232,93,36,0.12)}
.mcard-img{width:100%;height:130px;object-fit:cover;display:block}
.mcard-img-placeholder{width:100%;height:100px;background:linear-gradient(135deg,rgba(232,93,36,0.1),rgba(245,158,11,0.05));display:flex;align-items:center;justify-content:center;font-size:2.5rem}
.mcard-body{padding:0.875rem}
.add-btn{width:100%;margin-top:0.65rem;background:linear-gradient(135deg,#E85D24,#F59E0B);color:#fff;border:none;border-radius:9px;padding:0.5rem 0;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:DM Sans,sans-serif;box-shadow:0 3px 10px rgba(232,93,36,0.3);transition:opacity 0.15s,transform 0.1s}
.add-btn:hover{opacity:0.88;transform:scale(1.02)}
.add-btn:disabled{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);box-shadow:none;cursor:not-allowed;transform:none}
.cart-bar{position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);width:calc(100% - 2.5rem);max-width:480px;z-index:30}
.cart-btn{width:100%;background:linear-gradient(135deg,#1B2A6B,#D4187C);color:#fff;border:none;border-radius:14px;padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-family:DM Sans,sans-serif;box-shadow:0 8px 32px rgba(27,42,107,0.4);transition:transform 0.15s}
.cart-btn:hover{transform:translateY(-1px)}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:10px}
`

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [cat, setCat] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const { items, addItem, total, totalItems } = useCartStore()

  useEffect(() => {
    const u = loadUserFromSession()
    if (!u) { router.push('/login'); return }
    setUser(u)
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const menuRes = await api.get('/orders/menu')
      const raw = menuRes.data?.menuItems ?? menuRes.data?.items ?? []
      setMenuItems(Array.isArray(raw) ? raw : [])
      if (menuRes.data?.settings) setSettings(menuRes.data.settings)
    } catch(e: any) {
      console.error('fetchData error:', e.response?.status, e.response?.data)
    } finally { setLoading(false) }
  }

  const cats = ['ALL', ...Array.from(new Set(menuItems.map(i => i.item_type ?? 'OTHER')))]
  const filtered = cat === 'ALL' ? menuItems : menuItems.filter(i => i.item_type === cat)
  const cartCount = totalItems()
  const cartTotal = total()

  return (
    <>
      <style>{GS}</style>
      <div style={{minHeight:'100vh',background:'#0a0a0f',fontFamily:'DM Sans,sans-serif'}}>

        <div className='navbar'>
          <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.05rem',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TCMIT Canteen</div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.45)'}}>{user?.name}</span>
            <button onClick={()=>router.push('/student/history')} style={{padding:'0.35rem 0.85rem',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',fontSize:'0.78rem',cursor:'pointer',color:'rgba(255,255,255,0.5)',fontFamily:'DM Sans,sans-serif'}}>
              History
            </button>
            <button onClick={()=>{logout();router.push('/login')}} style={{padding:'0.35rem 0.85rem',borderRadius:8,border:'1px solid rgba(232,93,36,0.2)',background:'rgba(232,93,36,0.08)',fontSize:'0.78rem',cursor:'pointer',color:'#E85D24',fontFamily:'DM Sans,sans-serif'}}>
              Logout
            </button>
          </div>
        </div>

        {settings && (
          <div style={{margin:'1rem 1.25rem 0',padding:'0.7rem 1rem',borderRadius:12,
            background:settings.is_open?'rgba(29,158,117,0.1)':'rgba(239,68,68,0.1)',
            border:`1px solid ${settings.is_open?'rgba(29,158,117,0.25)':'rgba(239,68,68,0.25)'}`,
            color:settings.is_open?'#34D399':'#F87171',fontSize:'0.85rem',fontWeight:500,
            display:'flex',alignItems:'center',gap:8
          }}>
            <span>{settings.is_open?'🟢':'🔴'}</span>
            <span>{settings.is_open ? `Canteen Open · ${settings.open_time} – ${settings.close_time}` : 'Canteen Closed · Orders not accepted right now'}</span>
          </div>
        )}

        <div style={{display:'flex',gap:8,padding:'1rem 1.25rem',overflowX:'auto',scrollbarWidth:'none'}}>
          {cats.map(c=>(
            <button key={c} className={`cat-tab${cat===c?' active':''}`} onClick={()=>setCat(c)}>{c}</button>
          ))}
        </div>

        {loading ? (
          <div className='menu-grid'>
            {[...Array(6)].map((_,i)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,overflow:'hidden'}}>
                <div className='skeleton' style={{height:120,borderRadius:0}}/>
                <div style={{padding:'0.875rem'}}>
                  <div className='skeleton' style={{height:14,width:'70%',marginBottom:8}}/>
                  <div className='skeleton' style={{height:12,width:'40%',marginBottom:12}}/>
                  <div className='skeleton' style={{height:32,borderRadius:8}}/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'4rem 1.25rem'}}>
            <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🍽️</div>
            <div style={{color:'rgba(255,255,255,0.4)',fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',marginBottom:'0.5rem'}}>
              {menuItems.length === 0 ? 'No menu items yet' : 'Nothing in this category'}
            </div>
          </div>
        ) : (
          <div className='menu-grid'>
            {filtered.map((item: any) => {
              const inCart = items.find(i => i.menuItem.id === item.id)
              return (
                <div key={item.id} className='mcard'>
                  {/* Item Image */}
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} className='mcard-img' onError={(e:any)=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex' }} />
                    : null
                  }
                  <div className='mcard-img-placeholder' style={{display: item.image_url ? 'none' : 'flex'}}>
                    {item.item_type === 'MEAL' ? '🍱' : '🧃'}
                  </div>

                  <div className='mcard-body'>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
                      <span style={{fontSize:'0.65rem',fontWeight:700,padding:'0.2rem 0.55rem',borderRadius:6,
                        background:item.item_type==='MEAL'?'rgba(232,93,36,0.15)':'rgba(29,158,117,0.15)',
                        color:item.item_type==='MEAL'?'#E85D24':'#34D399',
                        border:`1px solid ${item.item_type==='MEAL'?'rgba(232,93,36,0.2)':'rgba(29,158,117,0.2)'}`
                      }}>{item.item_type}</span>
                      {item.stock_qty < 5 && item.stock_qty > 0 && (
                        <span style={{fontSize:'0.62rem',color:'#F87171',fontWeight:600}}>Only {item.stock_qty} left</span>
                      )}
                    </div>
                    <div style={{fontWeight:600,fontSize:'0.92rem',color:'rgba(255,255,255,0.9)',marginBottom:'0.2rem',lineHeight:1.3}}>{item.name}</div>
                    <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#F59E0B'}}>
                      Rs {Number(item.price).toLocaleString()}
                    </div>
                    {inCart && (
                      <div style={{fontSize:'0.7rem',color:'#34D399',marginTop:'0.2rem'}}>✓ {inCart.quantity} in cart</div>
                    )}
                    <button className='add-btn' disabled={!item.is_available||item.stock_qty===0} onClick={()=>addItem(item)}>
                      {!item.is_available?'Unavailable':item.stock_qty===0?'Out of stock':inCart?'+ Add More':'Add to Cart'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {cartCount > 0 && (
          <div className='cart-bar'>
            <button className='cart-btn' onClick={()=>router.push('/student/cart')}>
              <span style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'0.22rem 0.7rem',fontSize:'0.85rem',fontWeight:700}}>{cartCount} {cartCount===1?'item':'items'}</span>
              <span style={{fontWeight:600,fontSize:'0.95rem'}}>View Cart</span>
              <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,color:'#F59E0B'}}>Rs {cartTotal.toLocaleString()}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.inp{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.75rem 0.9rem;font-size:0.9rem;font-family:DM Sans,sans-serif;color:#fff;outline:none;transition:all 0.15s}
.inp::placeholder{color:rgba(255,255,255,0.25)}
.inp:focus{border-color:#E85D24;background:rgba(232,93,36,0.08);box-shadow:0 0 0 3px rgba(232,93,36,0.12)}
.tr:hover{background:rgba(232,93,36,0.05)!important}
`

export default function MenuPage() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({name:'',category_id:'',price:'',stock:'',item_type:'MEAL',is_available:true})

  useEffect(()=>{ fetchAll() },[])

  async function fetchAll() {
    try {
      const [m,c] = await Promise.all([api.get('/admin/menu'),api.get('/admin/menu/categories')])
      const menuData = m.data?.items ?? m.data?.menuItems ?? m.data
      setItems(Array.isArray(menuData) ? menuData : [])
      const catData = c.data?.categories ?? c.data
      setCategories(Array.isArray(catData) ? catData : [])
    } catch(e){ console.error(e) } finally{ setLoading(false) }
  }

  function openAdd() { setEditing(null); setForm({name:'',category_id:'',price:'',stock:'',item_type:'MEAL',is_available:true}); setShowForm(true) }
  function openEdit(item:any) { setEditing(item); setForm({name:item.name,category_id:String(item.category_id??''),price:String(item.price),stock:String(item.stock_qty??item.stock??0),item_type:item.item_type??'MEAL',is_available:item.is_available??true}); setShowForm(true) }

  async function saveItem() {
    setSaving(true)
    try {
      const body={...form,price:parseFloat(form.price),stock_qty:parseInt(form.stock),stock:parseInt(form.stock),category_id:parseInt(form.category_id)}
      if(editing) await api.patch(`/admin/menu/${editing.id}`,body)
      else await api.post('/admin/menu',body)
      await fetchAll(); setShowForm(false)
    } catch(e){console.error(e)} finally{setSaving(false)}
  }

  async function deleteItem(id:number) {
    if(!confirm('Delete this item?')) return
    try { await api.delete(`/admin/menu/${id}`); await fetchAll() } catch(e){console.error(e)}
  }

  async function toggleAvailable(item:any) {
    try { await api.patch(`/admin/menu/${item.id}/toggle`); await fetchAll() } catch(e){console.error(e)}
  }

  return (
    <>
      <style>{GS}</style>
      <div style={{padding:'2rem',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#0a0a0f',display:'flex',gap:'2rem'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.75rem',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',margin:0,letterSpacing:'-0.03em',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Menu</h1>
              <p style={{color:'rgba(255,255,255,0.4)',margin:'0.3rem 0 0',fontSize:'0.9rem'}}>{items.length} items</p>
            </div>
            <button onClick={openAdd} style={{background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:11,padding:'0.7rem 1.4rem',fontSize:'0.88rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 16px rgba(232,93,36,0.3)'}}>+ Add Item</button>
          </div>

          <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden'}}>
            {loading ? (
              <div style={{padding:'4rem',textAlign:'center'}}>
                <div style={{fontSize:'2rem',marginBottom:'0.5rem'}}>🍱</div>
                <div style={{color:'rgba(255,255,255,0.3)'}}>Loading menu…</div>
              </div>
            ) : items.length === 0 ? (
              <div style={{padding:'4rem',textAlign:'center'}}>
                <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🍽️</div>
                <div style={{color:'rgba(255,255,255,0.5)',fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',marginBottom:'0.5rem'}}>No menu items yet</div>
                <div style={{color:'rgba(255,255,255,0.3)',fontSize:'0.9rem',marginBottom:'1.5rem'}}>Add your first item to get started</div>
                <button onClick={openAdd} style={{background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:10,padding:'0.7rem 1.5rem',fontSize:'0.88rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>+ Add First Item</button>
              </div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
                  <thead>
                    <tr style={{background:'rgba(255,255,255,0.03)'}}>
                      {['Name','Category','Price','Stock','Type','Available','Actions'].map(h=>(
                        <th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item:any,i:number)=>(
                      <tr key={item.id??i} className='tr' style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                        <td style={{padding:'0.9rem 1rem',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{item.name}</td>
                        <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.4)',fontSize:'0.82rem'}}>{item.category_name??item.category?.name??'—'}</td>
                        <td style={{padding:'0.9rem 1rem',fontWeight:600,color:'#F59E0B'}}>Rs {Number(item.price).toLocaleString()}</td>
                        <td style={{padding:'0.9rem 1rem'}}>
                          <span style={{color:(item.stock_qty??item.stock??0)<5?'#F87171':'rgba(255,255,255,0.6)',fontWeight:(item.stock_qty??item.stock??0)<5?700:400}}>{item.stock_qty??item.stock??0}</span>
                        </td>
                        <td style={{padding:'0.9rem 1rem'}}>
                          <span style={{background:item.item_type==='MEAL'?'rgba(232,93,36,0.15)':'rgba(29,158,117,0.15)',color:item.item_type==='MEAL'?'#E85D24':'#34D399',borderRadius:6,padding:'0.2rem 0.6rem',fontSize:'0.7rem',fontWeight:700}}>{item.item_type??'MEAL'}</span>
                        </td>
                        <td style={{padding:'0.9rem 1rem'}}>
                          <button onClick={()=>toggleAvailable(item)} style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:item.is_available?'#E85D24':'rgba(255,255,255,0.1)',position:'relative',transition:'background 0.2s'}}>
                            <span style={{position:'absolute',top:3,width:18,height:18,borderRadius:9,background:'#fff',transition:'left 0.2s',left:item.is_available?'23px':'3px'}}/>
                          </button>
                        </td>
                        <td style={{padding:'0.9rem 1rem'}}>
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>openEdit(item)} style={{padding:'0.28rem 0.75rem',borderRadius:7,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',color:'rgba(255,255,255,0.7)',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s'}}>Edit</button>
                            <button onClick={()=>deleteItem(item.id)} style={{padding:'0.28rem 0.75rem',borderRadius:7,border:'1px solid rgba(239,68,68,0.2)',background:'rgba(239,68,68,0.1)',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',color:'#F87171',fontFamily:'DM Sans,sans-serif'}}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Slide-in Form */}
        {showForm && (
          <div style={{width:300,flexShrink:0,background:'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))',borderRadius:16,border:'1px solid rgba(255,255,255,0.1)',padding:'1.5rem',height:'fit-content',position:'sticky',top:'2rem',backdropFilter:'blur(10px)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
              <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#fff',margin:0}}>{editing?'Edit Item':'New Item'}</h3>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontSize:'1.3rem',cursor:'pointer',color:'rgba(255,255,255,0.4)',lineHeight:1}}>×</button>
            </div>
            {[{label:'Name',key:'name',type:'text',ph:'e.g. Chicken Momo'},{label:'Price (Rs)',key:'price',type:'number',ph:'120'},{label:'Stock',key:'stock',type:'number',ph:'50'}].map(f=>(
              <div key={f.key} style={{marginBottom:'1rem'}}>
                <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{f.label}</label>
                <input type={f.type} placeholder={f.ph} className='inp' value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
              </div>
            ))}
            <div style={{marginBottom:'1rem'}}>
              <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Category</label>
              <select value={form.category_id} onChange={e=>setForm(p=>({...p,category_id:e.target.value}))} className='inp' style={{cursor:'pointer'}}>
                <option value=''>Select…</option>
                {categories.map((c:any)=><option key={c.id} value={c.id} style={{background:'#1a1a2e'}}>{c.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Type</label>
              <div style={{display:'flex',gap:8}}>
                {['MEAL','DRINK'].map(t=>(
                  <button key={t} onClick={()=>setForm(p=>({...p,item_type:t}))} style={{flex:1,padding:'0.55rem',borderRadius:8,border:'1px solid',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',background:form.item_type===t?'linear-gradient(135deg,#E85D24,#F59E0B)':'rgba(255,255,255,0.04)',color:form.item_type===t?'#fff':'rgba(255,255,255,0.4)',borderColor:form.item_type===t?'#E85D24':'rgba(255,255,255,0.1)'}}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1.5rem'}}>
              <button onClick={()=>setForm(p=>({...p,is_available:!p.is_available}))} style={{width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',background:form.is_available?'#E85D24':'rgba(255,255,255,0.1)',position:'relative',transition:'background 0.2s'}}>
                <span style={{position:'absolute',top:3,width:18,height:18,borderRadius:9,background:'#fff',transition:'left 0.2s',left:form.is_available?'23px':'3px'}}/>
              </button>
              <span style={{fontSize:'0.85rem',color:form.is_available?'#E85D24':'rgba(255,255,255,0.35)'}}>{form.is_available?'Available':'Unavailable'}</span>
            </div>
            <button onClick={saveItem} disabled={saving} style={{width:'100%',background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:11,padding:'0.85rem',fontSize:'0.9rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',opacity:saving?0.6:1,boxShadow:'0 4px 16px rgba(232,93,36,0.3)'}}>
              {saving?'Saving…':editing?'Save Changes':'Add Item'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.inp{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.75rem 0.9rem;font-size:0.9rem;font-family:DM Sans,sans-serif;color:#fff;outline:none;transition:all 0.15s;width:100%}
.inp:focus{border-color:#E85D24;background:rgba(232,93,36,0.08);box-shadow:0 0 0 3px rgba(232,93,36,0.12)}
`

export default function SettingsPage() {
  const [slots, setSlots] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({open_time:'07:00',close_time:'17:00',slot_interval_minutes:15,is_open:true})

  useEffect(()=>{ fetchSettings() },[])

  async function fetchSettings() {
    try {
      const [s,sl] = await Promise.all([api.get('/admin/settings'),api.get('/admin/settings/slots')])
      const d=s.data?.settings??s.data
      if(d) setForm({open_time:d.open_time??'07:00',close_time:d.close_time??'17:00',slot_interval_minutes:d.slot_interval_minutes??15,is_open:d.is_open??true})
      const slotsData=sl.data?.slots??sl.data??[]
      setSlots(Array.isArray(slotsData)?slotsData:[])
    } catch(e){console.error(e)}
  }

  async function save() {
    setSaving(true)
    try { await api.put('/admin/settings',form); setSaved(true); setTimeout(()=>setSaved(false),2500); await fetchSettings() }
    catch(e){console.error(e)} finally{setSaving(false)}
  }

  return (
    <>
      <style>{GS}</style>
      <div style={{padding:'2rem',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#0a0a0f',maxWidth:680}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',margin:'0 0 0.3rem',letterSpacing:'-0.03em',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Settings</h1>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.9rem',marginBottom:'2rem'}}>Canteen hours and pickup slot configuration</p>

        <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',padding:'1.75rem',marginBottom:'1.25rem'}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#fff',margin:'0 0 1.5rem'}}>Operating Hours</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.25rem'}}>
            {[{label:'Open Time',key:'open_time'},{label:'Close Time',key:'close_time'}].map(f=>(
              <div key={f.key}>
                <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{f.label}</label>
                <input type='time' className='inp' value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} style={{colorScheme:'dark'}} />
              </div>
            ))}
          </div>
          <div style={{marginBottom:'1.5rem'}}>
            <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Slot Interval</label>
            <select value={form.slot_interval_minutes} onChange={e=>setForm(p=>({...p,slot_interval_minutes:parseInt(e.target.value)}))} className='inp' style={{width:160,cursor:'pointer'}}>
              {[5,10,15,20,30].map(n=><option key={n} value={n} style={{background:'#1a1a2e'}}>{n} minutes</option>)}
            </select>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button onClick={()=>setForm(p=>({...p,is_open:!p.is_open}))} style={{width:52,height:28,borderRadius:14,border:'none',cursor:'pointer',background:form.is_open?'#E85D24':'rgba(255,255,255,0.1)',position:'relative',transition:'background 0.2s',flexShrink:0}}>
              <span style={{position:'absolute',top:3,width:22,height:22,borderRadius:11,background:'#fff',transition:'left 0.2s',left:form.is_open?'27px':'3px',boxShadow:'0 2px 6px rgba(0,0,0,0.3)'}}/>
            </button>
            <div>
              <div style={{fontWeight:600,color:form.is_open?'#E85D24':'rgba(255,255,255,0.4)',fontSize:'0.9rem'}}>{form.is_open?'Canteen is Open':'Canteen is Closed'}</div>
              <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.3)'}}>Students {form.is_open?'can':'cannot'} place orders</div>
            </div>
          </div>
        </div>

        {slots.length>0&&(
          <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',padding:'1.75rem',marginBottom:'1.25rem'}}>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#fff',margin:'0 0 1rem'}}>Generated Pickup Slots</h2>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {slots.map((slot:string)=>(
                <span key={slot} style={{background:'rgba(232,93,36,0.1)',color:'#F59E0B',borderRadius:8,padding:'0.35rem 0.85rem',fontSize:'0.8rem',fontWeight:600,border:'1px solid rgba(245,158,11,0.2)'}}>{slot}</span>
              ))}
            </div>
          </div>
        )}

        <button onClick={save} disabled={saving} style={{background:saved?'linear-gradient(135deg,#1D9E75,#34D399)':'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:12,padding:'0.9rem 2.5rem',fontSize:'0.95rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',opacity:saving?0.6:1,boxShadow:'0 4px 16px rgba(232,93,36,0.3)',transition:'background 0.3s'}}>
          {saved?'✓ Saved!':saving?'Saving…':'Save Settings'}
        </button>
      </div>
    </>
  )
}

'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.bar{border-radius:4px 4px 0 0;transition:height 0.4s,background 0.2s;cursor:default}
.bar:hover{filter:brightness(1.3)}
`

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{ fetchReport() },[date])

  async function fetchReport() {
    setLoading(true)
    try { const r=await api.get(`/reports/daily?date=${date}`); setReport(r.data) }
    catch(e){console.error(e); setReport(null)} finally{setLoading(false)}
  }

  const hourly:any[] = Array.isArray(report?.hourly_breakdown) ? report.hourly_breakdown : []
  const maxCount = Math.max(...hourly.map((h:any)=>h.count||0),1)

  return (
    <>
      <style>{GS}</style>
      <div style={{padding:'2rem',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#0a0a0f'}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:'1.5rem',marginBottom:'2rem',flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',margin:0,letterSpacing:'-0.03em',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Reports</h1>
            <p style={{color:'rgba(255,255,255,0.4)',margin:'0.3rem 0 0',fontSize:'0.9rem'}}>Daily summary</p>
          </div>
          <input type='date' value={date} max={today} onChange={e=>setDate(e.target.value)}
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'0.65rem 0.9rem',fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif',outline:'none',color:'#fff',cursor:'pointer',colorScheme:'dark'}} />
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:'4rem',color:'rgba(255,255,255,0.3)'}}>Loading report…</div>
        ) : !report ? (
          <div style={{textAlign:'center',padding:'4rem'}}>
            <div style={{fontSize:'3rem',marginBottom:'1rem'}}>📊</div>
            <div style={{color:'rgba(255,255,255,0.3)'}}>No data for this date</div>
          </div>
        ) : (<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1rem',marginBottom:'2rem'}}>
            {[
              {label:'Total Orders',  value:report.total_orders??0,     accent:'#E85D24', bg:'linear-gradient(135deg,#1a1a2e,#16213e)'},
              {label:'Revenue',       value:`Rs ${Number(report.revenue??0).toLocaleString()}`, accent:'#34D399', bg:'linear-gradient(135deg,#001a12,#002a1e)'},
              {label:'Cancelled',     value:report.cancelled??0,        accent:'#F87171', bg:'linear-gradient(135deg,#1a0505,#2a0808)'},
              {label:'Top Item',      value:report.top_item??'—',       accent:'#F59E0B', bg:'linear-gradient(135deg,#1a1200,#2a1e00)'},
            ].map(c=>(
              <div key={c.label} style={{background:c.bg,borderRadius:16,padding:'1.5rem',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'0.6rem'}}>{c.label}</div>
                <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:typeof c.value==='string'&&c.value.length>10?'1.1rem':'2rem',color:c.accent,lineHeight:1}}>{c.value}</div>
              </div>
            ))}
          </div>

          {hourly.length>0&&(
            <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',padding:'1.75rem',marginBottom:'1.5rem'}}>
              <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#fff',margin:'0 0 1.5rem'}}>Orders by Hour</h2>
              <div style={{display:'flex',alignItems:'flex-end',gap:6,height:160}}>
                {hourly.map((h:any,i:number)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:0}}>
                    <span style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.4)',fontWeight:600}}>{h.count||0}</span>
                    <div className='bar' style={{width:'100%',background:`linear-gradient(180deg,#E85D24,#F59E0B)`,height:`${Math.round(((h.count||0)/maxCount)*120)}px`,minHeight:4}}/>
                    <span style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',width:'100%',textAlign:'center'}}>{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(report.orders)&&report.orders.length>0&&(
            <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden'}}>
              <div style={{padding:'1.1rem 1.5rem',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1rem',color:'#fff',margin:0}}>Order Details</h2>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.03)'}}>
                    {['Token','Student','Items','Amount','Status','Pickup'].map(h=>(
                      <th key={h} style={{padding:'0.7rem 1rem',textAlign:'left',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.orders.map((o:any,i:number)=>(
                    <tr key={i} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:'0.85rem 1rem',fontFamily:'Syne,sans-serif',fontWeight:800,color:'#E85D24'}}>#{String(o.token_number??0).padStart(3,'0')}</td>
                      <td style={{padding:'0.85rem 1rem',color:'rgba(255,255,255,0.75)'}}>{o.student_name??'—'}</td>
                      <td style={{padding:'0.85rem 1rem',color:'rgba(255,255,255,0.5)'}}>{o.item_count??'—'}</td>
                      <td style={{padding:'0.85rem 1rem',fontWeight:600,color:'#F59E0B'}}>Rs {Number(o.total_amount??0).toLocaleString()}</td>
                      <td style={{padding:'0.85rem 1rem',color:'rgba(255,255,255,0.4)',fontSize:'0.8rem'}}>{o.status}</td>
                      <td style={{padding:'0.85rem 1rem',color:'rgba(255,255,255,0.4)',fontSize:'0.8rem'}}>{o.pickup_time??'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}
      </div>
    </>
  )
}

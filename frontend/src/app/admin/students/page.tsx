'use client'
import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'

const GS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box}
.inp{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.75rem 0.9rem;font-size:0.9rem;font-family:DM Sans,sans-serif;color:#fff;outline:none;transition:all 0.15s}
.inp::placeholder{color:rgba(255,255,255,0.25)}
.inp:focus{border-color:#E85D24;background:rgba(232,93,36,0.08);box-shadow:0 0 0 3px rgba(232,93,36,0.12)}
.tr:hover{background:rgba(232,93,36,0.05)!important}
`

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({name:'',email:'',phone:'',college_id:''})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(()=>{ fetchStudents() },[])

  async function fetchStudents() {
    try {
      const r = await api.get('/admin/students')
      const data = r.data?.students ?? r.data
      setStudents(Array.isArray(data) ? data : [])
    } catch(e){ console.error(e) } finally{ setLoading(false) }
  }

  async function addStudent() {
    setSaving(true)
    try { await api.post('/admin/students',form); await fetchStudents(); setShowForm(false); setForm({name:'',email:'',phone:'',college_id:''}) }
    catch(e){ console.error(e) } finally{ setSaving(false) }
  }

  async function bulkImport(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file) return
    setImporting(true); setImportResult(null)
    const fd=new FormData(); fd.append('file',file)
    try { const r=await api.post('/admin/students/bulk',fd,{headers:{'Content-Type':'multipart/form-data'}}); setImportResult(r.data); await fetchStudents() }
    catch(e:any){ setImportResult({error:e.response?.data?.error||'Import failed'}) }
    finally{ setImporting(false); if(fileRef.current) fileRef.current.value='' }
  }

  const filtered = students.filter(s=>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.college_id?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{GS}</style>
      <div style={{padding:'2rem',fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#0a0a0f'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.75rem',flexWrap:'wrap',gap:'1rem'}}>
          <div>
            <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'2rem',margin:0,letterSpacing:'-0.03em',background:'linear-gradient(90deg,#fff,#F59E0B)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Students</h1>
            <p style={{color:'rgba(255,255,255,0.4)',margin:'0.3rem 0 0',fontSize:'0.9rem'}}>{students.length} registered</p>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>fileRef.current?.click()} disabled={importing} style={{padding:'0.65rem 1.1rem',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',fontSize:'0.85rem',fontWeight:600,cursor:'pointer',color:'rgba(255,255,255,0.6)',fontFamily:'DM Sans,sans-serif',transition:'all 0.15s'}}>
              {importing?'Importing…':'📥 Bulk CSV'}
            </button>
            <input ref={fileRef} type='file' accept='.csv' onChange={bulkImport} style={{display:'none'}} />
            <button onClick={()=>setShowForm(true)} style={{background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:11,padding:'0.65rem 1.4rem',fontSize:'0.88rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 16px rgba(232,93,36,0.3)'}}>+ Add Student</button>
          </div>
        </div>

        {importResult && (
          <div style={{marginBottom:'1rem',padding:'0.75rem 1rem',borderRadius:10,background:importResult.error?'rgba(239,68,68,0.1)':'rgba(29,158,117,0.1)',border:`1px solid ${importResult.error?'rgba(239,68,68,0.25)':'rgba(29,158,117,0.25)'}`,color:importResult.error?'#F87171':'#34D399',fontSize:'0.85rem'}}>
            {importResult.error?`Error: ${importResult.error}`:`✓ ${importResult.created} created, ${importResult.errors??0} errors`}
          </div>
        )}

        <div style={{marginBottom:'1rem'}}>
          <input className='inp' type='text' placeholder='🔍  Search by name, email or college ID…' value={search} onChange={e=>setSearch(e.target.value)} style={{maxWidth:420}} />
        </div>

        <div style={{background:'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',borderRadius:16,border:'1px solid rgba(255,255,255,0.08)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr style={{background:'rgba(255,255,255,0.03)'}}>
                {['College ID','Name','Email','Phone','Joined','Status'].map(h=>(
                  <th key={h} style={{padding:'0.75rem 1rem',textAlign:'left',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(<tr><td colSpan={6} style={{padding:'3rem',textAlign:'center',color:'rgba(255,255,255,0.2)'}}>Loading…</td></tr>)
              :filtered.length===0?(<tr><td colSpan={6} style={{padding:'3rem',textAlign:'center'}}>
                <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>👥</div>
                <div style={{color:'rgba(255,255,255,0.3)'}}>No students found</div>
              </td></tr>)
              :filtered.map((s:any,i:number)=>(
                <tr key={s.id??i} className='tr' style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'0.9rem 1rem',fontFamily:'monospace',fontWeight:600,color:'#E85D24',fontSize:'0.85rem'}}>{s.college_id}</td>
                  <td style={{padding:'0.9rem 1rem',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{s.name}</td>
                  <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.4)',fontSize:'0.82rem'}}>{s.email}</td>
                  <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.4)',fontSize:'0.82rem'}}>{s.phone??'—'}</td>
                  <td style={{padding:'0.9rem 1rem',color:'rgba(255,255,255,0.3)',fontSize:'0.78rem'}}>{s.created_at?new Date(s.created_at).toLocaleDateString('en-NP',{day:'numeric',month:'short',year:'numeric'}):'—'}</td>
                  <td style={{padding:'0.9rem 1rem'}}>
                    {s.must_change_password&&<span style={{background:'rgba(245,158,11,0.15)',color:'#F59E0B',borderRadius:6,padding:'0.2rem 0.6rem',fontSize:'0.7rem',fontWeight:700,border:'1px solid rgba(245,158,11,0.25)'}}>Must Reset</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showForm&&(
          <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,backdropFilter:'blur(4px)'}}>
            <div style={{background:'linear-gradient(135deg,#12121e,#1a0a02)',borderRadius:20,padding:'2rem',width:'100%',maxWidth:420,boxShadow:'0 24px 80px rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
                <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.1rem',color:'#fff',margin:0}}>Add Student</h3>
                <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontSize:'1.4rem',cursor:'pointer',color:'rgba(255,255,255,0.4)'}}>×</button>
              </div>
              {[{label:'Full Name',key:'name',type:'text',ph:'e.g. Aarav Sharma'},{label:'College Email',key:'email',type:'email',ph:'student@tcmit.edu.np'},{label:'Phone',key:'phone',type:'text',ph:'98XXXXXXXX'},{label:'College ID',key:'college_id',type:'text',ph:'e.g. TCMIT001'}].map(f=>(
                <div key={f.key} style={{marginBottom:'1rem'}}>
                  <label style={{display:'block',fontSize:'0.65rem',fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} className='inp' value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} />
                </div>
              ))}
              <p style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.3)',marginBottom:'1.25rem'}}>🔐 Password defaults to College ID</p>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'0.75rem',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',fontSize:'0.88rem',fontWeight:600,cursor:'pointer',color:'rgba(255,255,255,0.5)',fontFamily:'DM Sans,sans-serif'}}>Cancel</button>
                <button onClick={addStudent} disabled={saving} style={{flex:2,padding:'0.75rem',borderRadius:10,border:'none',background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',fontSize:'0.88rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',opacity:saving?0.6:1}}>
                  {saving?'Adding…':'Add Student'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

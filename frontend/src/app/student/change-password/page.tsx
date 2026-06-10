'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({current_password:'',new_password:'',confirm_password:''})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e:React.FormEvent) {
    e.preventDefault()
    if(form.new_password!==form.confirm_password){setError('Passwords do not match');return}
    if(form.new_password.length<6){setError('Password must be at least 6 characters');return}
    setError('');setLoading(true)
    try {
      await api.post('/auth/change-password',{current_password:form.current_password,new_password:form.new_password})
      router.push('/student/home')
    } catch(e:any){setError(e.response?.data?.error||'Failed to change password')}
    finally{setLoading(false)}
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@400;500;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      .inp{width:100%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:11px;padding:0.8rem 1rem;font-size:0.95rem;font-family:DM Sans,sans-serif;color:#fff;outline:none;transition:all 0.15s}
      .inp::placeholder{color:rgba(255,255,255,0.3)}
      .inp:focus{border-color:#E85D24;background:rgba(255,255,255,0.12);box-shadow:0 0 0 3px rgba(232,93,36,0.2)}
      `}</style>
      <main style={{minHeight:'100vh',background:'linear-gradient(135deg,#0D1535 0%,#1B2A6B 60%,#2a1060 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif',padding:'1rem'}}>
        <div style={{width:'100%',maxWidth:420,background:'rgba(255,255,255,0.10)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.18)',borderRadius:24,padding:'2.75rem 2.25rem',boxShadow:'0 8px 60px rgba(0,0,0,0.5)'}}>
          <div style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:'0.75rem 1rem',marginBottom:'1.5rem',fontSize:'0.85rem',color:'#FCD34D'}}>
            🔐 First login — please set a new password
          </div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.6rem',color:'#fff',marginBottom:'0.25rem',letterSpacing:'-0.03em'}}>Set your password</h2>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.85rem',marginBottom:'1.75rem'}}>Your current password is your College ID</p>
          {error && <div style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.35)',borderRadius:9,padding:'0.65rem 0.9rem',fontSize:'0.84rem',color:'#FCA5A5',marginBottom:'1rem'}}>{error}</div>}
          <form onSubmit={submit}>
            {[
              {label:'Current Password (College ID)',key:'current_password',placeholder:'Your college ID'},
              {label:'New Password',key:'new_password',placeholder:'Min. 6 characters'},
              {label:'Confirm New Password',key:'confirm_password',placeholder:'Repeat new password'},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:'1rem'}}>
                <label style={{display:'block',fontSize:'0.68rem',fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{f.label}</label>
                <input type='password' className='inp' placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} required />
              </div>
            ))}
            <button type='submit' disabled={loading} style={{width:'100%',marginTop:'0.75rem',background:'linear-gradient(135deg,#E85D24,#F59E0B)',color:'#fff',border:'none',borderRadius:12,padding:'0.92rem',fontSize:'0.97rem',fontWeight:600,cursor:'pointer',fontFamily:'DM Sans,sans-serif',boxShadow:'0 4px 20px rgba(232,93,36,0.4)',opacity:loading?0.5:1}}>
              {loading?'Saving…':'Set Password & Continue →'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}

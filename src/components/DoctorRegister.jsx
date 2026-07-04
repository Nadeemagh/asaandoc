// src/components/DoctorRegister.jsx
// Doctor self-registration form — submits for admin approval
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const C = {
  teal:"#2ABFBF", tealDark:"#1a9999", tealLight:"#e8f9f9",
  navy:"#1B3A5C", white:"#fff", gray50:"#f8fafc",
  gray100:"#f1f5f9", gray200:"#e2e8f0", gray400:"#94a3b8",
  gray600:"#475569", gray800:"#1e293b", red:"#ef4444", green:"#10b981",
};

const SPECIALTIES = [
  "General Physician","Cardiologist","Dermatologist","Endocrinologist",
  "Gastroenterologist","Gynecologist","Neurologist","Nutritionist & Dietitian",
  "Ophthalmologist","Orthopedic","Pediatrician","Psychiatrist",
  "Pulmonologist","Urologist","ENT Specialist","Diabetologist",
  "Rheumatologist","Oncologist","Nephrologist","Hematologist",
];

const inp = (focused) => ({
  width:"100%", boxSizing:"border-box",
  padding:"11px 14px",
  border:`2px solid ${focused?C.teal:C.gray200}`,
  borderRadius:10, fontSize:14, fontFamily:"inherit",
  outline:"none", color:C.gray800,
  background: focused?"#f0fdfd":C.white,
  transition:"all 0.2s",
  boxShadow: focused?"0 0 0 4px rgba(42,191,191,0.1)":"none",
});

export default function DoctorRegister({ onBack }) {
  const [step,     setStep]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState("");
  const [focused,  setFocused]  = useState(null);

  const [form, setForm] = useState({
    name:"", email:"", password:"", phone:"",
    specialty:"", qualifications:"", pmcNo:"",
    exp:"", bio:"", clinicName:"", clinicAddress:"", fee:"",
  });

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSubmit = async () => {
    if (!form.name||!form.email||!form.password||!form.specialty||!form.pmcNo) {
      setError("Please fill all required fields."); return;
    }
    setError(""); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });
      await setDoc(doc(db,"doctors",cred.user.uid), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        specialty: form.specialty,
        qualifications: form.qualifications,
        pmcNo: form.pmcNo,
        exp: form.exp,
        bio: form.bio,
        clinics: form.clinicName ? [{
          name: form.clinicName,
          address: form.clinicAddress,
          fee: Number(form.fee)||0,
          days:[], slots:[], isOnline:false,
        }] : [],
        approved: false, // Admin must approve
        active: false,
        role: "doctor",
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch(e) {
      const msgs = {
        "auth/email-already-in-use":"This email is already registered.",
        "auth/weak-password":"Password must be at least 6 characters.",
        "auth/invalid-email":"Please enter a valid email address.",
      };
      setError(msgs[e.code]||e.message);
    }
    setLoading(false);
  };

  if (success) return (
    <div style={{textAlign:"center",padding:"48px 24px",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{fontSize:80,marginBottom:16,animation:"successPop 0.5s ease-out",display:"inline-block"}}>✅</div>
      <h2 style={{fontSize:22,fontWeight:800,color:C.navy,margin:"0 0 12px"}}>Application Submitted!</h2>
      <p style={{color:C.gray600,fontSize:15,lineHeight:1.7,maxWidth:400,margin:"0 auto 24px"}}>
        Your registration is under review. Our admin team will verify your PMC credentials and approve your account within <strong>24-48 hours</strong>.
      </p>
      <div style={{padding:"16px 20px",background:C.tealLight,borderRadius:12,border:`1.5px solid ${C.teal}`,maxWidth:400,margin:"0 auto",fontSize:13,color:C.navy,lineHeight:1.7}}>
        📧 You'll receive an email at <strong>{form.email}</strong> once approved.<br/>
        📱 You can also contact us at <strong>support@asaandoc.com</strong>
      </div>
      <style>{`@keyframes successPop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
    </div>
  );

  const steps = ["Personal Info","Professional Details","Clinic Setup"];

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:600,margin:"0 auto"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${C.navy},#2d5a8e)`,borderRadius:16,padding:"24px 28px",marginBottom:20,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,fontSize:80,opacity:0.06}}>👨‍⚕️</div>
        <div style={{fontSize:20,fontWeight:900,color:"#fff",marginBottom:4}}>
          Doctor Registration
        </div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>
          Join AsaanDoc — Pakistan's trusted healthcare platform
        </div>
        {/* Step indicator */}
        <div style={{display:"flex",gap:8,marginTop:16}}>
          {steps.map((s,i)=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
              <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0,
                background:step>i+1?"#10b981":step===i+1?C.teal:"rgba(255,255,255,0.2)",
                color:"#fff",border:step===i+1?"3px solid rgba(255,255,255,0.4)":"none"}}>
                {step>i+1?"✓":i+1}
              </div>
              <div style={{fontSize:10,color:step===i+1?"#fff":"rgba(255,255,255,0.4)",fontWeight:step===i+1?700:400,flex:1}}>{s}</div>
              {i<steps.length-1&&<div style={{width:20,height:2,background:"rgba(255,255,255,0.2)",flexShrink:0}}/>}
            </div>
          ))}
        </div>
      </div>

      {error&&<div style={{marginBottom:16,padding:"12px 16px",background:"#fef2f2",border:"2px solid #fecaca",borderRadius:12,fontSize:13,color:C.red,fontWeight:600}}>⚠️ {error}</div>}

      {/* Step 1 — Personal Info */}
      {step===1&&(
        <div style={{animation:"fadeUp 0.4s ease-out"}}>
          <div style={{background:C.white,borderRadius:14,padding:"22px",border:`1px solid ${C.gray200}`,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:16}}>👤 Personal Information</div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Full Name *</label>
              <input value={form.name} onChange={e=>f("name",e.target.value)} placeholder="e.g. Dr. Ahmed Khan"
                style={inp(focused==="name")} onFocus={()=>setFocused("name")} onBlur={()=>setFocused(null)}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Email Address *</label>
              <input type="email" value={form.email} onChange={e=>f("email",e.target.value)} placeholder="doctor@example.com"
                style={inp(focused==="email")} onFocus={()=>setFocused("email")} onBlur={()=>setFocused(null)}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Password *</label>
              <input type="password" value={form.password} onChange={e=>f("password",e.target.value)} placeholder="Minimum 6 characters"
                style={inp(focused==="password")} onFocus={()=>setFocused("password")} onBlur={()=>setFocused(null)}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Phone Number</label>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:12,fontWeight:700,color:C.gray600,pointerEvents:"none"}}>+92</div>
                <input type="tel" value={form.phone} onChange={e=>f("phone",e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="3001234567"
                  style={{...inp(focused==="phone"),paddingLeft:52}} onFocus={()=>setFocused("phone")} onBlur={()=>setFocused(null)}/>
              </div>
            </div>
          </div>
          <button onClick={()=>{if(!form.name||!form.email||!form.password){setError("Please fill required fields");return;}setError("");setStep(2);}}
            style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.teal},${C.tealDark})`,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 16px rgba(42,191,191,0.35)`}}>
            Continue →
          </button>
        </div>
      )}

      {/* Step 2 — Professional */}
      {step===2&&(
        <div style={{animation:"fadeUp 0.4s ease-out"}}>
          <div style={{background:C.white,borderRadius:14,padding:"22px",border:`1px solid ${C.gray200}`,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:16}}>🎓 Professional Details</div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Specialty *</label>
              <select value={form.specialty} onChange={e=>f("specialty",e.target.value)}
                style={{width:"100%",padding:"11px 14px",border:`2px solid ${C.gray200}`,borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none",background:C.white}}
                onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200}>
                <option value="">Select specialty…</option>
                {SPECIALTIES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Qualifications *</label>
              <input value={form.qualifications} onChange={e=>f("qualifications",e.target.value)} placeholder="e.g. MBBS, FCPS (Medicine)"
                style={inp(focused==="qual")} onFocus={()=>setFocused("qual")} onBlur={()=>setFocused(null)}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>PMC Registration Number *</label>
              <input value={form.pmcNo} onChange={e=>f("pmcNo",e.target.value)} placeholder="e.g. PMC-12345"
                style={inp(focused==="pmc")} onFocus={()=>setFocused("pmc")} onBlur={()=>setFocused(null)}/>
              <div style={{fontSize:11,color:C.gray400,marginTop:4}}>This will be verified by our admin team</div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Years of Experience</label>
              <input type="number" value={form.exp} onChange={e=>f("exp",e.target.value)} placeholder="e.g. 10"
                style={inp(focused==="exp")} onFocus={()=>setFocused("exp")} onBlur={()=>setFocused(null)}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Short Bio</label>
              <textarea value={form.bio} onChange={e=>f("bio",e.target.value)} rows={3} placeholder="Brief description of your expertise and services..."
                style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",border:`2px solid ${C.gray200}`,borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none",resize:"vertical"}}
                onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(1)} style={{flex:1,padding:"14px",borderRadius:12,border:`2px solid ${C.gray200}`,background:C.white,color:C.gray600,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
            <button onClick={()=>{if(!form.specialty||!form.pmcNo||!form.qualifications){setError("Please fill required fields");return;}setError("");setStep(3);}}
              style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.teal},${C.tealDark})`,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Clinic */}
      {step===3&&(
        <div style={{animation:"fadeUp 0.4s ease-out"}}>
          <div style={{background:C.white,borderRadius:14,padding:"22px",border:`1px solid ${C.gray200}`,marginBottom:16}}>
            <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:4}}>🏥 Clinic Information</div>
            <div style={{fontSize:12,color:C.gray400,marginBottom:16}}>Optional — you can add clinic details later from your dashboard</div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Clinic Name</label>
              <input value={form.clinicName} onChange={e=>f("clinicName",e.target.value)} placeholder="e.g. Al-Shifa Medical Center"
                style={inp(focused==="cname")} onFocus={()=>setFocused("cname")} onBlur={()=>setFocused(null)}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Clinic Address</label>
              <input value={form.clinicAddress} onChange={e=>f("clinicAddress",e.target.value)} placeholder="e.g. 24 Block A, Johar Town, Lahore"
                style={inp(focused==="caddr")} onFocus={()=>setFocused("caddr")} onBlur={()=>setFocused(null)}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Consultation Fee (PKR)</label>
              <input type="number" value={form.fee} onChange={e=>f("fee",e.target.value)} placeholder="e.g. 2000"
                style={inp(focused==="fee")} onFocus={()=>setFocused("fee")} onBlur={()=>setFocused(null)}/>
            </div>
          </div>

          {/* Summary */}
          <div style={{background:C.tealLight,border:`1.5px solid ${C.teal}`,borderRadius:12,padding:"16px 20px",marginBottom:16,fontSize:13,color:C.navy}}>
            <div style={{fontWeight:800,marginBottom:10,color:C.teal}}>📋 Registration Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              <div>👤 <strong>{form.name}</strong></div>
              <div>🏥 <strong>{form.specialty}</strong></div>
              <div>📋 <strong>PMC: {form.pmcNo}</strong></div>
              <div>⏳ <strong>{form.exp||"—"} years exp</strong></div>
            </div>
            <div style={{marginTop:10,padding:"8px 12px",background:"rgba(42,191,191,0.1)",borderRadius:8,fontSize:12,color:C.teal,fontWeight:600}}>
              ⏳ Your account will be reviewed by admin within 24-48 hours before activation.
            </div>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(2)} style={{flex:1,padding:"14px",borderRadius:12,border:`2px solid ${C.gray200}`,background:C.white,color:C.gray600,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{flex:2,padding:"14px",borderRadius:12,border:"none",background:loading?"#94a3b8":`linear-gradient(135deg,${C.teal},${C.tealDark})`,color:"#fff",fontWeight:800,fontSize:14,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              {loading?<><div style={{width:18,height:18,border:"3px solid rgba(255,255,255,0.3)",borderTop:"3px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>Submitting…</>:"✅ Submit Registration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

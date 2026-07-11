import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import DoctorRegister from "../components/DoctorRegister";
import { PENDING_CLINIC_KEY } from "./ClinicSignupPage";

const ICONS = ["💊","🩺","🏥","❤️","🔬","💉","🩻","⚕️"];

function useTypewriter(texts, speed=80, pause=2000) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(()=>{
    const current = texts[idx];
    let timeout;
    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(()=>{ setDisplay(current.slice(0,charIdx+1)); setCharIdx(c=>c+1); }, speed);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(()=>setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(()=>{ setDisplay(current.slice(0,charIdx-1)); setCharIdx(c=>c-1); }, speed/2);
    } else {
      setDeleting(false); setIdx(i=>(i+1)%texts.length);
    }
    return ()=>clearTimeout(timeout);
  },[charIdx,deleting,idx,texts,speed,pause]);
  return display;
}

export default function AuthPage() {
  // If arriving from a clinic's signup link, jump straight to Create
  // Account — landing on Sign In (the old default) made it look like
  // clicking "Join as a Patient" did nothing.
  const [tab,      setTab]      = useState(() =>
    (typeof window !== "undefined" && localStorage.getItem(PENDING_CLINIC_KEY)) ? "signup" : "signin"
  );
  const [showDoctorReg, setShowDoctorReg] = useState(false);
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [focused,  setFocused]  = useState(null);

  // If the visitor arrived via a clinic's signup link, show a small
  // banner so it's clear which clinic they're joining, rather than
  // silently tagging their account with no visible confirmation.
  const pendingClinicId = typeof window !== "undefined" ? localStorage.getItem(PENDING_CLINIC_KEY) : null;

  const typed = useTypewriter([
    "Book appointments instantly",
    "Get digital prescriptions",
    "WhatsApp notifications",
    "Connect with top doctors",
    "Manage your health easily",
  ]);

  const handleSignIn = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await signInWithEmailAndPassword(auth, email, password); setSuccess(true); }
    catch(err) { setError(friendlyError(err.code)); }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your full name."); return; }
    setError(""); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // If this signup came from a clinic's link, tag the new patient
      // with that clinic so they only ever see that clinic's doctors.
      const clinicId = localStorage.getItem(PENDING_CLINIC_KEY) || null;
      await setDoc(doc(db, "users", cred.user.uid), {
        name, email, phone, role:"patient", clinicId, createdAt: serverTimestamp()
      });
      if (clinicId) localStorage.removeItem(PENDING_CLINIC_KEY);
      setSuccess(true);
    } catch(err) { setError(friendlyError(err.code)); }
    setLoading(false);
  };

  const friendlyError = (code) => ({
    "auth/user-not-found":      "No account found with this email.",
    "auth/wrong-password":      "Incorrect password. Please try again.",
    "auth/invalid-email":       "Please enter a valid email address.",
    "auth/email-already-in-use":"This email is already registered.",
    "auth/weak-password":       "Password must be at least 6 characters.",
    "auth/too-many-requests":   "Too many attempts. Please try again later.",
    "auth/invalid-credential":  "Incorrect email or password.",
  }[code] || "Something went wrong. Please try again.");

  const inpStyle = (f) => ({
    width:"100%", boxSizing:"border-box",
    padding:"13px 14px 13px 44px",
    border:`2px solid ${focused===f?"#2ABFBF":"#e2e8f0"}`,
    borderRadius:12, fontSize:14, fontFamily:"inherit",
    outline:"none", color:"#1e293b",
    background: focused===f ? "#f0fdfd" : "#fff",
    transition:"all 0.2s",
    boxShadow: focused===f ? "0 0 0 4px rgba(42,191,191,0.12)" : "none",
  });

  const strengthColor = password.length<4?"#ef4444":password.length<7?"#f59e0b":password.length<10?"#2ABFBF":"#10b981";
  const strengthLabel = password.length<4?"Too short":password.length<7?"Could be stronger":password.length<10?"Good":"Strong ✓";

  return (
    <div style={{ minHeight:"100vh", display:"flex", fontFamily:"'Segoe UI',system-ui,sans-serif", overflow:"hidden" }}>
      <style>{`
        @keyframes floatIcon { 0%,100%{transform:translateY(0) rotate(0)} 33%{transform:translateY(-18px) rotate(5deg)} 66%{transform:translateY(8px) rotate(-3deg)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.06);opacity:0.85} }
        @keyframes slideInLeft { from{transform:translateX(-30px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes fadeInUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes successPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
        @keyframes blink { 50%{opacity:0} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .stat-hover:hover{transform:translateY(-4px)!important;background:rgba(42,191,191,0.18)!important;transition:all 0.2s!important}
        .feat-hover:hover .feat-icon{transform:scale(1.25) rotate(8deg)!important;transition:transform 0.2s!important}
        .submit-btn:hover:not(:disabled){transform:translateY(-2px)!important;box-shadow:0 10px 28px rgba(42,191,191,0.5)!important}
        @media(max-width:768px){.left-panel{display:none!important}.right-panel{width:100%!important;padding:32px 24px!important}}
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="left-panel" style={{
        flex:1, position:"relative", overflow:"hidden",
        background:"linear-gradient(160deg,#0a1f35 0%,#1B3A5C 45%,#0d4a5a 80%,#0a3d3d 100%)",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
        padding:"48px 52px", minHeight:"100vh",
      }}>
        {/* Floating icons */}
        {ICONS.map((icon,i)=>(
          <div key={i} style={{
            position:"absolute", fontSize:i%2===0?28:20, opacity:0.1, pointerEvents:"none",
            top:`${8+i*11}%`, left:`${4+i*11}%`,
            animation:`floatIcon ${5+i*0.5}s ease-in-out ${i*0.8}s infinite`,
          }}>{icon}</div>
        ))}
        {/* Glowing orbs */}
        <div style={{ position:"absolute", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(42,191,191,0.18) 0%,transparent 70%)", pointerEvents:"none", animation:"pulse 4s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", bottom:-80, left:-80, width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,rgba(42,191,191,0.1) 0%,transparent 70%)", pointerEvents:"none", animation:"pulse 5s ease-in-out infinite 1.5s" }}/>

        {/* Logo */}
        <div style={{ animation:"slideInLeft 0.6s ease-out" }}>
          <div style={{ fontSize:32, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>
            asaan<span style={{ color:"#2ABFBF" }}>doc</span>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4, fontFamily:"serif", letterSpacing:"0.05em" }}>صحت کا آسان راستہ</div>
        </div>

        {/* Main content */}
        <div style={{ animation:"fadeInUp 0.8s ease-out 0.2s both" }}>
          {/* Animated cross */}
          <div style={{ marginBottom:24, display:"inline-block", animation:"pulse 3s ease-in-out infinite" }}>
            <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
              <circle cx="34" cy="34" r="34" fill="rgba(42,191,191,0.15)"/>
              <circle cx="34" cy="34" r="24" fill="rgba(42,191,191,0.2)"/>
              <rect x="26" y="14" width="16" height="40" rx="5" fill="#2ABFBF"/>
              <rect x="14" y="26" width="40" height="16" rx="5" fill="#2ABFBF"/>
              <circle cx="34" cy="34" r="5" fill="#0d4a5a"/>
            </svg>
          </div>

          <h1 style={{ fontSize:32, fontWeight:900, color:"#fff", lineHeight:1.2, margin:"0 0 10px", letterSpacing:"-0.5px" }}>
            1000+ Qualified &<br/>
            <span style={{ color:"#2ABFBF" }}>Experienced</span><br/>
            Doctors Connected
          </h1>

          {/* Typewriter */}
          <div style={{ height:26, marginBottom:28 }}>
            <span style={{ fontSize:14, color:"rgba(255,255,255,0.55)", fontWeight:500 }}>
              ✦ {typed}<span style={{ animation:"blink 1s step-end infinite", color:"#2ABFBF", fontWeight:700 }}>|</span>
            </span>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            {[["1000","Qualified Doctors"],["10,000","Patients Served"],["24/7","Support"]].map(([n,l])=>(
              <div key={l} className="stat-hover" style={{ flex:1, padding:"12px 8px", borderRadius:12, background:"rgba(42,191,191,0.08)", border:"1px solid rgba(42,191,191,0.2)", textAlign:"center", cursor:"default", transition:"all 0.2s" }}>
                <div style={{ fontSize:17, fontWeight:900, color:"#2ABFBF", display:"flex", alignItems:"center", justifyContent:"center", gap:1 }}>
                  {n}<span style={{
                    fontWeight:900, fontSize:18,
                    background:"linear-gradient(90deg, #2ABFBF 50%, #ef4444 50%)",
                    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                    backgroundClip:"text",
                  }}>+</span>
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.45)", marginTop:3, lineHeight:1.3 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* 20% Lab Test Discount Banner */}
          <div style={{
            marginBottom:16, padding:"12px 16px", borderRadius:12,
            background:"linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))",
            border:"1.5px solid rgba(239,68,68,0.4)",
            display:"flex", alignItems:"center", gap:12,
            animation:"pulse 3s ease-in-out infinite",
            boxShadow:"0 0 20px rgba(239,68,68,0.15)",
          }}>
            <div style={{ fontSize:28, flexShrink:0 }}>🧪</div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:20, fontWeight:900, color:"#ef4444", textShadow:"0 0 12px rgba(239,68,68,0.7)" }}>20% OFF</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"rgba(239,68,68,0.3)", padding:"2px 8px", borderRadius:20 }}>LIMITED</span>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2 }}>
                On all Lab Tests — Book through AsaanDoc & save!
              </div>
            </div>
          </div>

          {/* Features */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[["💊","Digital Prescriptions","Issued instantly by doctors"],["📅","Easy Appointments","Book in seconds, 24/7"],["📱","WhatsApp Updates","Real-time notifications"],["🔒","100% Secure","Your health data is safe"]].map(([icon,title,desc])=>(
              <div key={title} className="feat-hover" style={{ display:"flex", alignItems:"center", gap:12, cursor:"default" }}>
                <div className="feat-icon" style={{ width:36, height:36, borderRadius:9, background:"rgba(42,191,191,0.12)", border:"1px solid rgba(42,191,191,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0, transition:"transform 0.2s" }}>{icon}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{title}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with website */}
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          <a href="https://www.asaandoc.com" target="_blank" rel="noreferrer"
            style={{ fontSize:12, color:"#2ABFBF", fontWeight:700, textDecoration:"none", letterSpacing:"0.05em" }}>
            🌐 www.asaandoc.com
          </a>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.2)" }}>© 2025 AsaanDoc · Pakistan's Health Platform</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right-panel" style={{
        width:460, background:"#fff", display:"flex", flexDirection:"column",
        justifyContent:"center", padding:"40px 44px",
        boxShadow:"-8px 0 48px rgba(0,0,0,0.1)",
        minHeight:"100vh", overflowY:"auto",
      }}>

        {showDoctorReg ? (
          <div>
            <button onClick={()=>setShowDoctorReg(false)} style={{background:"none",border:"none",color:"#2ABFBF",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16,padding:0,fontFamily:"inherit"}}>← Back to Sign In</button>
            <DoctorRegister onBack={()=>setShowDoctorReg(false)}/>
          </div>
        ) : success ? (
          <div style={{ textAlign:"center", animation:"fadeInUp 0.5s ease-out" }}>
            <div style={{ fontSize:80, animation:"successPop 0.5s ease-out", display:"inline-block", marginBottom:16 }}>✅</div>
            <h2 style={{ fontSize:22, fontWeight:800, color:"#1B3A5C", margin:"0 0 8px" }}>
              {tab==="signin"?"Welcome back!":"Account created!"}
            </h2>
            <p style={{ color:"#94a3b8", fontSize:14 }}>Taking you to your portal…</p>
            <div style={{ width:36, height:36, border:"3px solid #e2e8f0", borderTop:"3px solid #2ABFBF", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"20px auto 0" }}/>
          </div>
        ) : (
          <>
            {pendingClinicId && tab==="signup" && (
              <div style={{ marginBottom:16, padding:"11px 14px", background:"#e8f9f9", border:"1.5px solid #2ABFBF", borderRadius:10, fontSize:12.5, color:"#1B3A5C", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
                🏥 Joining as a patient of your clinic
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:"flex", background:"#f1f5f9", borderRadius:14, padding:4, marginBottom:24, gap:4 }}>
              {[["signin","🔑 Sign In"],["signup","✨ Create Account"]].map(([id,label])=>(
                <button key={id} onClick={()=>{setTab(id);setError("");setFocused(null);}}
                  style={{ flex:1, padding:"11px 0", borderRadius:11, border:"none", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.25s", background:tab===id?"#fff":"transparent", color:tab===id?"#1B3A5C":"#94a3b8", boxShadow:tab===id?"0 2px 12px rgba(0,0,0,0.1)":"none", transform:tab===id?"scale(1.02)":"scale(1)" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Greeting */}
            <div style={{ marginBottom:20 }}>
              <h2 style={{ margin:"0 0 4px", fontSize:21, fontWeight:800, color:"#1B3A5C", letterSpacing:"-0.3px" }}>
                {tab==="signin"?"Welcome back 👋":"Join AsaanDoc 🏥"}
              </h2>
              <p style={{ margin:0, fontSize:13, color:"#94a3b8" }}>
                {tab==="signin"?"Sign in to access your health portal":"Free account · Takes just 60 seconds"}
              </p>
            </div>

            <form onSubmit={tab==="signin"?handleSignIn:handleSignUp}>
              {tab==="signup" && (<>
                {/* Name */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Full Name</label>
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>👤</span>
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Muhammad Ali" required
                      style={inpStyle("name")} onFocus={()=>setFocused("name")} onBlur={()=>setFocused(null)} />
                    {name.length>2 && <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#10b981", fontSize:14 }}>✓</span>}
                  </div>
                </div>
                {/* Phone */}
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Mobile Number <span style={{ color:"#2ABFBF", fontSize:10, fontWeight:600 }}>· WhatsApp notifications</span>
                  </label>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:12, fontWeight:700, color:focused==="phone"?"#2ABFBF":"#475569", pointerEvents:"none", transition:"color 0.2s" }}>+92</div>
                    <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                      placeholder="3001234567" maxLength={10}
                      style={{ ...inpStyle("phone"), paddingLeft:52, paddingRight:44 }}
                      onFocus={()=>setFocused("phone")} onBlur={()=>setFocused(null)} />
                    <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>📱</span>
                  </div>
                  {phone.length>0 && (
                    <div style={{ fontSize:11, marginTop:4, fontWeight:600, color:phone.length===10?"#10b981":"#f59e0b" }}>
                      {phone.length===10?"✓ Valid Pakistan number":`${10-phone.length} more digits needed`}
                    </div>
                  )}
                </div>
              </>)}

              {/* Email */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Email Address</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>✉️</span>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required
                    style={inpStyle("email")} onFocus={()=>setFocused("email")} onBlur={()=>setFocused(null)} />
                  {email.includes("@") && <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#10b981", fontSize:14 }}>✓</span>}
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#475569", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.06em" }}>Password</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>🔒</span>
                  <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="Minimum 6 characters" required
                    style={{ ...inpStyle("password"), paddingRight:46 }}
                    onFocus={()=>setFocused("password")} onBlur={()=>setFocused(null)} />
                  <button type="button" onClick={()=>setShowPass(s=>!s)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#94a3b8", padding:4 }}>
                    {showPass?"🙈":"👁"}
                  </button>
                </div>
                {/* Strength bar */}
                {password.length>0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ display:"flex", gap:4, marginBottom:3 }}>
                      {[1,2,3,4].map(i=>(
                        <div key={i} style={{ flex:1, height:3, borderRadius:10, transition:"background 0.3s",
                          background:password.length>=i*3 ? (i<=1?"#ef4444":i<=2?"#f59e0b":i<=3?"#2ABFBF":"#10b981") : "#e2e8f0" }}/>
                      ))}
                    </div>
                    <div style={{ fontSize:10, color:strengthColor, fontWeight:600 }}>{strengthLabel}</div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom:14, padding:"11px 14px", background:"#fef2f2", border:"2px solid #fecaca", borderRadius:12, fontSize:13, color:"#ef4444", fontWeight:600, display:"flex", alignItems:"center", gap:8, animation:"fadeInUp 0.3s ease-out" }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" className="submit-btn" disabled={loading}
                style={{
                  width:"100%", padding:"15px", borderRadius:12, border:"none",
                  background:loading?"#94a3b8":"linear-gradient(135deg,#2ABFBF,#1a9999 50%,#1B3A5C)",
                  color:"#fff", fontWeight:800, fontSize:14, cursor:loading?"not-allowed":"pointer",
                  fontFamily:"inherit", boxShadow:"0 4px 20px rgba(42,191,191,0.35)",
                  transition:"all 0.25s", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                }}>
                {loading ? (
                  <><div style={{ width:18, height:18, border:"3px solid rgba(255,255,255,0.3)", borderTop:"3px solid #fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/> Please wait…</>
                ) : (
                  <>{tab==="signin"?"Sign In to AsaanDoc":"Create My Free Account"} →</>
                )}
              </button>

              <div style={{ textAlign:"center", marginTop:14, fontSize:13, color:"#94a3b8" }}>
                {tab==="signin" ? (
                  <>Don't have an account?{" "}
                    <button type="button" onClick={()=>{setTab("signup");setError("");}}
                      style={{ background:"none", border:"none", color:"#2ABFBF", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", textDecoration:"underline" }}>Create one free →</button>
                  </>
                ) : (
                  <>Already registered?{" "}
                    <button type="button" onClick={()=>{setTab("signin");setError("");}}
                      style={{ background:"none", border:"none", color:"#2ABFBF", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", textDecoration:"underline" }}>Sign in →</button>
                  </>
                )}
              </div>
            </form>

            {/* Doctor registration link */}
            <div style={{ marginTop:16, textAlign:"center", padding:"14px", background:"#f0fdf4", borderRadius:12, border:"1.5px solid #86efac" }}>
              <div style={{ fontSize:12, color:"#16a34a", fontWeight:600, marginBottom:6 }}>👨‍⚕️ Are you a Doctor?</div>
              <button onClick={()=>setShowDoctorReg(true)}
                style={{ background:"none", border:"none", color:"#2ABFBF", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", textDecoration:"underline" }}>
                Register as a Doctor on AsaanDoc →
              </button>
            </div>

            {/* Divider */}
            <div style={{ margin:"18px 0 14px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ flex:1, height:1, background:"#e2e8f0" }}/>
              <span style={{ fontSize:10, color:"#cbd5e1", fontWeight:700, letterSpacing:"0.08em" }}>TRUSTED & SECURE</span>
              <div style={{ flex:1, height:1, background:"#e2e8f0" }}/>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {[["🔐","Firebase Auth"],["🏥","Medical Grade"],["🇵🇰","Pakistan"],["⚡","Fast & Reliable"]].map(([icon,text])=>(
                <div key={text} style={{ flex:1, textAlign:"center", padding:"8px 4px", borderRadius:10, background:"#f8fafc", border:"1px solid #e2e8f0" }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{icon}</div>
                  <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700, lineHeight:1.2 }}>{text}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// src/pages/AuthPage.js
import { useState } from "react";
import { T, Toast } from "../components/UI";
import { registerUser, loginUser } from "../firebase/services";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="error") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const handleSubmit = async () => {
    if (mode==="register") {
      if (!name.trim()) return showToast("Please enter your full name.");
      if (!email.trim()) return showToast("Please enter your email.");
      if (role==="patient" && !phone.trim()) return showToast("Please enter your mobile number.");
      if (password.length < 6) return showToast("Password must be at least 6 characters.");
      if (password !== confirm) return showToast("Passwords do not match.");
    }
    setLoading(true);
    try {
      if (mode==="register") {
        await registerUser({ email, password, name, role, phone: phone||"" });
        showToast("Account created! Welcome to AsaanDoc 🎉", "success");
      } else {
        await loginUser(email, password);
      }
    } catch(e) {
      const msgs = {
        "auth/email-already-in-use": "Email already registered. Please login.",
        "auth/user-not-found": "No account found. Please register.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/invalid-credential": "Invalid email or password.",
      };
      showToast(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  const inp = {
    padding:"12px 16px", borderRadius:10, border:`1.5px solid ${T.border}`,
    fontSize:14, color:T.text, width:"100%", outline:"none", fontFamily:"inherit",
    background:"#fff", transition:"border-color 0.2s",
  };
  const lbl = {
    display:"block", fontSize:11, fontWeight:700, color:T.muted,
    textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6,
  };

  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${T.primaryDark} 0%,${T.primary} 50%,#00C897 100%)`,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Inter,system-ui,sans-serif" }}>

      <div style={{ width:"100%", maxWidth:460 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <img src="/logo.png" alt="AsaanDoc" style={{ height:48, filter:"brightness(0) invert(1)", marginBottom:12 }}
            onError={e=>{e.target.style.display="none";}} />
          <div style={{ color:"rgba(255,255,255,0.9)", fontSize:13 }}>صحت کا آسان راستہ</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:4 }}>
            Pakistan's Online Healthcare Platform
          </div>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:20, padding:32, boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
          {/* Tabs */}
          <div style={{ display:"flex", background:T.bg, borderRadius:12, padding:4, marginBottom:24 }}>
            {[["login","Sign In"],["register","Create Account"]].map(([m,label])=>(
              <button key={m} onClick={()=>setMode(m)}
                style={{ flex:1, padding:"10px", borderRadius:9, border:"none", cursor:"pointer",
                  fontWeight:700, fontSize:13, transition:"all 0.2s",
                  background:mode===m?"#fff":"transparent",
                  color:mode===m?T.primary:T.muted,
                  boxShadow:mode===m?"0 2px 8px rgba(0,0,0,0.1)":"none" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Role selector - only on register */}
          {mode==="register" && (
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>I Am A</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[["patient","🧑","Patient"],["doctor","👨‍⚕️","Doctor"]].map(([r,icon,label])=>(
                  <button key={r} onClick={()=>setRole(r)}
                    style={{ padding:"14px", borderRadius:12, cursor:"pointer", textAlign:"center",
                      border:`2px solid ${role===r?T.primary:T.border}`,
                      background:role===r?T.primaryLight:"#fff",
                      color:role===r?T.primary:T.muted, fontWeight:700, fontSize:13 }}>
                    <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          {mode==="register" && (
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Full Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ahmed Ali" style={inp}/>
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Email Address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="you@example.com" style={inp}/>
          </div>

          {/* Phone - only for patients on register */}
          {mode==="register" && role==="patient" && (
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Mobile Number <span style={{ color:"#EF4444" }}>*</span></label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                  fontSize:13, color:T.muted, fontWeight:600 }}>+92</span>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                  placeholder="3001234567" maxLength={10}
                  style={{ ...inp, paddingLeft:52 }}/>
              </div>
              <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>Required for appointment confirmations</div>
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={lbl}>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Minimum 6 characters" style={inp}/>
          </div>

          {mode==="register" && (
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat password" style={inp}/>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:"100%", padding:"14px", marginTop:8,
              background:loading?"#ccc":`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
              color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:15,
              cursor:loading?"not-allowed":"pointer", letterSpacing:"0.3px" }}>
            {loading ? "Please wait..." : mode==="login" ? "Sign In →" : "Create Account →"}
          </button>

          <div style={{ textAlign:"center", marginTop:16, fontSize:13, color:T.muted }}>
            {mode==="login"
              ? <>Don't have an account? <button onClick={()=>setMode("register")} style={{ background:"none", border:"none", color:T.primary, fontWeight:700, cursor:"pointer" }}>Sign Up</button></>
              : <>Already registered? <button onClick={()=>setMode("login")} style={{ background:"none", border:"none", color:T.primary, fontWeight:700, cursor:"pointer" }}>Sign In</button></>}
          </div>
        </div>

        <div style={{ textAlign:"center", color:"rgba(255,255,255,0.5)", fontSize:11, marginTop:20 }}>
          © 2025 AsaanDoc · asaandoc.com
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}

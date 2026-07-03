// src/pages/AuthPage.js
import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export default function AuthPage() {
  const [tab,      setTab]      = useState("signin");
  const [name,     setName]     = useState("");
  const [phone,    setPhone]    = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch(err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your full name."); return; }
    setError(""); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), {
        name, email, phone, role: "patient", createdAt: serverTimestamp(),
      });
    } catch(err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  const friendlyError = (code) => {
    const map = {
      "auth/user-not-found":      "No account found with this email.",
      "auth/wrong-password":      "Incorrect password. Please try again.",
      "auth/invalid-email":       "Please enter a valid email address.",
      "auth/email-already-in-use":"An account with this email already exists.",
      "auth/weak-password":       "Password must be at least 6 characters.",
      "auth/too-many-requests":   "Too many attempts. Please try again later.",
      "auth/invalid-credential":  "Incorrect email or password.",
    };
    return map[code] || "Something went wrong. Please try again.";
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      background: "#f0f4f8",
    }}>
      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: "linear-gradient(160deg, #0d2d45 0%, #1B3A5C 40%, #155f7a 75%, #2ABFBF 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 52px",
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
      }}
        className="auth-left-panel"
      >
        {/* Background decorative circles */}
        <div style={{ position:"absolute", top:-80, right:-80, width:300, height:300, borderRadius:"50%", background:"rgba(42,191,191,0.08)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-60, left:-60, width:240, height:240, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"40%", right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(42,191,191,0.05)", pointerEvents:"none" }} />

        {/* Logo */}
        <div>
          <div style={{ fontSize:30, fontWeight:900, color:"#fff", letterSpacing:"-0.5px" }}>
            asaan<span style={{ color:"#2ABFBF" }}>doc</span>
          </div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:4, fontFamily:"serif", letterSpacing:"0.05em" }}>
            صحت کا آسان راستہ
          </div>
        </div>

        {/* Center illustration + text */}
        <div>
          {/* Medical cross icon — SVG */}
          <div style={{ marginBottom:36 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="rgba(42,191,191,0.12)"/>
              <circle cx="40" cy="40" r="28" fill="rgba(42,191,191,0.18)"/>
              <rect x="32" y="20" width="16" height="40" rx="4" fill="#2ABFBF"/>
              <rect x="20" y="32" width="40" height="16" rx="4" fill="#2ABFBF"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 900, color: "#fff",
            lineHeight: 1.15, margin: "0 0 16px",
            letterSpacing: "-0.5px",
          }}>
            1000+ Qualified &<br/>
            <span style={{ color:"#2ABFBF" }}>Experienced</span><br/>
            Doctors Connected
          </h1>

          <p style={{ fontSize:15, color:"rgba(255,255,255,0.6)", lineHeight:1.7, margin:"0 0 40px", maxWidth:340 }}>
            Pakistan's trusted healthcare platform — connecting patients with verified specialists for appointments, digital prescriptions, and complete health management.
          </p>

          {/* Stats */}
          <div style={{ display:"flex", gap:32 }}>
            {[["1000+","Qualified Doctors"],["10,000+","Patients Served"],["24/7","Support"]].map(([num,label])=>(
              <div key={label}>
                <div style={{ fontSize:22, fontWeight:800, color:"#2ABFBF" }}>{num}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features list */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            ["💊","Digital Prescriptions"],
            ["📅","Easy Appointment Booking"],
            ["📱","WhatsApp Notifications"],
            ["🔒","Secure & Private"],
          ].map(([icon,text])=>(
            <div key={text} style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"rgba(42,191,191,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{icon}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.65)", fontWeight:500 }}>{text}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:24 }}>
          © 2025 AsaanDoc · asaandoc.com
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div style={{
        width: 480,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 52px",
        boxShadow: "-4px 0 40px rgba(0,0,0,0.08)",
        minHeight: "100vh",
        overflowY: "auto",
      }}
        className="auth-right-panel"
      >
        {/* Tab switcher */}
        <div style={{
          display: "flex", background: "#f1f5f9", borderRadius: 12,
          padding: 4, marginBottom: 36, gap: 4,
        }}>
          {[["signin","Sign In"],["signup","Create Account"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setTab(id);setError("");}}
              style={{
                flex:1, padding:"10px 0", borderRadius:9, border:"none",
                fontWeight:700, fontSize:14, cursor:"pointer",
                fontFamily:"inherit", transition:"all 0.2s",
                background: tab===id ? "#fff" : "transparent",
                color: tab===id ? "#1B3A5C" : "#94a3b8",
                boxShadow: tab===id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Greeting */}
        <div style={{ marginBottom:28 }}>
          <h2 style={{ margin:"0 0 6px", fontSize:24, fontWeight:800, color:"#1B3A5C", letterSpacing:"-0.3px" }}>
            {tab==="signin" ? "Welcome back 👋" : "Join AsaanDoc 🏥"}
          </h2>
          <p style={{ margin:0, fontSize:14, color:"#94a3b8" }}>
            {tab==="signin"
              ? "Sign in to your account to continue"
              : "Create your account — it's free and takes 1 minute"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={tab==="signin" ? handleSignIn : handleSignUp}>
          {tab==="signup" && (
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Full Name</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>👤</span>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Muhammad Ali"
                  required autoComplete="name"
                  style={{ width:"100%", boxSizing:"border-box", padding:"13px 14px 13px 42px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", color:"#1e293b", transition:"border-color 0.15s" }}
                  onFocus={e=>e.target.style.borderColor="#2ABFBF"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
              </div>
            </div>
          )}

          {tab==="signup" && (
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Mobile Number</label>
              <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                <div style={{ position:"absolute", left:14, fontSize:13, fontWeight:700, color:"#475569", pointerEvents:"none", zIndex:1 }}>+92</div>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                  placeholder="3001234567" maxLength={10}
                  style={{ width:"100%", boxSizing:"border-box", padding:"13px 14px 13px 52px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", color:"#1e293b", transition:"border-color 0.15s" }}
                  onFocus={e=>e.target.style.borderColor="#2ABFBF"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
                <span style={{ position:"absolute", right:14, fontSize:16, pointerEvents:"none" }}>📱</span>
              </div>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>Used for WhatsApp appointment notifications</div>
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Email Address</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>✉️</span>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
                required autoComplete="email"
                style={{ width:"100%", boxSizing:"border-box", padding:"13px 14px 13px 42px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", color:"#1e293b", transition:"border-color 0.15s" }}
                onFocus={e=>e.target.style.borderColor="#2ABFBF"}
                onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
            </div>
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#475569", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Password</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>🔒</span>
              <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Minimum 6 characters" required autoComplete={tab==="signin"?"current-password":"new-password"}
                style={{ width:"100%", boxSizing:"border-box", padding:"13px 44px 13px 42px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", color:"#1e293b", transition:"border-color 0.15s" }}
                onFocus={e=>e.target.style.borderColor="#2ABFBF"}
                onBlur={e=>e.target.style.borderColor="#e2e8f0"} />
              <button type="button" onClick={()=>setShowPass(s=>!s)}
                style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#94a3b8", padding:0 }}>
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom:16, padding:"12px 14px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:10, fontSize:13, color:"#ef4444", fontWeight:600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width:"100%", padding:"14px", borderRadius:10, border:"none",
              background: loading ? "#94a3b8" : "linear-gradient(135deg,#2ABFBF,#1a9999)",
              color:"#fff", fontWeight:800, fontSize:15, cursor: loading?"not-allowed":"pointer",
              fontFamily:"inherit", letterSpacing:"0.02em",
              boxShadow: loading ? "none" : "0 4px 16px rgba(42,191,191,0.4)",
              transition:"all 0.2s",
            }}>
            {loading ? "Please wait…" : tab==="signin" ? "Sign In →" : "Create Account →"}
          </button>

          {/* Switch tab link */}
          <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#94a3b8" }}>
            {tab==="signin" ? (
              <>Don't have an account?{" "}
                <button type="button" onClick={()=>{setTab("signup");setError("");}}
                  style={{ background:"none", border:"none", color:"#2ABFBF", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
                  Sign Up
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button type="button" onClick={()=>{setTab("signin");setError("");}}
                  style={{ background:"none", border:"none", color:"#2ABFBF", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
                  Sign In
                </button>
              </>
            )}
          </div>
        </form>

        {/* Divider */}
        <div style={{ margin:"28px 0", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1, height:1, background:"#e2e8f0" }}/>
          <span style={{ fontSize:12, color:"#cbd5e1", fontWeight:600 }}>SECURED BY</span>
          <div style={{ flex:1, height:1, background:"#e2e8f0" }}/>
        </div>

        {/* Trust badges */}
        <div style={{ display:"flex", justifyContent:"center", gap:20 }}>
          {[["🔐","Firebase Auth"],["🏥","HIPAA Safe"],["🇵🇰","Pakistan Based"]].map(([icon,text])=>(
            <div key={text} style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .auth-left-panel { display: none !important; }
          .auth-right-panel { width: 100% !important; padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}

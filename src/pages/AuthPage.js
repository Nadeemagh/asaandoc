// src/pages/AuthPage.js
import { useState } from "react";
import { T, inputStyle, labelStyle, btnPrimary, Toast } from "../components/UI";
import { registerUser, loginUser } from "../firebase/services";

export default function AuthPage() {
  const [mode, setMode]       = useState("login");   // login | register
  const [role, setRole]       = useState("patient"); // patient | doctor
  const [form, setForm]       = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) return showToast("Email and password required.");
    if (mode === "register") {
      if (!form.name) return showToast("Full name required.");
      if (form.password !== form.confirm) return showToast("Passwords do not match.");
      if (form.password.length < 6) return showToast("Password must be at least 6 characters.");
    }
    setLoading(true);
    try {
      if (mode === "register") {
        await registerUser({ email: form.email, password: form.password, name: form.name, role });
        showToast("Account created! Welcome to AsaanDoc.", "success");
      } else {
        await loginUser(form.email, form.password);
      }
    } catch (e) {
      const msgs = {
        "auth/user-not-found":   "No account found with this email.",
        "auth/wrong-password":   "Incorrect password.",
        "auth/email-already-in-use": "Email already registered. Please login.",
        "auth/invalid-email":    "Invalid email address.",
        "auth/too-many-requests":"Too many attempts. Try again later.",
        "auth/invalid-credential": "Invalid email or password.",
      };
      showToast(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,#155f7a 0%,#218EB6 60%,#00C897 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Inter,system-ui,sans-serif" }}>

      <div style={{ maxWidth: 420, width: "100%" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🏥</div>
          <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: "-1px", margin: 0 }}>AsaanDoc</h1>
          <p style={{ color: "rgba(255,255,255,0.65)", margin: "6px 0 0", fontSize: 14 }}>
            Pakistan's Online Healthcare Platform
          </p>
        </div>

        <div style={{ background: T.white, borderRadius: 20, padding: "28px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          {/* Mode tabs */}
          <div style={{ display: "flex", background: T.bg, borderRadius: 10, padding: 4, marginBottom: 22, gap: 4 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13, background: mode === m ? T.white : "transparent",
                  color: mode === m ? T.primary : T.muted,
                  boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>I am a</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[["patient","🧑‍💼","Patient"],["doctor","👨‍⚕️","Doctor"]].map(([r, icon, label]) => (
                <button key={r} onClick={() => setRole(r)}
                  style={{ flex: 1, padding: "12px 10px", border: `2px solid ${role === r ? T.primary : T.border}`,
                    borderRadius: 10, background: role === r ? T.primaryLight : T.white,
                    cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 24 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: role === r ? T.primary : T.muted, marginTop: 4 }}>{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: "grid", gap: 14 }}>
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="e.g. Ahmed Raza" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="you@example.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="Minimum 6 characters" style={inputStyle} />
            </div>
            {mode === "register" && (
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)}
                  placeholder="Re-enter password" style={inputStyle} />
              </div>
            )}
          </div>

          {mode === "register" && role === "doctor" && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#fffbeb", borderRadius: 10,
              border: "1.5px solid #F59E0B", fontSize: 13, color: "#92400e" }}>
              💡 After registering, contact <strong>admin@asaandoc.com</strong> to link your account to your doctor profile.
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ ...btnPrimary, marginTop: 20, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: T.muted }}>
            {mode === "login" ? "Don't have an account? " : "Already registered? "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              style={{ background: "none", border: "none", color: T.primary, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 20 }}>
          © 2025 AsaanDoc · asaandoc.com
        </p>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

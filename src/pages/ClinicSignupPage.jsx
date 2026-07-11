// src/pages/ClinicSignupPage.jsx
// PUBLIC PAGE — no login required. Reached via /clinic/:slug
// Shows a clinic's info and a "Join as Patient" button. Clicking it
// remembers which clinic the visitor came from (localStorage), then
// sends them into the normal AsaanDoc sign-up flow — AuthPage.js picks
// up that pending clinic and tags the new patient account with it, so
// they only ever see that clinic's doctors afterward.
import { useState, useEffect } from "react";
import { getClinicBySlug } from "../firebase/services";

const T = {
  primary: "#2ABFBF", primaryDark: "#1a9999", primaryLight: "#e8f9f9",
  navy: "#1B3A5C", bg: "#f8fafc", border: "#e2e8f0",
  text: "#1e293b", muted: "#94a3b8",
};

export const PENDING_CLINIC_KEY = "asaandoc_pending_clinic_id";

export default function ClinicSignupPage({ slug }) {
  const [clinic, setClinic] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    (async () => {
      const c = await getClinicBySlug(slug);
      setClinic(c);
      if (c) document.title = `${c.name} — Patient Sign Up | AsaanDoc`;
    })();
  }, [slug]);

  const handleJoin = () => {
    if (!clinic) return;
    localStorage.setItem(PENDING_CLINIC_KEY, clinic.id);
    window.location.href = "/";
  };

  if (clinic === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "Inter,system-ui,sans-serif" }}>
        <div style={{ width: 38, height: 38, border: `4px solid ${T.border}`, borderTop: `4px solid ${T.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (clinic === null || clinic.active === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "Inter,system-ui,sans-serif", padding: 20, textAlign: "center" }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: T.navy }}>asaan<span style={{ color: T.primary }}>doc</span></div>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🏥</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>This clinic link isn't active</div>
        <div style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>Please check the link or contact your clinic for the correct one.</div>
        <a href="/" style={{ padding: "11px 24px", background: T.primary, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Go to AsaanDoc</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`, padding: "16px 20px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <a href="/" style={{ color: "#fff", fontWeight: 900, fontSize: 20, textDecoration: "none" }}>
            asaan<span style={{ color: "#0d3d3d" }}>doc</span>
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "36px 28px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 18px" }}>🏥</div>
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: T.navy }}>{clinic.name}</h1>
          {clinic.address && <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>📍 {clinic.address}</div>}
          {clinic.phone && <div style={{ fontSize: 13, color: T.muted, marginBottom: 18 }}>📞 {clinic.phone}</div>}

          <p style={{ fontSize: 14, color: T.text, lineHeight: 1.6, margin: "18px 0 24px" }}>
            Sign up below to book appointments with doctors at <strong>{clinic.name}</strong> — manage everything through AsaanDoc.
          </p>

          <button onClick={handleJoin}
            style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`, color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 20px rgba(42,191,191,0.35)" }}>
            Join as a Patient →
          </button>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>You'll create a free AsaanDoc account, or sign in if you already have one.</div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 20 }}>
          Powered by <a href="/" style={{ color: T.primary, fontWeight: 700, textDecoration: "none" }}>AsaanDoc</a>
        </div>
      </div>
    </div>
  );
}

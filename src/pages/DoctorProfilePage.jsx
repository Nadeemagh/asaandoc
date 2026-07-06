// src/pages/DoctorProfilePage.jsx
// PUBLIC PAGE — no login required. Reached via /doctor/:slug
// Shows a doctor's public profile with a "Book Appointment" button that
// sends the visitor into the normal login/booking flow, remembering which
// doctor they wanted so PatientPortal can resume booking automatically.
import { useState, useEffect } from "react";
import { getDoctorBySlug } from "../firebase/services";

const T = {
  primary: "#2ABFBF", primaryDark: "#1a9999", primaryLight: "#e8f9f9",
  navy: "#1B3A5C", navyDeep: "#0d2338", bg: "#f4f7f9", border: "#e2e8f0",
  text: "#1e293b", muted: "#8a97a8", gold: "#d9a441",
};

export const PENDING_BOOKING_KEY = "asaandoc_pending_booking_doctor_id";

const parseFee = (fee) => {
  if (fee === null || fee === undefined) return 0;
  if (typeof fee === "number") return fee;
  if (typeof fee === "string") return parseInt(fee) || 0;
  if (typeof fee === "object") {
    if (fee.integerValue !== undefined) return parseInt(fee.integerValue) || 0;
    if (fee.doubleValue !== undefined) return parseFloat(fee.doubleValue) || 0;
  }
  return parseInt(String(fee)) || 0;
};

function ShareButton({ doctor }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    const url = window.location.href;
    const title = `${doctor.name} — ${doctor.specialty} | AsaanDoc`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button onClick={handleShare} aria-label="Share this profile"
      style={{
        display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.14)",
        border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 20,
        padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
      }}>
      {copied ? "✓ Link copied" : "↗ Share"}
    </button>
  );
}

export default function DoctorProfilePage({ slug }) {
  const [doctor, setDoctor] = useState(undefined); // undefined = loading, null = not found
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    (async () => {
      const doc = await getDoctorBySlug(slug);
      setDoctor(doc);
      if (doc) document.title = `${doc.name} — ${doc.specialty || "Doctor"} | AsaanDoc`;
    })();
  }, [slug]);

  const handleBook = () => {
    if (!doctor) return;
    localStorage.setItem(PENDING_BOOKING_KEY, doctor.id);
    window.location.href = "/";
  };

  const fontImport = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap');
      @keyframes slipRise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
      @keyframes badgePop { 0%{transform:scale(0);} 70%{transform:scale(1.15);} 100%{transform:scale(1);} }
      @media (prefers-reduced-motion: reduce) {
        .adp-rise, .adp-badge { animation: none !important; }
      }
    `}</style>
  );

  if (doctor === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "Inter,system-ui,sans-serif" }}>
        {fontImport}
        <div style={{ width: 38, height: 38, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (doctor === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "Inter,system-ui,sans-serif", padding: 20, textAlign: "center" }}>
        {fontImport}
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 600, marginBottom: 8, color: T.navy }}>asaan<span style={{ color: T.primary }}>doc</span></div>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 6 }}>This doctor's page couldn't be found</div>
        <div style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>The link may be outdated, or the profile is no longer active.</div>
        <a href="/" style={{ padding: "11px 24px", background: T.primary, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Go to AsaanDoc</a>
      </div>
    );
  }

  const clinics = Array.isArray(doctor.clinics) && doctor.clinics.length > 0
    ? doctor.clinics
    : [{ name: doctor.hospital || "Clinic", address: "", days: doctor.available || [], fee: doctor.fee || 0, isOnline: false }];
  const fees = clinics.map(c => parseFee(c.fee)).filter(f => f > 0);
  const minFee = fees.length > 0 ? Math.min(...fees) : 0;
  const isVerified = Boolean(doctor.pmcNo || doctor.license);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg,${T.navyDeep} 0%,${T.navy} 220px,${T.bg} 220px)`, fontFamily: "Inter,system-ui,sans-serif" }}>
      {fontImport}

      {/* Top bar */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/" style={{ fontFamily: "'Fraunces',serif", color: "#fff", fontWeight: 600, fontSize: 20, textDecoration: "none" }}>
          asaan<span style={{ color: T.primary }}>doc</span>
        </a>
        <ShareButton doctor={doctor} />
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 20px 40px" }}>

        {/* ── Hero identity card ───────────────────────────── */}
        <div className="adp-rise" style={{
          background: "#fff", borderRadius: 22, padding: "34px 28px 28px",
          boxShadow: "0 20px 50px rgba(13,35,56,0.18)", textAlign: "center",
          marginBottom: 24, animation: "slipRise 0.5s cubic-bezier(.2,.8,.2,1) both",
        }}>
          <div style={{ position: "relative", width: 108, height: 108, margin: "0 auto 18px" }}>
            {doctor.photo && !imgError ? (
              <img src={doctor.photo} alt={doctor.name} onError={() => setImgError(true)}
                style={{ width: 108, height: 108, borderRadius: "50%", objectFit: "cover", border: `3px solid ${T.primaryLight}` }} />
            ) : (
              <div style={{ width: 108, height: 108, borderRadius: "50%", background: doctor.color || T.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 38, fontFamily: "'Fraunces',serif" }}>
                {doctor.avatar || doctor.name?.charAt(0) || "D"}
              </div>
            )}
            {isVerified && (
              <div className="adp-badge" title="PMC Verified"
                style={{
                  position: "absolute", bottom: 2, right: 2, width: 30, height: 30, borderRadius: "50%",
                  background: T.gold, border: "3px solid #fff", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 14, animation: "badgePop 0.5s 0.3s cubic-bezier(.2,1.4,.4,1) both",
                }}>
                ✓
              </div>
            )}
          </div>

          <h1 style={{ margin: "0 0 6px", fontFamily: "'Fraunces',serif", fontSize: 26, fontWeight: 600, color: T.navy, letterSpacing: "-0.01em" }}>
            {doctor.name}
          </h1>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 800, color: T.primaryDark, background: T.primaryLight, padding: "5px 14px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {doctor.specialty}
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 12, lineHeight: 1.6 }}>
            {doctor.exp || 0} years of practice
            {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
            {isVerified ? " · PMC Verified" : ""}
          </div>

          {doctor.services && (
            <p style={{ margin: "18px 0 0", fontSize: 14, color: T.text, lineHeight: 1.7, textAlign: "left", borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
              {doctor.services}
            </p>
          )}
        </div>

        {/* ── Clinics ──────────────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 800, color: T.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, paddingLeft: 4 }}>
          Clinics &amp; Timings
        </div>
        <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
          {clinics.map((clinic, i) => {
            const fee = parseFee(clinic.fee);
            return (
              <div key={i} style={{ background: "#fff", padding: "14px 16px", borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: "0 2px 8px rgba(13,35,56,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{clinic.isOnline ? "💻" : "🏥"} {clinic.name}</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: clinic.isOnline ? "#16a34a" : T.primaryDark, whiteSpace: "nowrap" }}>PKR {fee.toLocaleString()}</div>
                </div>
                {!clinic.isOnline && clinic.address && <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>📍 {clinic.address}</div>}
                {Array.isArray(clinic.days) && clinic.days.length > 0 && (
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>🗓 {clinic.days.length === 7 ? "Every day" : clinic.days.join(", ")}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Signature element: booking CTA styled as a perforated appointment slip ── */}
        <div style={{ position: "relative" }}>
          <div style={{
            background: `linear-gradient(135deg,${T.navy},${T.navyDeep})`, borderRadius: 18,
            padding: "22px 26px 24px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", right: -18, top: -18, fontSize: 100, opacity: 0.06, pointerEvents: "none" }}>🩺</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, position: "relative", zIndex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Consultation fee</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                {minFee > 0 ? `PKR ${minFee.toLocaleString()}` : "See clinics above"}
              </span>
            </div>

            {/* tear line */}
            <div style={{
              position: "relative", height: 1, margin: "0 -26px 18px",
              backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.25) 0 8px, transparent 8px 16px)`,
            }}>
              <span style={{ position: "absolute", left: -12, top: -10, width: 20, height: 20, borderRadius: "50%", background: T.bg }} />
              <span style={{ position: "absolute", right: -12, top: -10, width: 20, height: 20, borderRadius: "50%", background: T.bg }} />
            </div>

            <button onClick={handleBook}
              style={{
                width: "100%", padding: "16px", background: T.primary, color: "#fff", border: "none",
                borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
                position: "relative", zIndex: 1, boxShadow: "0 8px 24px rgba(42,191,191,0.4)",
              }}>
              Book Appointment →
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 12, position: "relative", zIndex: 1 }}>
              Sign in or create a free account to confirm — takes under a minute.
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 28 }}>
          Powered by <a href="/" style={{ color: T.primaryDark, fontWeight: 700, textDecoration: "none" }}>AsaanDoc</a> — Pakistan's Health Platform
        </div>
      </div>
    </div>
  );
}

// src/pages/DoctorProfilePage.jsx
// PUBLIC PAGE — no login required. Reached via /doctor/:slug
// Shows a doctor's public profile with a "Book Appointment" button that
// sends the visitor into the normal login/booking flow, remembering which
// doctor they wanted so PatientPortal can resume booking automatically.
import { useState, useEffect } from "react";
import { getDoctorBySlug } from "../firebase/services";

const T = {
  primary: "#2ABFBF", primaryDark: "#1a9999", primaryLight: "#e8f9f9",
  navy: "#1B3A5C", bg: "#f8fafc", border: "#e2e8f0",
  text: "#1e293b", muted: "#94a3b8",
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

export default function DoctorProfilePage({ slug }) {
  const [doctor, setDoctor] = useState(undefined); // undefined = loading, null = not found
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    (async () => {
      const doc = await getDoctorBySlug(slug);
      setDoctor(doc);
      // Basic same-tab SEO/tab-title — full crawler/WhatsApp preview support
      // needs a small server-side snippet, which is a fast-follow if needed.
      if (doc) {
        document.title = `${doc.name} — ${doc.specialty || "Doctor"} | AsaanDoc`;
      }
    })();
  }, [slug]);

  const handleBook = () => {
    if (!doctor) return;
    localStorage.setItem(PENDING_BOOKING_KEY, doctor.id);
    window.location.href = "/";
  };

  if (doctor === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "Inter,system-ui,sans-serif" }}>
        <div style={{ width: 40, height: 40, border: `4px solid ${T.border}`, borderTop: `4px solid ${T.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (doctor === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "Inter,system-ui,sans-serif", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: T.navy }}>asaan<span style={{ color: T.primary }}>doc</span></div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 6 }}>Doctor not found</div>
        <div style={{ color: T.muted, fontSize: 14, marginBottom: 20 }}>This profile link may be incorrect or no longer active.</div>
        <a href="/" style={{ padding: "11px 24px", background: T.primary, color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Go to AsaanDoc</a>
      </div>
    );
  }

  const clinics = Array.isArray(doctor.clinics) && doctor.clinics.length > 0
    ? doctor.clinics
    : [{ name: doctor.hospital || "Clinic", address: "", days: doctor.available || [], fee: doctor.fee || 0, isOnline: false }];
  const fees = clinics.map(c => parseFee(c.fee)).filter(f => f > 0);
  const minFee = fees.length > 0 ? Math.min(...fees) : 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "Inter,system-ui,sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`, padding: "16px 20px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <a href="/" style={{ color: "#fff", fontWeight: 900, fontSize: 20, textDecoration: "none" }}>
            asaan<span style={{ color: "#0d3d3d" }}>doc</span>
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 20px" }}>
        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", marginBottom: 20 }}>
          <div style={{ background: `linear-gradient(135deg,${doctor.color || T.primary}22,${doctor.color || T.primary}55)`, padding: "36px 24px", textAlign: "center" }}>
            {doctor.photo && !imgError ? (
              <img src={doctor.photo} alt={doctor.name} onError={() => setImgError(true)}
                style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }} />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: doctor.color || T.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 36, margin: "0 auto", border: "4px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
                {doctor.avatar || doctor.name?.charAt(0) || "D"}
              </div>
            )}
            <h1 style={{ margin: "16px 0 4px", fontSize: 22, fontWeight: 900, color: T.navy }}>{doctor.name}</h1>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.primaryDark }}>{doctor.specialty}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
              ⏳ {doctor.exp || 0} years experience
              {doctor.qualifications ? ` · 🎓 ${doctor.qualifications}` : ""}
            </div>
          </div>

          <div style={{ padding: "20px 24px" }}>
            {doctor.services && (
              <div style={{ marginBottom: 16, fontSize: 14, color: T.text, lineHeight: 1.6 }}>{doctor.services}</div>
            )}

            <div style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              🏥 Clinics & Consultation
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
              {clinics.map((clinic, i) => {
                const fee = parseFee(clinic.fee);
                return (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: clinic.isOnline ? "#f0fdf4" : T.primaryLight, border: `1.5px solid ${clinic.isOnline ? "#86efac" : T.primary}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{clinic.isOnline ? "💻" : "🏥"} {clinic.name}</div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: clinic.isOnline ? "#16a34a" : T.primary }}>PKR {fee.toLocaleString()}</div>
                    </div>
                    {!clinic.isOnline && clinic.address && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>📍 {clinic.address}</div>}
                    {Array.isArray(clinic.days) && clinic.days.length > 0 && (
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>📅 {clinic.days.length === 7 ? "Every Day" : clinic.days.join(", ")}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {minFee > 0 && (
              <div style={{ textAlign: "center", fontSize: 13, color: T.muted, marginBottom: 16 }}>
                Consultations from <strong style={{ color: T.primary }}>PKR {minFee.toLocaleString()}</strong>
              </div>
            )}

            <button onClick={handleBook}
              style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`, color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 20px rgba(42,191,191,0.35)" }}>
              📅 Book Appointment →
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: T.muted, marginTop: 10 }}>
              You'll be asked to sign in or create a free AsaanDoc account to complete booking.
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: T.muted }}>
          Powered by <a href="/" style={{ color: T.primary, fontWeight: 700, textDecoration: "none" }}>AsaanDoc</a> — Pakistan's Health Platform
        </div>
      </div>
    </div>
  );
}

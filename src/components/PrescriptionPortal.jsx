import { useState, useRef } from "react";

// ── Brand tokens ──────────────────────────────────────────────
const C = {
  teal: "#2ABFBF",
  tealDark: "#1a9999",
  tealLight: "#e8f9f9",
  navy: "#1B3A5C",
  navyLight: "#2d5a8e",
  white: "#ffffff",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray400: "#94a3b8",
  gray600: "#475569",
  gray800: "#1e293b",
  red: "#ef4444",
  green: "#10b981",
};

// ── Mock data ─────────────────────────────────────────────────
const MOCK_DOCTOR = {
  name: "Dr. Ahmed Raza",
  specialty: "General Physician & Internal Medicine",
  qualification: "MBBS, FCPS (Medicine)",
  license: "PMC-12345",
  hospital: "AsaanDoc Medical Centre",
  address: "Main Boulevard, Gulberg III, Lahore",
  phone: "+92 300 1234567",
};

const MOCK_PATIENTS = [
  { id: "P001", name: "Muhammad Ali", age: 34, gender: "Male", phone: "+92 321 9876543" },
  { id: "P002", name: "Fatima Malik", age: 28, gender: "Female", phone: "+92 333 1122334" },
  { id: "P003", name: "Zain ul Abideen", age: 52, gender: "Male", phone: "+92 311 5544332" },
];

const FREQ_OPTIONS = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "As needed", "At bedtime"];
const DURATION_OPTIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "2 months", "3 months", "Ongoing"];
const ROUTE_OPTIONS = ["Oral", "Topical", "Injection", "Inhaler", "Eye drops", "Ear drops", "Nasal"];

// ── Helpers ───────────────────────────────────────────────────
const today = () => new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" });
const rxId = () => "RX-" + Date.now().toString().slice(-6);

const emptyMed = () => ({ id: Date.now(), name: "", strength: "", route: "Oral", frequency: "Twice daily", duration: "7 days", instructions: "" });

// ── Sub-components ────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box", padding: "9px 12px",
          border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14,
          color: C.gray800, background: C.white, outline: "none",
          transition: "border-color 0.15s",
          fontFamily: "inherit",
        }}
        onFocus={e => e.target.style.borderColor = C.teal}
        onBlur={e => e.target.style.borderColor = C.gray200}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "9px 12px", border: `1.5px solid ${C.gray200}`,
          borderRadius: 8, fontSize: 14, color: C.gray800, background: C.white,
          outline: "none", fontFamily: "inherit", cursor: "pointer",
        }}
        onFocus={e => e.target.style.borderColor = C.teal}
        onBlur={e => e.target.style.borderColor = C.gray200}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled, style: extraStyle = {} }) {
  const base = {
    padding: small ? "7px 14px" : "10px 20px",
    borderRadius: 8, border: "none", cursor: disabled ? "not-allowed" : "pointer",
    fontSize: small ? 13 : 14, fontWeight: 600, fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 6,
    transition: "all 0.15s", opacity: disabled ? 0.5 : 1,
    ...extraStyle,
  };
  const variants = {
    primary: { background: C.teal, color: C.white },
    navy: { background: C.navy, color: C.white },
    ghost: { background: "transparent", color: C.teal, border: `1.5px solid ${C.teal}` },
    danger: { background: "#fff0f0", color: C.red, border: `1.5px solid #fecaca` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

// ── Medicine Row ──────────────────────────────────────────────
function MedicineRow({ med, onChange, onRemove, index }) {
  const field = (key, val) => onChange({ ...med, [key]: val });
  return (
    <div style={{
      background: C.gray50, border: `1.5px solid ${C.gray200}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 10, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: C.tealLight, padding: "2px 10px", borderRadius: 20 }}>
          Rx {index + 1}
        </span>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Medicine Name *</label>
          <input
            value={med.name} onChange={e => field("name", e.target.value)}
            placeholder="e.g. Paracetamol"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = C.teal}
            onBlur={e => e.target.style.borderColor = C.gray200}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Strength / Dose</label>
          <input
            value={med.strength} onChange={e => field("strength", e.target.value)}
            placeholder="e.g. 500mg, 10ml"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = C.teal}
            onBlur={e => e.target.style.borderColor = C.gray200}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Route</label>
          <select value={med.route} onChange={e => field("route", e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: C.white }}>
            {ROUTE_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Frequency</label>
          <select value={med.frequency} onChange={e => field("frequency", e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: C.white }}>
            {FREQ_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Duration</label>
          <select value={med.duration} onChange={e => field("duration", e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", background: C.white }}>
            {DURATION_OPTIONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 4 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Special Instructions</label>
          <input
            value={med.instructions} onChange={e => field("instructions", e.target.value)}
            placeholder="e.g. Take after meals"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
            onFocus={e => e.target.style.borderColor = C.teal}
            onBlur={e => e.target.style.borderColor = C.gray200}
          />
        </div>
      </div>
    </div>
  );
}

// ── Prescription Preview (print-ready) ───────────────────────
function PrescriptionPreview({ data, doctor }) {
  return (
    <div id="rx-print" style={{
      background: C.white, width: "100%", maxWidth: 720, margin: "0 auto",
      fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 14, color: C.gray800,
      border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, padding: "24px 32px", color: C.white }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {/* Logo text mark */}
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 2 }}>
              <span style={{ color: C.white }}>asaan</span>
              <span style={{ color: C.teal }}>doc</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em" }}>صحت کا آسان راستہ</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Prescription No.</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.teal }}>{data.rxId}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{data.date}</div>
          </div>
        </div>

        {/* Doctor info */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", gap: 32 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{doctor.name}</div>
            <div style={{ fontSize: 12, color: C.teal, marginTop: 2 }}>{doctor.specialty}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>{doctor.qualification} · PMC# {doctor.license}</div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
            <div>{doctor.hospital}</div>
            <div>{doctor.address}</div>
            <div>{doctor.phone}</div>
          </div>
        </div>
      </div>

      {/* Patient Info */}
      <div style={{ padding: "16px 32px", background: C.tealLight, borderBottom: `1px solid ${C.gray200}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {[
            ["Patient", data.patientName],
            ["Age / Gender", `${data.age} yrs · ${data.gender}`],
            ["Phone", data.phone],
            ["Weight / Height", `${data.weight ? data.weight + " kg" : "—"} / ${data.height ? data.height + " cm" : "—"}`],
            ["Blood Pressure", data.bp || "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{val}</div>
            </div>
          ))}
        </div>
        {data.diagnosis && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.gray200}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Diagnosis / Plan</div>
            <div style={{ fontSize: 13, color: C.navy, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{data.diagnosis}</div>
          </div>
        )}
      </div>

      {/* Medicines */}
      <div style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 16 }}>℞</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Medications</span>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.gray100 }}>
              {["#", "Medicine", "Strength", "Route", "Frequency", "Duration", "Instructions"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.gray600, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${C.gray200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.medicines.filter(m => m.name).map((m, i) => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${C.gray100}`, background: i % 2 === 0 ? C.white : C.gray50 }}>
                <td style={{ padding: "10px", fontSize: 13, fontWeight: 700, color: C.teal }}>{i + 1}</td>
                <td style={{ padding: "10px", fontSize: 13, fontWeight: 600, color: C.navy }}>{m.name}</td>
                <td style={{ padding: "10px", fontSize: 13 }}>{m.strength || "—"}</td>
                <td style={{ padding: "10px", fontSize: 13 }}>{m.route}</td>
                <td style={{ padding: "10px", fontSize: 13 }}>{m.frequency}</td>
                <td style={{ padding: "10px", fontSize: 13 }}>{m.duration}</td>
                <td style={{ padding: "10px", fontSize: 12, color: C.gray600, fontStyle: m.instructions ? "normal" : "italic" }}>{m.instructions || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes */}
        {data.notes && (
          <div style={{ marginTop: 20, padding: "14px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 4 }}>Additional Notes</div>
            <div style={{ fontSize: 13, color: "#78350f", lineHeight: 1.6 }}>{data.notes}</div>
          </div>
        )}

        {/* Follow-up */}
        {data.followUp && (
          <div style={{ marginTop: 12, padding: "12px 16px", background: C.tealLight, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: C.teal }}>📅</span>
            <span style={{ fontSize: 13, color: C.navy }}><strong>Follow-up:</strong> {data.followUp}</span>
          </div>
        )}

        {/* Lab Tests */}
        {data.labTests && data.labTests.filter(t => t.name).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 800, fontSize: 15 }}>🔬</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Lab Tests</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f3ff" }}>
                  {["#", "Test Name", "Instructions"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid #ddd6fe` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.labTests.filter(t => t.name).map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${C.gray100}`, background: i % 2 === 0 ? C.white : "#faf5ff" }}>
                    <td style={{ padding: "10px", fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>{i + 1}</td>
                    <td style={{ padding: "10px", fontSize: 13, fontWeight: 600, color: C.navy }}>{t.name}</td>
                    <td style={{ padding: "10px", fontSize: 12, color: C.gray600, fontStyle: t.instructions ? "normal" : "italic" }}>{t.instructions || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 32px", borderTop: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.gray50 }}>
        <div style={{ fontSize: 11, color: C.gray400 }}>
          Generated via AsaanDoc · asaandoc.com · This prescription is valid for 30 days
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ width: 120, borderTop: `1.5px solid ${C.navy}`, marginBottom: 4 }}></div>
          <div style={{ fontSize: 11, color: C.gray600, fontWeight: 600 }}>{doctor.name}</div>
          <div style={{ fontSize: 10, color: C.gray400 }}>Doctor's Signature</div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function PrescriptionPortal() {
  const [view, setView] = useState("list"); // list | form | preview
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medicines, setMedicines] = useState([emptyMed()]);
  const [vitals, setVitals] = useState({ weight: "", height: "", bp: "" });
  const [diagnosis, setDiagnosis] = useState("");
  const [labTests, setLabTests] = useState([{ id: Date.now(), name: "", instructions: "" }]);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [rxData, setRxData] = useState(null);
  const [saved, setSaved] = useState([]);
  const printRef = useRef();

  const addMedicine = () => setMedicines(prev => [...prev, emptyMed()]);
  const updateMedicine = (id, updated) => setMedicines(prev => prev.map(m => m.id === id ? updated : m));
  const removeMedicine = id => setMedicines(prev => prev.filter(m => m.id !== id));

  const openForm = (patient) => {
    setSelectedPatient(patient);
    setMedicines([emptyMed()]);
    setVitals({ weight: "", height: "", bp: "" });
    setDiagnosis(""); setNotes(""); setFollowUp("");
    setLabTests([{ id: Date.now(), name: "", instructions: "" }]);
    setView("form");
  };

  const generatePreview = () => {
    if (!medicines.some(m => m.name)) return alert("Add at least one medicine.");
    const data = {
      rxId: rxId(), date: today(),
      patientName: selectedPatient.name,
      age: selectedPatient.age, gender: selectedPatient.gender,
      phone: selectedPatient.phone,
      weight: vitals.weight, height: vitals.height, bp: vitals.bp,
      diagnosis, notes, followUp, medicines, labTests,
    };
    setRxData(data);
    setView("preview");
  };

  const savePrescription = () => {
    setSaved(prev => [rxData, ...prev]);
    setSaved(prev => prev);
    setView("list");
    // In real app: save to Firestore
  };

  const handlePrint = () => {
    const el = document.getElementById("rx-print");
    if (!el) return;
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Prescription - ${rxData.rxId}</title>
      <style>body{margin:0;font-family:'Segoe UI',Arial,sans-serif;}@media print{body{margin:0}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  // ── PATIENT LIST VIEW ──────────────────────────────────────
  if (view === "list") return (
    <div style={{ minHeight: "100vh", background: C.gray50, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: C.navy, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>
          asaan<span style={{ color: C.teal }}>doc</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: "rgba(255,255,255,0.5)", marginLeft: 16 }}>Doctor Portal</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👨‍⚕️</div>
          <div style={{ color: C.white, fontSize: 13 }}>{MOCK_DOCTOR.name}</div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Today's Appointments", value: MOCK_PATIENTS.length, icon: "📅", color: C.teal },
            { label: "Prescriptions Written", value: saved.length, icon: "📋", color: C.navy },
            { label: "Pending Review", value: 1, icon: "⏳", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: "20px 24px", border: `1px solid ${C.gray200}`, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 28 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Patient list */}
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>Today's Patients</div>
              <div style={{ fontSize: 13, color: C.gray600, marginTop: 2 }}>Click "Write Prescription" to start</div>
            </div>
          </div>
          {MOCK_PATIENTS.map((p, i) => (
            <div key={p.id} style={{
              padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: i < MOCK_PATIENTS.length - 1 ? `1px solid ${C.gray100}` : "none",
              transition: "background 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = C.gray50}
              onMouseLeave={e => e.currentTarget.style.background = C.white}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.tealLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                  {p.gender === "Female" ? "👩" : "👨"}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: C.navy, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>{p.age} yrs · {p.gender} · {p.phone}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {saved.some(rx => rx.patientName === p.name) && (
                  <span style={{ fontSize: 11, color: C.green, background: "#f0fdf4", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>✓ Rx Written</span>
                )}
                <Btn onClick={() => openForm(p)} small>
                  📋 Write Prescription
                </Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── PRESCRIPTION FORM ──────────────────────────────────────
  if (view === "form") return (
    <div style={{ minHeight: "100vh", background: C.gray50, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: C.navy, padding: "0 32px", height: 60, display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>
          New Prescription — <span style={{ color: C.teal }}>{selectedPatient?.name}</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px" }}>

        {/* Patient card */}
        <div style={{ background: C.tealLight, border: `1.5px solid ${C.teal}`, borderRadius: 10, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 24 }}>
          <div style={{ fontSize: 32 }}>{selectedPatient?.gender === "Female" ? "👩" : "👨"}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.navy }}>{selectedPatient?.name}</div>
            <div style={{ fontSize: 13, color: C.gray600, marginTop: 2 }}>{selectedPatient?.age} yrs · {selectedPatient?.gender} · {selectedPatient?.phone}</div>
          </div>
        </div>

        {/* Vitals */}
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 16 }}>📊 Vitals</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[["weight", "Weight (kg)", "e.g. 70"], ["height", "Height (cm)", "e.g. 170"], ["bp", "Blood Pressure", "e.g. 120/80"]].map(([key, label, ph]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                <input
                  value={vitals[key]} onChange={e => setVitals(v => ({ ...v, [key]: e.target.value }))}
                  placeholder={ph}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = C.teal}
                  onBlur={e => e.target.style.borderColor = C.gray200}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Diagnosis / Plan */}
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>🩺 Diagnosis / Plan</div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Diagnosis, Clinical Findings & Treatment Plan</label>
          <textarea
            value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
            placeholder={"e.g.\nDiagnosis: Acute Upper Respiratory Tract Infection\n\nFindings: Throat inflamed, mild fever, congestion\n\nPlan: Symptomatic treatment, rest for 3 days, follow up if no improvement"}
            rows={7}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.7, color: C.gray800 }}
            onFocus={e => e.target.style.borderColor = C.teal}
            onBlur={e => e.target.style.borderColor = C.gray200}
          />
        </div>

        {/* Medicines */}
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>💊 Medicines</div>
            <Btn onClick={addMedicine} small variant="ghost">+ Add Medicine</Btn>
          </div>
          {medicines.map((m, i) => (
            <MedicineRow key={m.id} med={m} index={i}
              onChange={updated => updateMedicine(m.id, updated)}
              onRemove={() => removeMedicine(m.id)}
            />
          ))}
        </div>

        {/* Lab Tests */}
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>🔬 Lab Tests</div>
            <Btn onClick={() => setLabTests(prev => [...prev, { id: Date.now(), name: "", instructions: "" }])} small variant="ghost">+ Add Test</Btn>
          </div>
          {labTests.map((lt, i) => (
            <div key={lt.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end", marginBottom: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Test Name</label>
                <input
                  value={lt.name}
                  onChange={e => setLabTests(prev => prev.map(t => t.id === lt.id ? { ...t, name: e.target.value } : t))}
                  placeholder="e.g. CBC, HbA1c, Lipid Profile, Urine RE"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = C.teal}
                  onBlur={e => e.target.style.borderColor = C.gray200}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Instructions</label>
                <input
                  value={lt.instructions}
                  onChange={e => setLabTests(prev => prev.map(t => t.id === lt.id ? { ...t, instructions: e.target.value } : t))}
                  placeholder="e.g. Fasting, early morning sample"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = C.teal}
                  onBlur={e => e.target.style.borderColor = C.gray200}
                />
              </div>
              <button onClick={() => setLabTests(prev => prev.filter(t => t.id !== lt.id))}
                style={{ background: "#fff0f0", border: "1.5px solid #fecaca", color: C.red, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 16 }}>×</button>
            </div>
          ))}
          {labTests.length === 0 && (
            <div style={{ textAlign: "center", padding: "16px", color: C.gray400, fontSize: 13 }}>No lab tests added. Click "+ Add Test" above.</div>
          )}
        </div>
        <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 14 }}>📝 Additional Info</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>General Notes / Advice</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Rest for 3 days, drink plenty of fluids, avoid cold food..."
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" }}
              onFocus={e => e.target.style.borderColor = C.teal}
              onBlur={e => e.target.style.borderColor = C.gray200}
            />
          </div>
          <InputField label="Follow-up Date" value={followUp} onChange={setFollowUp} placeholder="e.g. After 1 week, 15th July 2025" />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Btn onClick={() => setView("list")} variant="ghost">Cancel</Btn>
          <Btn onClick={generatePreview} variant="navy">👁 Preview Prescription</Btn>
        </div>
      </div>
    </div>
  );

  // ── PREVIEW & PRINT ────────────────────────────────────────
  if (view === "preview") return (
    <div style={{ minHeight: "100vh", background: C.gray100, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: C.navy, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setView("form")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 22 }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Prescription Preview</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={handlePrint} variant="ghost" style={{ color: C.white, borderColor: "rgba(255,255,255,0.4)" }}>🖨 Print / PDF</Btn>
          <Btn onClick={savePrescription}>✅ Save & Done</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 24px 48px" }} ref={printRef}>
        <PrescriptionPreview data={rxData} doctor={MOCK_DOCTOR} />
      </div>
    </div>
  );
}

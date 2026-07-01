// ============================================================
// PrescriptionPortal.jsx  — Doctor Portal
// Place in: src/components/PrescriptionPortal.jsx
//
// Props:
//   doctor  — object from Firestore doctors/{uid}
//             { name, specialty, qualification, license,
//               hospital, address, phone }
//   patients — array from today's appointments
//              [{ id, name, age, gender, phone, patientId? }]
//   doctorId — Firebase auth UID (auth.currentUser.uid)
//
// Usage in your existing portal:
//   import PrescriptionPortal from "./components/PrescriptionPortal";
//   <PrescriptionPortal doctor={doctorData} patients={todayPatients} doctorId={uid} />
// ============================================================

import { useState, useRef } from "react";
import {
  collection, addDoc, getDocs, query,
  where, orderBy, serverTimestamp, doc, getDoc,
} from "firebase/firestore";
import { db } from "../firebase/config"; // ← your existing firebase config

// ── Brand tokens ──────────────────────────────────────────────
const C = {
  teal: "#2ABFBF", tealDark: "#1a9999", tealLight: "#e8f9f9",
  navy: "#1B3A5C", navyLight: "#2d5a8e",
  white: "#ffffff", gray50: "#f8fafc", gray100: "#f1f5f9",
  gray200: "#e2e8f0", gray400: "#94a3b8", gray600: "#475569",
  gray800: "#1e293b", red: "#ef4444", green: "#10b981",
  purple: "#7c3aed", purpleLight: "#f5f3ff",
};

const FREQ    = ["Once daily","Twice daily","Three times daily","Four times daily","As needed","At bedtime"];
const DURATIONS = ["3 days","5 days","7 days","10 days","14 days","1 month","2 months","3 months","Ongoing"];
const ROUTES  = ["Oral","Topical","Injection","Inhaler","Eye drops","Ear drops","Nasal"];

const todayStr = () => new Date().toLocaleDateString("en-PK",{day:"2-digit",month:"long",year:"numeric"});
const rxId     = () => "RX-" + Date.now().toString().slice(-6);
const emptyMed = () => ({ id: Date.now(), name:"", strength:"", route:"Oral", frequency:"Twice daily", duration:"7 days", instructions:"" });
const emptyLab = () => ({ id: Date.now(), name:"", instructions:"" });

// ── Reusable UI ───────────────────────────────────────────────
function Inp({ label, value, onChange, placeholder, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}{required && <span style={{color:C.red}}> *</span>}</label>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", color:C.gray800, background:C.white }}
        onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", background:C.white, color:C.gray800 }}
        onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant="primary", small, disabled, style:ex={} }) {
  const v = { primary:{background:C.teal,color:C.white,border:"none"}, navy:{background:C.navy,color:C.white,border:"none"}, ghost:{background:"transparent",color:C.teal,border:`1.5px solid ${C.teal}`}, danger:{background:"#fff0f0",color:C.red,border:"1.5px solid #fecaca"}, purple:{background:C.purple,color:C.white,border:"none"} };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:small?"7px 14px":"10px 20px", borderRadius:8, cursor:disabled?"not-allowed":"pointer", fontSize:small?13:14, fontWeight:600, fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.15s", opacity:disabled?0.5:1, ...v[variant], ...ex }}>
      {children}
    </button>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ background:C.navy, padding:"0 32px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        {onBack && <button onClick={onBack} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer", fontSize:22 }}>←</button>}
        <div style={{ fontSize:18, fontWeight:800, color:C.white }}>asaan<span style={{color:C.teal}}>doc</span>
          {title && <span style={{ fontSize:13, fontWeight:400, color:"rgba(255,255,255,0.5)", marginLeft:12 }}>{title}</span>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── Medicine Row ──────────────────────────────────────────────
function MedRow({ med, onChange, onRemove, index }) {
  const f = (k,v) => onChange({...med,[k]:v});
  return (
    <div style={{ background:C.gray50, border:`1.5px solid ${C.gray200}`, borderRadius:10, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:C.teal, background:C.tealLight, padding:"2px 10px", borderRadius:20 }}>Rx {index+1}</span>
        <button onClick={onRemove} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:20 }}>×</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
        <div style={{marginBottom:12}}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Medicine Name *</label>
          <input value={med.name} onChange={e=>f("name",e.target.value)} placeholder="e.g. Paracetamol"
            style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
        </div>
        <div style={{marginBottom:12}}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Strength / Dose</label>
          <input value={med.strength} onChange={e=>f("strength",e.target.value)} placeholder="e.g. 500mg"
            style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
        </div>
        <Sel label="Route"     value={med.route}      onChange={v=>f("route",v)}      options={ROUTES}    />
        <Sel label="Frequency" value={med.frequency}  onChange={v=>f("frequency",v)}  options={FREQ}      />
        <Sel label="Duration"  value={med.duration}   onChange={v=>f("duration",v)}   options={DURATIONS} />
        <div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Special Instructions</label>
          <input value={med.instructions} onChange={e=>f("instructions",e.target.value)} placeholder="e.g. After meals"
            style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
        </div>
      </div>
    </div>
  );
}

// ── Print-ready Prescription ──────────────────────────────────
function RxPreview({ data, doctor }) {
  return (
    <div id="rx-print" style={{ background:C.white, width:"100%", maxWidth:720, margin:"0 auto", fontFamily:"'Segoe UI',Arial,sans-serif", fontSize:14, color:C.gray800, border:`1px solid ${C.gray200}`, borderRadius:12, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`, padding:"24px 32px", color:C.white }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.5px" }}>asaan<span style={{color:C.teal}}>doc</span></div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", letterSpacing:"0.08em" }}>صحت کا آسان راستہ</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:2 }}>Prescription No.</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.teal }}>{data.rxId}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", marginTop:4 }}>{data.date}</div>
          </div>
        </div>
        <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.15)", display:"flex", gap:32 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>{doctor.name}</div>
            <div style={{ fontSize:12, color:C.teal, marginTop:2 }}>{doctor.specialty}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:1 }}>{doctor.qualification} · PMC# {doctor.license}</div>
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.7 }}>
            <div>{doctor.hospital}</div>
            <div>{doctor.address}</div>
            <div>{doctor.phone}</div>
          </div>
        </div>
      </div>

      {/* Patient strip */}
      <div style={{ padding:"16px 32px", background:C.tealLight, borderBottom:`1px solid ${C.gray200}` }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:16 }}>
          {[["Patient",data.patientName],["Age / Gender",`${data.age} yrs · ${data.gender}`],["Phone",data.phone],["Weight / Height",`${data.weight||"—"} kg / ${data.height||"—"} cm`],["Blood Pressure",data.bp||"—"]].map(([l,v])=>(
            <div key={l}>
              <div style={{ fontSize:10, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{v}</div>
            </div>
          ))}
        </div>
        {data.diagnosis && (
          <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.gray200}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Diagnosis / Plan</div>
            <div style={{ fontSize:13, color:C.navy, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{data.diagnosis}</div>
          </div>
        )}
      </div>

      {/* Medicines */}
      <div style={{ padding:"24px 32px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:C.teal, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontWeight:800, fontSize:16 }}>℞</div>
          <span style={{ fontSize:15, fontWeight:700, color:C.navy }}>Medications</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:C.gray100 }}>
              {["#","Medicine","Strength","Route","Frequency","Duration","Instructions"].map(h=>(
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:C.gray600, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`2px solid ${C.gray200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.medicines||[]).filter(m=>m.name).map((m,i)=>(
              <tr key={m.id} style={{ borderBottom:`1px solid ${C.gray100}`, background:i%2===0?C.white:C.gray50 }}>
                <td style={{ padding:"10px", fontSize:13, fontWeight:700, color:C.teal }}>{i+1}</td>
                <td style={{ padding:"10px", fontSize:13, fontWeight:600, color:C.navy }}>{m.name}</td>
                <td style={{ padding:"10px", fontSize:13 }}>{m.strength||"—"}</td>
                <td style={{ padding:"10px", fontSize:13 }}>{m.route}</td>
                <td style={{ padding:"10px", fontSize:13 }}>{m.frequency}</td>
                <td style={{ padding:"10px", fontSize:13 }}>{m.duration}</td>
                <td style={{ padding:"10px", fontSize:12, color:C.gray600 }}>{m.instructions||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Lab Tests */}
        {(data.labTests||[]).filter(t=>t.name).length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.purple, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontSize:15 }}>🔬</div>
              <span style={{ fontSize:15, fontWeight:700, color:C.navy }}>Lab Tests</span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:C.purpleLight }}>
                  {["#","Test Name","Instructions"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:`2px solid #ddd6fe` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.labTests.filter(t=>t.name).map((t,i)=>(
                  <tr key={t.id} style={{ borderBottom:`1px solid ${C.gray100}`, background:i%2===0?C.white:"#faf5ff" }}>
                    <td style={{ padding:"10px", fontSize:13, fontWeight:700, color:C.purple }}>{i+1}</td>
                    <td style={{ padding:"10px", fontSize:13, fontWeight:600, color:C.navy }}>{t.name}</td>
                    <td style={{ padding:"10px", fontSize:12, color:C.gray600 }}>{t.instructions||"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div style={{ marginTop:20, padding:"14px 16px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#92400e", textTransform:"uppercase", marginBottom:4 }}>Additional Notes</div>
            <div style={{ fontSize:13, color:"#78350f", lineHeight:1.6 }}>{data.notes}</div>
          </div>
        )}

        {/* Follow-up */}
        {data.followUp && (
          <div style={{ marginTop:12, padding:"12px 16px", background:C.tealLight, borderRadius:8, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{fontSize:14}}>📅</span>
            <span style={{ fontSize:13, color:C.navy }}><strong>Follow-up:</strong> {data.followUp}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"16px 32px", borderTop:`1px solid ${C.gray200}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.gray50 }}>
        <div style={{ fontSize:11, color:C.gray400 }}>Generated via AsaanDoc · asaandoc.com · Valid for 30 days</div>
        <div style={{ textAlign:"right" }}>
          <div style={{ width:120, borderTop:`1.5px solid ${C.navy}`, marginBottom:4 }}></div>
          <div style={{ fontSize:11, color:C.gray600, fontWeight:600 }}>{doctor.name}</div>
          <div style={{ fontSize:10, color:C.gray400 }}>Doctor's Signature</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────
export default function PrescriptionPortal({ doctor: propDoctor, patients: propPatients, doctorId: propDoctorId }) {

  // Use real props — no mock fallbacks
  const doctor   = propDoctor   || { name:"", specialty:"", qualification:"", license:"", hospital:"AsaanDoc", address:"", phone:"" };
const patients = propPatients || [];
const doctorId = propDoctorId || "";
  
  const [view,            setView]           = useState("list"); // list | form | preview | history
  const [selectedPatient, setSelectedPatient]= useState(null);
  const [medicines,       setMedicines]      = useState([emptyMed()]);
  const [labTests,        setLabTests]       = useState([emptyLab()]);
  const [vitals,          setVitals]         = useState({ weight:"", height:"", bp:"" });
  const [diagnosis,       setDiagnosis]      = useState("");
  const [notes,           setNotes]          = useState("");
  const [followUp,        setFollowUp]       = useState("");
  const [rxData,          setRxData]         = useState(null);
  const [savedLocal,      setSavedLocal]     = useState([]);   // local cache for this session
  const [history,         setHistory]        = useState([]);
  const [saving,          setSaving]         = useState(false);
  const [loadingHistory,  setLoadingHistory] = useState(false);
  const [toast,           setToast]          = useState("");
  const printRef = useRef();

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""), 3000); };

  // helpers
  const addMed    = () => setMedicines(p=>[...p, emptyMed()]);
  const updateMed = (id,u) => setMedicines(p=>p.map(m=>m.id===id?u:m));
  const removeMed = id => setMedicines(p=>p.filter(m=>m.id!==id));
  const addLab    = () => setLabTests(p=>[...p, emptyLab()]);
  const updateLab = (id,u) => setLabTests(p=>p.map(t=>t.id===id?u:t));
  const removeLab = id => setLabTests(p=>p.filter(t=>t.id!==id));

  const openForm = (patient) => {
    setSelectedPatient(patient);
    setMedicines([emptyMed()]);
    setLabTests([emptyLab()]);
    setVitals({ weight:"", height:"", bp:"" });
    setDiagnosis(""); setNotes(""); setFollowUp("");
    setView("form");
  };

  const generatePreview = () => {
    if (!medicines.some(m=>m.name)) { showToast("⚠️ Add at least one medicine"); return; }
    setRxData({
      rxId: rxId(), date: todayStr(),
      patientName: selectedPatient.name,
      age: selectedPatient.age, gender: selectedPatient.gender,
      phone: selectedPatient.phone,
      weight: vitals.weight, height: vitals.height, bp: vitals.bp,
      diagnosis, notes, followUp, medicines, labTests,
    });
    setView("preview");
  };

  // ── Save to Firestore ──────────────────────────────────────
  const savePrescription = async () => {
    setSaving(true);
    try {
      const payload = { ...rxData, doctorId, createdAt: serverTimestamp() };
      // If running without Firebase (demo mode), just save locally
      if (typeof db !== "undefined" && db) {
        await addDoc(collection(db, "prescriptions"), payload);
      }
      setSavedLocal(p=>[rxData, ...p]);
      showToast("✅ Prescription saved!");
      setView("list");
    } catch(e) {
      console.error(e);
      // Graceful fallback: still save locally
      setSavedLocal(p=>[rxData, ...p]);
      showToast("✅ Saved locally (Firebase offline)");
      setView("list");
    } finally {
      setSaving(false);
    }
  };

  // ── Load prescription history from Firestore ───────────────
  const loadHistory = async () => {
    setView("history");
    setLoadingHistory(true);
    try {
      if (typeof db !== "undefined" && db) {
        const q = query(collection(db,"prescriptions"), where("doctorId","==",doctorId), orderBy("createdAt","desc"));
        const snap = await getDocs(q);
        setHistory(snap.docs.map(d=>({ firestoreId:d.id, ...d.data() })));
      } else {
        setHistory(savedLocal);
      }
    } catch(e) {
      setHistory(savedLocal);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePrint = () => {
    const el = document.getElementById("rx-print");
    if (!el) return;
    const win = window.open("","_blank");
    win.document.write(`<html><head><title>Prescription - ${rxData.rxId}</title><style>body{margin:0;font-family:'Segoe UI',Arial,sans-serif}@media print{body{margin:0}}</style></head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(()=>{win.print();win.close();},500);
  };

  // ════════════════════════════════════════════════════════════
  // VIEW: PATIENT LIST
  // ════════════════════════════════════════════════════════════
  if (view === "list") return (
    <div style={{ minHeight:"100vh", background:C.gray50, fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      <TopBar title="Doctor Portal" right={
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Btn onClick={loadHistory} variant="ghost" small style={{ color:"rgba(255,255,255,0.8)", borderColor:"rgba(255,255,255,0.3)" }}>📋 History</Btn>
          <div style={{ width:36, height:36, borderRadius:"50%", background:C.teal, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>👨‍⚕️</div>
          <span style={{ color:C.white, fontSize:13 }}>{doctor.name}</span>
        </div>
      }/>

      {toast && <div style={{ position:"fixed", top:70, right:24, background:C.navy, color:C.white, padding:"12px 20px", borderRadius:10, zIndex:999, fontSize:14, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>{toast}</div>}

      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>
        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:32 }}>
          {[
            { label:"Today's Appointments", value:patients.length, icon:"📅", color:C.teal },
            { label:"Prescriptions Written", value:savedLocal.length, icon:"📋", color:C.navy },
            { label:"Lab Tests Ordered", value:savedLocal.reduce((a,r)=>(r.labTests||[]).filter(t=>t.name).length+a,0), icon:"🔬", color:C.purple },
          ].map(s=>(
            <div key={s.label} style={{ background:C.white, borderRadius:12, padding:"20px 24px", border:`1px solid ${C.gray200}`, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ fontSize:30 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:C.gray600, marginTop:2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Patient list */}
        <div style={{ background:C.white, borderRadius:12, border:`1px solid ${C.gray200}`, overflow:"hidden" }}>
          <div style={{ padding:"20px 24px", borderBottom:`1px solid ${C.gray200}` }}>
            <div style={{ fontSize:16, fontWeight:700, color:C.navy }}>Today's Patients</div>
            <div style={{ fontSize:13, color:C.gray600, marginTop:2 }}>Click "Write Prescription" to start</div>
          </div>
          {patients.map((p,i)=>(
            <div key={p.id} style={{ padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:i<patients.length-1?`1px solid ${C.gray100}`:"none" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.gray50}
              onMouseLeave={e=>e.currentTarget.style.background=C.white}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:C.tealLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{p.gender==="Female"?"👩":"👨"}</div>
                <div>
                  <div style={{ fontWeight:600, color:C.navy, fontSize:15 }}>{p.name}</div>
                  <div style={{ fontSize:12, color:C.gray600, marginTop:2 }}>{p.age} yrs · {p.gender} · {p.phone}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                {savedLocal.some(rx=>rx.patientName===p.name) && (
                  <span style={{ fontSize:11, color:C.green, background:"#f0fdf4", padding:"3px 10px", borderRadius:20, fontWeight:600 }}>✓ Rx Written</span>
                )}
                <Btn onClick={()=>openForm(p)} small>📋 Write Prescription</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // VIEW: PRESCRIPTION FORM
  // ════════════════════════════════════════════════════════════
  if (view === "form") return (
    <div style={{ minHeight:"100vh", background:C.gray50, fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      <TopBar title={`New Rx — ${selectedPatient?.name}`} onBack={()=>setView("list")} />
      {toast && <div style={{ position:"fixed", top:70, right:24, background:C.red, color:C.white, padding:"12px 20px", borderRadius:10, zIndex:999, fontSize:14, fontWeight:600 }}>{toast}</div>}

      <div style={{ maxWidth:800, margin:"0 auto", padding:"28px 24px" }}>

        {/* Patient card */}
        <div style={{ background:C.tealLight, border:`1.5px solid ${C.teal}`, borderRadius:10, padding:"16px 20px", marginBottom:24, display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:36 }}>{selectedPatient?.gender==="Female"?"👩":"👨"}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:C.navy }}>{selectedPatient?.name}</div>
            <div style={{ fontSize:13, color:C.gray600, marginTop:2 }}>{selectedPatient?.age} yrs · {selectedPatient?.gender} · {selectedPatient?.phone}</div>
          </div>
        </div>

        {/* Vitals: weight / height / BP */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:16 }}>📊 Vitals</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[["weight","Weight (kg)","e.g. 70"],["height","Height (cm)","e.g. 170"],["bp","Blood Pressure","e.g. 120/80"]].map(([k,l,p])=>(
              <div key={k}>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</label>
                <input value={vitals[k]} onChange={e=>setVitals(v=>({...v,[k]:e.target.value}))} placeholder={p}
                  style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
                  onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
              </div>
            ))}
          </div>
        </div>

        {/* Diagnosis / Plan — big field */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>🩺 Diagnosis / Plan</div>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Diagnosis, Clinical Findings & Treatment Plan</label>
          <textarea value={diagnosis} onChange={e=>setDiagnosis(e.target.value)} rows={7}
            placeholder={"e.g.\nDiagnosis: Acute URTI\n\nFindings: Throat inflamed, mild fever\n\nPlan: Symptomatic treatment, rest 3 days"}
            style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", resize:"vertical", lineHeight:1.7, color:C.gray800 }}
            onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
        </div>

        {/* Medicines */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>💊 Medicines</div>
            <Btn onClick={addMed} small variant="ghost">+ Add Medicine</Btn>
          </div>
          {medicines.map((m,i)=>(
            <MedRow key={m.id} med={m} index={i} onChange={u=>updateMed(m.id,u)} onRemove={()=>removeMed(m.id)} />
          ))}
        </div>

        {/* Lab Tests */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"20px 24px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>🔬 Lab Tests</div>
            <Btn onClick={addLab} small variant="ghost">+ Add Test</Btn>
          </div>
          {labTests.map((lt,i)=>(
            <div key={lt.id} style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end", marginBottom:10 }}>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Test Name</label>
                <input value={lt.name} onChange={e=>updateLab(lt.id,{...lt,name:e.target.value})} placeholder="e.g. CBC, HbA1c, Lipid Profile"
                  style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
                  onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Instructions</label>
                <input value={lt.instructions} onChange={e=>updateLab(lt.id,{...lt,instructions:e.target.value})} placeholder="e.g. Fasting, early morning"
                  style={{ width:"100%", boxSizing:"border-box", padding:"8px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none" }}
                  onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
              </div>
              <button onClick={()=>removeLab(lt.id)} style={{ background:"#fff0f0", border:"1.5px solid #fecaca", color:C.red, borderRadius:8, padding:"8px 12px", cursor:"pointer", fontWeight:700, fontSize:18, height:38 }}>×</button>
            </div>
          ))}
          {labTests.length===0 && <div style={{ textAlign:"center", color:C.gray400, fontSize:13, padding:16 }}>No tests added yet.</div>}
        </div>

        {/* Notes & Follow-up */}
        <div style={{ background:C.white, border:`1px solid ${C.gray200}`, borderRadius:12, padding:"20px 24px", marginBottom:28 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>📝 Additional Info</div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.gray600, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>General Notes / Advice</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="e.g. Rest for 3 days, drink plenty of fluids, avoid cold food..."
              style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.gray200}`, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", resize:"vertical" }}
              onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
          </div>
          <Inp label="Follow-up Date" value={followUp} onChange={setFollowUp} placeholder="e.g. After 1 week, 15th July 2025" />
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
          <Btn onClick={()=>setView("list")} variant="ghost">Cancel</Btn>
          <Btn onClick={generatePreview} variant="navy">👁 Preview Prescription</Btn>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // VIEW: PREVIEW & PRINT
  // ════════════════════════════════════════════════════════════
  if (view === "preview") return (
    <div style={{ minHeight:"100vh", background:C.gray100, fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      <TopBar title="Preview" onBack={()=>setView("form")} right={
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={handlePrint} variant="ghost" style={{ color:"rgba(255,255,255,0.85)", borderColor:"rgba(255,255,255,0.3)" }}>🖨 Print / PDF</Btn>
          <Btn onClick={savePrescription} disabled={saving}>{saving?"Saving…":"✅ Save & Done"}</Btn>
        </div>
      }/>
      {toast && <div style={{ position:"fixed", top:70, right:24, background:C.navy, color:C.white, padding:"12px 20px", borderRadius:10, zIndex:999, fontSize:14, fontWeight:600 }}>{toast}</div>}
      <div style={{ maxWidth:760, margin:"32px auto", padding:"0 24px 48px" }} ref={printRef}>
        <RxPreview data={rxData} doctor={doctor} />
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // VIEW: HISTORY
  // ════════════════════════════════════════════════════════════
  if (view === "history") return (
    <div style={{ minHeight:"100vh", background:C.gray50, fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      <TopBar title="Prescription History" onBack={()=>setView("list")} />
      <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px" }}>
        {loadingHistory ? (
          <div style={{ textAlign:"center", padding:60, color:C.gray400, fontSize:15 }}>Loading prescriptions…</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:C.gray400 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:16, fontWeight:600 }}>No prescriptions yet</div>
            <div style={{ fontSize:13, marginTop:6 }}>Prescriptions you write will appear here</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {history.map((rx,i)=>(
              <div key={rx.rxId||i} style={{ background:C.white, borderRadius:12, border:`1px solid ${C.gray200}`, padding:"18px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:C.tealLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                    {rx.gender==="Female"?"👩":"👨"}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:C.navy, fontSize:15 }}>{rx.patientName}</div>
                    <div style={{ fontSize:12, color:C.gray600, marginTop:2 }}>{rx.date} · {rx.rxId}</div>
                    <div style={{ fontSize:12, color:C.gray600, marginTop:1 }}>
                      {(rx.medicines||[]).filter(m=>m.name).length} medicine(s) · {(rx.labTests||[]).filter(t=>t.name).length} lab test(s)
                    </div>
                  </div>
                </div>
                <Btn small variant="ghost" onClick={()=>{setRxData(rx);setView("preview");}}>View / Print</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

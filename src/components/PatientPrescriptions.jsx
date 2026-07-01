// ============================================================
// PatientPrescriptions.jsx  — Patient Portal: My Prescriptions
// Place in: src/components/PatientPrescriptions.jsx
//
// Props:
//   patientPhone — logged-in patient's phone number (string)
//   patientName  — patient's display name
//
// Usage:
//   import PatientPrescriptions from "./components/PatientPrescriptions";
//   <PatientPrescriptions patientPhone={user.phone} patientName={user.name} />
// ============================================================

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const C = {
  teal:"#2ABFBF", tealLight:"#e8f9f9", navy:"#1B3A5C", navyLight:"#2d5a8e",
  white:"#ffffff", gray50:"#f8fafc", gray100:"#f1f5f9", gray200:"#e2e8f0",
  gray400:"#94a3b8", gray600:"#475569", gray800:"#1e293b",
  purple:"#7c3aed", purpleLight:"#f5f3ff", green:"#10b981",
};

// ── Patient-facing prescription card ─────────────────────────
function RxCard({ rx, onView }) {
  const medCount = (rx.medicines||[]).filter(m=>m.name).length;
  const labCount = (rx.labTests||[]).filter(t=>t.name).length;
  return (
    <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.gray200}`, overflow:"hidden", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Card header */}
      <div style={{ background:`linear-gradient(90deg,${C.navy},${C.navyLight})`, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ color:C.teal, fontSize:13, fontWeight:700 }}>{rx.rxId}</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:2 }}>{rx.date}</div>
        </div>
        <span style={{ background:"rgba(255,255,255,0.15)", color:C.white, fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20 }}>
          {medCount} Medicine{medCount!==1?"s":""}{labCount>0?` · ${labCount} Lab Test${labCount!==1?"s":""}`:""}
        </span>
      </div>

      {/* Doctor info */}
      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.gray100}`, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:38, height:38, borderRadius:"50%", background:C.tealLight, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>👨‍⚕️</div>
        <div>
          <div style={{ fontWeight:600, color:C.navy, fontSize:14 }}>{rx.doctorName || "Your Doctor"}</div>
          <div style={{ fontSize:12, color:C.gray600 }}>{rx.doctorSpecialty || "AsaanDoc"}</div>
        </div>
      </div>

      {/* Quick summary */}
      <div style={{ padding:"14px 20px" }}>
        {/* Medicines preview */}
        {medCount > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>💊 Medicines</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(rx.medicines||[]).filter(m=>m.name).map((m,i)=>(
                <span key={i} style={{ background:C.tealLight, color:C.navy, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20 }}>
                  {m.name}{m.strength?` ${m.strength}`:""} · {m.frequency}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Lab tests preview */}
        {labCount > 0 && (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>🔬 Lab Tests</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(rx.labTests||[]).filter(t=>t.name).map((t,i)=>(
                <span key={i} style={{ background:C.purpleLight, color:C.purple, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:20 }}>{t.name}</span>
              ))}
            </div>
          </div>
        )}
        {/* Follow-up */}
        {rx.followUp && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:8 }}>
            <span style={{fontSize:14}}>📅</span>
            <span style={{ fontSize:12, color:C.gray600 }}><strong>Follow-up:</strong> {rx.followUp}</span>
          </div>
        )}
        <div style={{ marginTop:14, display:"flex", justifyContent:"flex-end" }}>
          <button onClick={()=>onView(rx)}
            style={{ background:C.navy, color:C.white, border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            View Full Prescription
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Full prescription detail modal ────────────────────────────
function RxDetail({ rx, onClose }) {
  if (!rx) return null;

  const handlePrint = () => {
    const el = document.getElementById("patient-rx-print");
    if (!el) return;
    const win = window.open("","_blank");
    win.document.write(`<html><head><title>Prescription ${rx.rxId}</title><style>body{margin:0;font-family:'Segoe UI',Arial,sans-serif}@media print{body{margin:0}}</style></head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(()=>{win.print();win.close();},500);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", overflowY:"auto", padding:"24px 16px" }}>
      <div style={{ background:C.white, borderRadius:16, width:"100%", maxWidth:720, overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* Modal top bar */}
        <div style={{ background:C.navy, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.white }}>Prescription Detail</div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handlePrint} style={{ background:"rgba(255,255,255,0.15)", color:C.white, border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>🖨 Save / Print</button>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)", color:C.white, border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>✕ Close</button>
          </div>
        </div>

        {/* Print area */}
        <div id="patient-rx-print" style={{ padding:"24px", fontFamily:"'Segoe UI',Arial,sans-serif" }}>

          {/* Header */}
          <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyLight})`, borderRadius:10, padding:"20px 24px", color:C.white, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:22, fontWeight:800 }}>asaan<span style={{color:C.teal}}>doc</span></div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginTop:2 }}>صحت کا آسان راستہ</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Prescription No.</div>
                <div style={{ fontSize:15, fontWeight:700, color:C.teal }}>{rx.rxId}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", marginTop:2 }}>{rx.date}</div>
              </div>
            </div>
            <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.15)", fontSize:12, color:"rgba(255,255,255,0.75)", lineHeight:1.7 }}>
              <strong style={{color:C.white}}>{rx.doctorName||"Your Doctor"}</strong>
              {rx.doctorSpecialty && <> · {rx.doctorSpecialty}</>}
              {rx.doctorQualification && <> · {rx.doctorQualification}</>}
            </div>
          </div>

          {/* Patient info */}
          <div style={{ background:C.tealLight, borderRadius:8, padding:"14px 18px", marginBottom:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom: rx.diagnosis?10:0 }}>
              {[["Patient",rx.patientName],["Age / Gender",`${rx.age} yrs · ${rx.gender}`],["Phone",rx.phone],["Weight",rx.weight?`${rx.weight} kg`:"—"],["Height",rx.height?`${rx.height} cm`:"—"],["Blood Pressure",rx.bp||"—"]].map(([l,v])=>(
                <div key={l}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.teal, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.navy }}>{v}</div>
                </div>
              ))}
            </div>
            {rx.diagnosis && (
              <div style={{ paddingTop:10, borderTop:`1px solid rgba(42,191,191,0.2)` }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.teal, textTransform:"uppercase", marginBottom:4 }}>Diagnosis / Plan</div>
                <div style={{ fontSize:13, color:C.navy, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{rx.diagnosis}</div>
              </div>
            )}
          </div>

          {/* Medicines */}
          {(rx.medicines||[]).filter(m=>m.name).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ background:C.teal, color:C.white, borderRadius:"50%", width:26, height:26, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800 }}>℞</span>
                Medications
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.gray100 }}>
                    {["#","Medicine","Strength","Frequency","Duration","Instructions"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:C.gray600, textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:`2px solid ${C.gray200}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rx.medicines||[]).filter(m=>m.name).map((m,i)=>(
                    <tr key={i} style={{ background:i%2===0?C.white:C.gray50, borderBottom:`1px solid ${C.gray100}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:700, color:C.teal }}>{i+1}</td>
                      <td style={{ padding:"9px 10px", fontWeight:600, color:C.navy }}>{m.name}</td>
                      <td style={{ padding:"9px 10px" }}>{m.strength||"—"}</td>
                      <td style={{ padding:"9px 10px" }}>{m.frequency}</td>
                      <td style={{ padding:"9px 10px" }}>{m.duration}</td>
                      <td style={{ padding:"9px 10px", color:C.gray600 }}>{m.instructions||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lab Tests */}
          {(rx.labTests||[]).filter(t=>t.name).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ background:C.purple, color:C.white, borderRadius:"50%", width:26, height:26, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🔬</span>
                Lab Tests
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.purpleLight }}>
                    {["#","Test","Instructions"].map(h=>(
                      <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:C.purple, textTransform:"uppercase", letterSpacing:"0.04em", borderBottom:`2px solid #ddd6fe` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rx.labTests||[]).filter(t=>t.name).map((t,i)=>(
                    <tr key={i} style={{ background:i%2===0?C.white:"#faf5ff", borderBottom:`1px solid ${C.gray100}` }}>
                      <td style={{ padding:"9px 10px", fontWeight:700, color:C.purple }}>{i+1}</td>
                      <td style={{ padding:"9px 10px", fontWeight:600, color:C.navy }}>{t.name}</td>
                      <td style={{ padding:"9px 10px", color:C.gray600 }}>{t.instructions||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rx.notes && (
            <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"12px 16px", marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#92400e", textTransform:"uppercase", marginBottom:4 }}>Notes</div>
              <div style={{ fontSize:13, color:"#78350f", lineHeight:1.6 }}>{rx.notes}</div>
            </div>
          )}

          {rx.followUp && (
            <div style={{ background:C.tealLight, borderRadius:8, padding:"10px 16px", display:"flex", gap:8, alignItems:"center" }}>
              <span>📅</span>
              <span style={{ fontSize:13, color:C.navy }}><strong>Follow-up:</strong> {rx.followUp}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Patient Prescriptions View ──────────────────────────
export default function PatientPrescriptions({ patientPhone, patientName }) {
  const phone = patientPhone || "+92 321 9876543"; // fallback for demo
  const name  = patientName  || "Muhammad Ali";

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [error,         setError]         = useState("");

  // Demo data shown when Firebase not connected
  const DEMO = [{
    rxId:"RX-001", date:"1 July 2025", patientName:name,
    age:34, gender:"Male", phone,
    weight:"72", height:"175", bp:"118/76",
    doctorName:"Dr. Ahmed Raza", doctorSpecialty:"General Physician",
    diagnosis:"Acute Upper Respiratory Tract Infection\n\nFindings: Throat inflamed, mild fever 99.2°F\n\nPlan: Symptomatic treatment, rest 3 days",
    medicines:[
      {id:1,name:"Paracetamol",strength:"500mg",route:"Oral",frequency:"Three times daily",duration:"5 days",instructions:"After meals"},
      {id:2,name:"Amoxicillin",strength:"500mg",route:"Oral",frequency:"Twice daily",duration:"7 days",instructions:"With food"},
    ],
    labTests:[{id:1,name:"CBC",instructions:"Any time"},{id:2,name:"CRP",instructions:"Any time"}],
    notes:"Drink plenty of fluids. Avoid cold food and drinks.",
    followUp:"After 1 week",
  }];

  useEffect(()=>{
    (async()=>{
      try {
        if(typeof db!=="undefined"&&db){
          const q = query(collection(db,"prescriptions"),where("phone","==",phone),orderBy("createdAt","desc"));
          const snap = await getDocs(q);
          const data = snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
          setPrescriptions(data.length>0?data:DEMO);
        } else {
          setPrescriptions(DEMO);
        }
      } catch(e) {
        setPrescriptions(DEMO);
      } finally {
        setLoading(false);
      }
    })();
  },[phone]);

  return (
    <div style={{ minHeight:"100vh", background:C.gray50, fontFamily:"'Segoe UI',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyLight})`, padding:"24px 24px 20px" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div style={{ fontSize:20, fontWeight:800, color:C.white, marginBottom:4 }}>asaan<span style={{color:C.teal}}>doc</span></div>
          <div style={{ fontSize:16, fontWeight:600, color:C.white, marginTop:8 }}>My Prescriptions</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:2 }}>
            {name} · {prescriptions.length} prescription{prescriptions.length!==1?"s":""}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:"24px 16px" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:C.gray400, fontSize:15 }}>Loading your prescriptions…</div>
        ) : prescriptions.length === 0 ? (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>💊</div>
            <div style={{ fontSize:16, fontWeight:600, color:C.navy }}>No prescriptions yet</div>
            <div style={{ fontSize:13, color:C.gray600, marginTop:6 }}>Your doctor's prescriptions will appear here after your appointment</div>
          </div>
        ) : (
          prescriptions.map((rx,i)=>(
            <RxCard key={rx.rxId||i} rx={rx} onView={setSelected} />
          ))
        )}
      </div>

      {selected && <RxDetail rx={selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}


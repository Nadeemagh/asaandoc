// src/pages/AdminPanel.js
// Full admin dashboard — stats, revenue, doctors, patients, approvals
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { logoutUser, backfillDoctorSlugs, ensureDoctorSlug, createClinic, getAllClinics, assignDoctorToClinic, updateClinic, deleteClinic, deleteDoctor, deletePatientProfile } from "../firebase/services";
import AdminPromotionsManager from "../components/AdminPromotionsManager";
import AdminBackupRestore from "../components/AdminBackupRestore";

const T = {
  primary:"#2ABFBF", primaryDark:"#1a9999", primaryLight:"#e8f9f9",
  navy:"#1B3A5C", navyLight:"#2d5a8e",
  white:"#fff", bg:"#f8fafc", border:"#e2e8f0",
  text:"#1e293b", muted:"#94a3b8", accent:"#10b981",
  red:"#ef4444", amber:"#f59e0b", purple:"#7c3aed",
};

const Card = ({children, style={}}) => (
  <div style={{background:T.white,borderRadius:14,padding:"20px 24px",border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",...style}}>
    {children}
  </div>
);

const StatCard = ({label,value,icon,color,sub}) => (
  <div style={{background:T.white,borderRadius:14,padding:"20px",border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:16}}>
    <div style={{width:52,height:52,borderRadius:14,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{icon}</div>
    <div>
      <div style={{fontSize:26,fontWeight:900,color}}>{value}</div>
      <div style={{fontSize:13,fontWeight:600,color:T.text}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>{sub}</div>}
    </div>
  </div>
);

export default function AdminPanel() {
  const [view,        setView]        = useState("dashboard");
  const [doctors,     setDoctors]     = useState([]);
  const [patients,    setPatients]    = useState([]);
  const [appointments,setAppointments]= useState([]);
  const [pending,     setPending]     = useState([]);
  const [clinics,     setClinics]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState("");
  const [search,      setSearch]      = useState("");
  const [newClinicName, setNewClinicName] = useState("");
  const [newClinicAddress, setNewClinicAddress] = useState("");
  const [newClinicPhone, setNewClinicPhone] = useState("");
  const [newClinicLogo, setNewClinicLogo] = useState("");
  const [creatingClinic, setCreatingClinic] = useState(false);

  const loadClinics = async () => {
    try { setClinics(await getAllClinics()); } catch(e) { console.error(e); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  useEffect(()=>{
    (async()=>{
      try {
        const [docSnap,userSnap,apptSnap,pendingSnap] = await Promise.all([
          getDocs(collection(db,"doctors")),
          getDocs(collection(db,"users")),
          getDocs(collection(db,"appointments")),
          getDocs(query(collection(db,"doctors"),where("approved","==",false))),
        ]);
        setDoctors(docSnap.docs.map(d=>({id:d.id,...d.data()})));
        setPatients(userSnap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.role!=="doctor"));
        setAppointments(apptSnap.docs.map(d=>({id:d.id,...d.data()})));
        setPending(pendingSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.error(e); }
      loadClinics();
      setLoading(false);
    })();
  },[]);

  const approveDoctor = async (id) => {
    await updateDoc(doc(db,"doctors",id),{approved:true});
    setPending(p=>p.filter(d=>d.id!==id));
    setDoctors(d=>d.map(doc=>doc.id===id?{...doc,approved:true}:doc));
    showToast("✅ Doctor approved!");
  };

  const rejectDoctor = async (id) => {
    if (!window.confirm("Reject and delete this doctor registration?")) return;
    await deleteDoc(doc(db,"doctors",id));
    setPending(p=>p.filter(d=>d.id!==id));
    setDoctors(d=>d.filter(doc=>doc.id!==id));
    showToast("🗑️ Doctor rejected.");
  };

  const toggleDoctorStatus = async (id, current) => {
    await updateDoc(doc(db,"doctors",id),{active:!current});
    setDoctors(d=>d.map(doc=>doc.id===id?{...doc,active:!current}:doc));
    showToast(!current?"✅ Doctor activated":"⏸️ Doctor deactivated");
  };

  const handleDeleteDoctor = async (doctor) => {
    if (!window.confirm(`⚠️ Permanently delete Dr. ${doctor.name}?\n\nThis removes their profile, and their public link/appointments will no longer work. This cannot be undone.\n\n(Note: their login credentials in Firebase Auth are not removed by this — only their app profile/access.)`)) return;
    try {
      await deleteDoctor(doctor.id);
      setDoctors(ds => ds.filter(d => d.id !== doctor.id));
      showToast("🗑️ Doctor deleted.");
    } catch(e) { console.error(e); showToast("Failed to delete doctor."); }
  };

  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`⚠️ Permanently delete ${patient.name || patient.email}'s profile?\n\nThis removes their app access and profile data. This cannot be undone.\n\n(Note: their login credentials in Firebase Auth are not removed by this — only their app profile/access.)`)) return;
    try {
      await deletePatientProfile(patient.id);
      setPatients(ps => ps.filter(p => p.id !== patient.id));
      showToast("🗑️ Patient deleted.");
    } catch(e) { console.error(e); showToast("Failed to delete patient."); }
  };

  const copyPublicLink = async (doc) => {
    try {
      const slug = await ensureDoctorSlug(doc);
      if (!doc.slug) {
        setDoctors(ds => ds.map(d => d.id === doc.id ? { ...d, slug } : d));
      }
      const url = `${window.location.origin}/doctor/${slug}`;
      await navigator.clipboard.writeText(url);
      showToast("🔗 Public profile link copied!");
    } catch (e) {
      console.error(e);
      showToast("Failed to copy link.");
    }
  };

  const handleCreateClinic = async () => {
    if (!newClinicName.trim()) { showToast("Enter a clinic name."); return; }
    setCreatingClinic(true);
    try {
      await createClinic({ name: newClinicName.trim(), address: newClinicAddress.trim(), phone: newClinicPhone.trim(), logo: newClinicLogo.trim() });
      setNewClinicName(""); setNewClinicAddress(""); setNewClinicPhone(""); setNewClinicLogo("");
      await loadClinics();
      showToast("✅ Clinic created!");
    } catch(e) { console.error(e); showToast("Failed to create clinic."); }
    setCreatingClinic(false);
  };

  const copyClinicLink = async (clinic) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/clinic/${clinic.slug}`);
      showToast("🔗 Clinic signup link copied!");
    } catch(e) { showToast("Failed to copy link."); }
  };

  const [editingClinic, setEditingClinic] = useState(null); // clinic object being edited, or null
  const [savingClinicEdit, setSavingClinicEdit] = useState(false);

  const openEditClinic = (clinic) => {
    setEditingClinic({
      id: clinic.id,
      name: clinic.name || "",
      address: clinic.address || "",
      phone: clinic.phone || "",
      logo: clinic.logo || "",
    });
  };

  const handleSaveClinicEdit = async () => {
    if (!editingClinic.name.trim()) { showToast("Clinic name is required."); return; }
    setSavingClinicEdit(true);
    try {
      await updateClinic(editingClinic.id, {
        name: editingClinic.name.trim(),
        address: editingClinic.address.trim(),
        phone: editingClinic.phone.trim(),
        logo: editingClinic.logo.trim(),
      });
      setClinics(cs => cs.map(c => c.id === editingClinic.id ? { ...c, ...editingClinic } : c));
      setEditingClinic(null);
      showToast("✅ Clinic updated!");
    } catch(e) { console.error(e); showToast("Failed to update clinic."); }
    setSavingClinicEdit(false);
  };

  const handleDeleteClinic = async (clinic) => {
    const clinicDoctorCount = doctors.filter(d => d.clinicId === clinic.id).length;
    const warning = clinicDoctorCount > 0
      ? `⚠️ Delete "${clinic.name}"?\n\n${clinicDoctorCount} doctor(s) currently assigned to this clinic will be moved back to the open AsaanDoc marketplace. This cannot be undone.`
      : `Delete "${clinic.name}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;
    try {
      await deleteClinic(clinic.id);
      setClinics(cs => cs.filter(c => c.id !== clinic.id));
      setDoctors(ds => ds.map(d => d.clinicId === clinic.id ? { ...d, clinicId: null } : d));
      showToast("🗑️ Clinic deleted.");
    } catch(e) { console.error(e); showToast("Failed to delete clinic."); }
  };

  const handleAssignClinic = async (doctorId, clinicId) => {
    try {
      await assignDoctorToClinic(doctorId, clinicId);
      setDoctors(ds => ds.map(d => d.id === doctorId ? { ...d, clinicId: clinicId || null } : d));
      showToast(clinicId ? "✅ Doctor assigned to clinic." : "✅ Doctor moved to open marketplace.");
    } catch(e) { console.error(e); showToast("Failed to update."); }
  };

  const [backfilling, setBackfilling] = useState(false);
  const handleBackfillSlugs = async () => {
    setBackfilling(true);
    try {
      const updated = await backfillDoctorSlugs();
      if (updated.length > 0) {
        setDoctors(ds => ds.map(d => {
          const match = updated.find(u => u.id === d.id);
          return match ? { ...d, slug: match.slug } : d;
        }));
      }
      showToast(`✅ Generated links for ${updated.length} doctor(s).`);
    } catch (e) {
      console.error(e);
      showToast("Failed to generate links.");
    }
    setBackfilling(false);
  };

  // Stats
  const totalRevenue = appointments.filter(a=>a.status==="completed").reduce((s,a)=>s+Number(a.clinicFee||0),0);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppts = appointments.filter(a=>a.date===todayStr);
  const thisMonthAppts = appointments.filter(a=>a.date?.startsWith(new Date().toISOString().slice(0,7)));
  const specialties = [...new Set(doctors.map(d=>d.specialty).filter(Boolean))];

  const nav = [
    ["dashboard","📊","Dashboard"],
    ["doctors","👨‍⚕️","Doctors"],
    ["pending","🔔","Pending",""+pending.length],
    ["patients","👥","Patients"],
    ["appointments","📅","Appointments"],
    ["revenue","💰","Revenue"],
    ["promotions","📣","Promotions"],
    ["clinics","🏥","Clinics"],
    ["backup","💾","Backup"],
  ];

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:`4px solid ${T.border}`,borderTop:`4px solid ${T.primary}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <div style={{color:T.muted}}>Loading admin panel…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:T.bg,display:"flex"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {toast&&<div style={{position:"fixed",top:20,right:24,background:T.navy,color:"#fff",padding:"12px 20px",borderRadius:10,zIndex:999,fontSize:14,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",animation:"fadeUp 0.3s ease-out"}}>{toast}</div>}

      {/* Sidebar */}
      <div style={{width:220,background:`linear-gradient(180deg,${T.navy},#0a2d45)`,display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"4px 0 20px rgba(0,0,0,0.15)"}}>
        <div style={{padding:"24px 20px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:22,fontWeight:900,color:"#fff"}}>asaan<span style={{color:T.primary}}>doc</span></div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>Admin Panel</div>
        </div>
        <div style={{padding:"12px 10px",flex:1}}>
          {nav.map(([v,icon,label,badge])=>(
            <button key={v} onClick={()=>setView(v)}
              style={{width:"100%",padding:"11px 12px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:4,textAlign:"left",display:"flex",alignItems:"center",gap:10,
                background:view===v?"rgba(255,255,255,0.15)":"transparent",color:view===v?"#fff":"rgba(255,255,255,0.55)",fontWeight:600,fontSize:13,fontFamily:"inherit",justifyContent:"space-between"}}>
              <span style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>{icon}</span>{label}</span>
              {badge&&badge!=="0"&&<span style={{background:T.red,color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:800}}>{badge}</span>}
            </button>
          ))}
        </div>
        <div style={{padding:"12px 10px 20px"}}>
          <button onClick={logoutUser}
            style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,overflow:"auto"}}>
        {/* Top bar */}
        <div style={{background:T.white,padding:"14px 28px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:9,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:T.text}}>
              {nav.find(n=>n[0]===view)?.[2]} {view==="pending"&&pending.length>0&&<span style={{fontSize:13,background:T.red,color:"#fff",padding:"2px 8px",borderRadius:20,marginLeft:6}}>{pending.length}</span>}
            </div>
            <div style={{fontSize:12,color:T.muted}}>{new Date().toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{padding:"6px 14px",background:T.primaryLight,color:T.primary,borderRadius:20,fontSize:12,fontWeight:700}}>👑 Admin</div>
          </div>
        </div>

        <div style={{padding:"24px 28px"}}>

          {/* ── DASHBOARD ── */}
          {view==="dashboard"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:24}}>
                <StatCard label="Total Doctors"     value={doctors.length}       icon="👨‍⚕️" color={T.primary} sub={`${doctors.filter(d=>d.approved!==false).length} approved`}/>
                <StatCard label="Total Patients"    value={patients.length}      icon="👥"  color={T.purple} sub="registered users"/>
                <StatCard label="Total Appointments" value={appointments.length} icon="📅"  color={T.accent} sub={`${todayAppts.length} today`}/>
                <StatCard label="Total Revenue"     value={`PKR ${totalRevenue.toLocaleString()}`} icon="💰" color="#f59e0b" sub="from completed appts"/>
                <StatCard label="Pending Approvals" value={pending.length}       icon="🔔"  color={T.red}    sub="doctors waiting"/>
                <StatCard label="This Month"        value={thisMonthAppts.length} icon="📈" color={T.navyLight} sub="appointments"/>
              </div>

              {/* Specialty breakdown */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
                <Card>
                  <div style={{fontWeight:800,color:T.text,marginBottom:16,fontSize:15}}>👨‍⚕️ Doctors by Specialty</div>
                  {specialties.slice(0,8).map(spec=>{
                    const count = doctors.filter(d=>d.specialty===spec).length;
                    const pct = Math.round(count/doctors.length*100);
                    return (
                      <div key={spec} style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,color:T.text,fontWeight:600}}>{spec}</span>
                          <span style={{fontSize:13,color:T.primary,fontWeight:700}}>{count}</span>
                        </div>
                        <div style={{height:6,background:T.bg,borderRadius:10,overflow:"hidden"}}>
                          <div style={{height:"100%",background:`linear-gradient(90deg,${T.primary},${T.primaryDark})`,borderRadius:10,width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </Card>
                <Card>
                  <div style={{fontWeight:800,color:T.text,marginBottom:16,fontSize:15}}>📅 Appointment Status</div>
                  {[["confirmed",T.accent,"Confirmed"],["pending","#f59e0b","Pending"],["completed",T.primary,"Completed"],["cancelled",T.red,"Cancelled"]].map(([st,col,lbl])=>{
                    const cnt=appointments.filter(a=>a.status===st).length;
                    const pct=appointments.length?Math.round(cnt/appointments.length*100):0;
                    return (
                      <div key={st} style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,color:T.text,fontWeight:600}}>{lbl}</span>
                          <span style={{fontSize:13,fontWeight:700,color:col}}>{cnt} ({pct}%)</span>
                        </div>
                        <div style={{height:6,background:T.bg,borderRadius:10,overflow:"hidden"}}>
                          <div style={{height:"100%",borderRadius:10,background:col,width:`${pct}%`}}/>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>

              {/* Recent appointments */}
              <Card>
                <div style={{fontWeight:800,color:T.text,marginBottom:16,fontSize:15}}>📋 Recent Appointments</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:T.bg}}>
                      {["Patient","Doctor","Date","Clinic","Fee","Status"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.sort((a,b)=>b.date?.localeCompare(a.date||"")).slice(0,10).map((a,i)=>(
                      <tr key={a.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg}}>
                        <td style={{padding:"10px 12px",fontWeight:600,color:T.text}}>{a.patientName||a.patientEmail?.split("@")[0]||"—"}</td>
                        <td style={{padding:"10px 12px",color:T.muted}}>{a.doctorName||"—"}</td>
                        <td style={{padding:"10px 12px",color:T.muted}}>{a.date||"—"}</td>
                        <td style={{padding:"10px 12px",color:T.muted}}>{a.clinicName||"—"}</td>
                        <td style={{padding:"10px 12px",fontWeight:700,color:T.primary}}>PKR {Number(a.clinicFee||0).toLocaleString()}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,
                            background:a.status==="completed"?"#f0fdf4":a.status==="confirmed"?"#e0f2fe":a.status==="pending"?"#fffbeb":"#fef2f2",
                            color:a.status==="completed"?T.accent:a.status==="confirmed"?"#0369a1":a.status==="pending"?"#f59e0b":T.red}}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── PENDING APPROVALS ── */}
          {view==="pending"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              {pending.length===0?(
                <Card style={{textAlign:"center",padding:"48px"}}>
                  <div style={{fontSize:48,marginBottom:12}}>✅</div>
                  <div style={{fontWeight:700,color:T.text,fontSize:16}}>No pending approvals</div>
                  <div style={{color:T.muted,marginTop:6}}>All doctor registrations have been reviewed</div>
                </Card>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {pending.map(doc=>(
                    <Card key={doc.id} style={{padding:"20px 24px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                        <div style={{width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.navy})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:22,flexShrink:0}}>
                          {doc.name?.charAt(0)||"D"}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                            <span style={{fontWeight:800,fontSize:16,color:T.text}}>{doc.name}</span>
                            <span style={{fontSize:11,background:"#fffbeb",color:"#f59e0b",padding:"2px 10px",borderRadius:20,fontWeight:700,border:"1px solid #fde68a"}}>⏳ Pending Review</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8,fontSize:13,color:T.muted}}>
                            <div>🏥 <strong>Specialty:</strong> {doc.specialty||"—"}</div>
                            <div>🎓 <strong>Qualification:</strong> {doc.qualifications||doc.qualification||"—"}</div>
                            <div>📋 <strong>PMC No:</strong> {doc.pmcNo||doc.license||"—"}</div>
                            <div>⏳ <strong>Experience:</strong> {doc.exp||"—"} years</div>
                            <div>📧 <strong>Email:</strong> {doc.email||"—"}</div>
                            <div>📱 <strong>Phone:</strong> {doc.phone||"—"}</div>
                          </div>
                          {doc.bio&&<div style={{marginTop:10,fontSize:13,color:T.muted,padding:"10px",background:T.bg,borderRadius:8}}>📝 {doc.bio}</div>}
                        </div>
                        <div style={{display:"flex",gap:8,flexShrink:0}}>
                          <button onClick={()=>approveDoctor(doc.id)}
                            style={{padding:"10px 20px",background:`linear-gradient(135deg,${T.accent},#059669)`,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                            ✅ Approve
                          </button>
                          <button onClick={()=>rejectDoctor(doc.id)}
                            style={{padding:"10px 16px",background:"#fef2f2",color:T.red,border:`1.5px solid ${T.red}`,borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── DOCTORS ── */}
          {view==="doctors"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <div style={{marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search doctors..."
                  style={{flex:1,padding:"10px 16px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border}/>
                <button onClick={handleBackfillSlugs} disabled={backfilling}
                  style={{padding:"10px 16px",background:T.primaryLight,color:T.primary,border:`1.5px solid ${T.primary}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:backfilling?"not-allowed":"pointer",whiteSpace:"nowrap",fontFamily:"inherit"}}>
                  {backfilling?"Generating…":"🔗 Generate Missing Links"}
                </button>
                <div style={{color:T.muted,fontSize:13,whiteSpace:"nowrap"}}>{doctors.length} total doctors</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {doctors.filter(d=>!search||d.name?.toLowerCase().includes(search.toLowerCase())||d.specialty?.toLowerCase().includes(search.toLowerCase())).map(doc=>(
                  <Card key={doc.id} style={{padding:"16px 20px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                      {doc.photo
                        ?<img src={doc.photo} alt={doc.name} style={{width:48,height:48,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>{e.target.style.display="none";}}/>
                        :<div style={{width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.navy})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0}}>{doc.name?.charAt(0)||"D"}</div>
                      }
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:15,color:T.text}}>{doc.name}</span>
                          <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:700,
                            background:doc.approved===false?"#fffbeb":doc.active===false?"#fef2f2":"#f0fdf4",
                            color:doc.approved===false?"#f59e0b":doc.active===false?T.red:T.accent}}>
                            {doc.approved===false?"Pending":doc.active===false?"Inactive":"Active"}
                          </span>
                        </div>
                        <div style={{fontSize:12,color:T.primary,fontWeight:600}}>{doc.specialty}</div>
                        <div style={{fontSize:11,color:T.muted}}>⏳ {doc.exp} yrs · PMC: {doc.pmcNo||doc.license||"—"} · {(doc.clinics||[]).length} clinic(s)</div>
                        {doc.slug && <div style={{fontSize:11,color:T.muted,marginTop:2}}>🔗 /doctor/{doc.slug}</div>}
                        <div style={{marginTop:6}}>
                          <select value={doc.clinicId||""} onChange={e=>handleAssignClinic(doc.id, e.target.value||null)}
                            style={{padding:"5px 10px",borderRadius:7,border:`1.5px solid ${T.border}`,fontSize:11,fontFamily:"inherit",color:T.text,background:T.white}}>
                            <option value="">🌐 Open AsaanDoc Marketplace</option>
                            {clinics.map(c=>(
                              <option key={c.id} value={c.id}>🏥 {c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>copyPublicLink(doc)}
                          style={{padding:"8px 14px",background:T.primaryLight,color:T.primary,border:`1.5px solid ${T.primary}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          🔗 Copy Link
                        </button>
                        <button onClick={()=>toggleDoctorStatus(doc.id,doc.active!==false)}
                          style={{padding:"8px 14px",background:doc.active===false?"#f0fdf4":"#fef2f2",color:doc.active===false?T.accent:T.red,border:`1.5px solid ${doc.active===false?T.accent:T.red}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          {doc.active===false?"✅ Activate":"⏸️ Deactivate"}
                        </button>
                        <button onClick={()=>handleDeleteDoctor(doc)}
                          style={{padding:"8px 14px",background:"#fef2f2",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── PATIENTS ── */}
          {view==="patients"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <div style={{marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patients..."
                  style={{flex:1,padding:"10px 16px",border:`1.5px solid ${T.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none"}}
                  onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border}/>
                <div style={{color:T.muted,fontSize:13,whiteSpace:"nowrap"}}>{patients.length} total patients</div>
              </div>
              <Card>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:T.bg}}>
                      {["Name","Email","Phone","Appointments","Joined","Actions"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {patients.filter(p=>!search||p.name?.toLowerCase().includes(search.toLowerCase())||p.email?.toLowerCase().includes(search.toLowerCase())).map((p,i)=>{
                      const apptCount = appointments.filter(a=>a.patientEmail===p.email).length;
                      return (
                        <tr key={p.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg}}>
                          <td style={{padding:"10px 12px",fontWeight:600,color:T.text}}>{p.name||"—"}</td>
                          <td style={{padding:"10px 12px",color:T.muted}}>{p.email||"—"}</td>
                          <td style={{padding:"10px 12px",color:T.muted}}>{p.phone?`+92${p.phone}`:"—"}</td>
                          <td style={{padding:"10px 12px",color:T.primary,fontWeight:700}}>{apptCount}</td>
                          <td style={{padding:"10px 12px",color:T.muted,fontSize:11}}>{p.createdAt?.seconds?new Date(p.createdAt.seconds*1000).toLocaleDateString("en-PK"):"—"}</td>
                          <td style={{padding:"10px 12px"}}>
                            <button onClick={()=>handleDeletePatient(p)}
                              style={{padding:"5px 12px",background:"#fef2f2",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── APPOINTMENTS ── */}
          {view==="appointments"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {["all","pending","confirmed","completed","cancelled"].map(s=>(
                  <button key={s} onClick={()=>setSearch(s==="all"?"":s)}
                    style={{padding:"7px 16px",borderRadius:20,border:`1.5px solid ${T.border}`,background:search===s||(!search&&s==="all")?T.primary:T.white,color:search===s||(!search&&s==="all")?"#fff":T.muted,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize",fontFamily:"inherit"}}>
                    {s} ({s==="all"?appointments.length:appointments.filter(a=>a.status===s).length})
                  </button>
                ))}
              </div>
              <Card>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:T.bg}}>
                      {["Patient","Doctor","Date","Clinic","Fee","Status"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.filter(a=>!search||a.status===search).sort((a,b)=>b.date?.localeCompare(a.date||"")).map((a,i)=>(
                      <tr key={a.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg}}>
                        <td style={{padding:"10px 12px",fontWeight:600}}>{a.patientName||a.patientEmail?.split("@")[0]||"—"}</td>
                        <td style={{padding:"10px 12px",color:T.muted}}>{a.doctorName||"—"}</td>
                        <td style={{padding:"10px 12px",color:T.muted}}>{a.date||"—"}</td>
                        <td style={{padding:"10px 12px",color:T.muted}}>{a.clinicName||"—"}</td>
                        <td style={{padding:"10px 12px",fontWeight:700,color:T.primary}}>PKR {Number(a.clinicFee||0).toLocaleString()}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,
                            background:a.status==="completed"?"#f0fdf4":a.status==="confirmed"?"#e0f2fe":a.status==="pending"?"#fffbeb":"#fef2f2",
                            color:a.status==="completed"?T.accent:a.status==="confirmed"?"#0369a1":a.status==="pending"?"#f59e0b":T.red}}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── REVENUE ── */}
          {view==="revenue"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:24}}>
                <StatCard label="Total Revenue"     value={`PKR ${totalRevenue.toLocaleString()}`}  icon="💰" color="#f59e0b"/>
                <StatCard label="This Month"        value={`PKR ${thisMonthAppts.filter(a=>a.status==="completed").reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}`} icon="📅" color={T.accent}/>
                <StatCard label="Today"             value={`PKR ${todayAppts.filter(a=>a.status==="completed").reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}`} icon="🌅" color={T.primary}/>
                <StatCard label="Completed Appts"   value={appointments.filter(a=>a.status==="completed").length} icon="✅" color={T.purple}/>
              </div>
              <Card>
                <div style={{fontWeight:800,color:T.text,marginBottom:16,fontSize:15}}>💰 Revenue by Doctor</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:T.bg}}>
                      {["Doctor","Specialty","Completed","Revenue"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc,i)=>{
                      const docAppts = appointments.filter(a=>a.doctorName===doc.name&&a.status==="completed");
                      const rev = docAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0);
                      return (
                        <tr key={doc.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg}}>
                          <td style={{padding:"10px 12px",fontWeight:700,color:T.text}}>{doc.name}</td>
                          <td style={{padding:"10px 12px",color:T.muted}}>{doc.specialty}</td>
                          <td style={{padding:"10px 12px",color:T.accent,fontWeight:700}}>{docAppts.length}</td>
                          <td style={{padding:"10px 12px",fontWeight:800,color:T.primary}}>PKR {rev.toLocaleString()}</td>
                        </tr>
                      );
                    }).sort((a,b)=>0)}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* ── CLINICS ── */}
          {view==="clinics"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <Card style={{marginBottom:20}}>
                <div style={{fontWeight:800,color:T.text,marginBottom:14,fontSize:15}}>+ Add New Clinic</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto auto",gap:12,alignItems:"end"}}>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Clinic Name</label>
                    <input value={newClinicName} onChange={e=>setNewClinicName(e.target.value)} placeholder="e.g. ABC Medical Center"
                      style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Address</label>
                    <input value={newClinicAddress} onChange={e=>setNewClinicAddress(e.target.value)} placeholder="Optional"
                      style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Phone</label>
                    <input value={newClinicPhone} onChange={e=>setNewClinicPhone(e.target.value)} placeholder="Optional"
                      style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Logo</label>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {newClinicLogo && (
                        <img src={newClinicLogo} alt="Logo preview" style={{width:36,height:36,borderRadius:8,objectFit:"cover",border:`1.5px solid ${T.border}`}}/>
                      )}
                      <label style={{padding:"9px 14px",background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:12,fontWeight:600,cursor:"pointer",color:T.text,whiteSpace:"nowrap"}}>
                        📷 {newClinicLogo?"Change":"Upload"}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                          const file=e.target.files[0]; if(!file) return;
                          if(file.size>500000){ showToast("Logo must be under 500KB."); return; }
                          const reader=new FileReader();
                          reader.onload=ev=>setNewClinicLogo(ev.target.result);
                          reader.readAsDataURL(file);
                        }}/>
                      </label>
                    </div>
                  </div>
                  <button onClick={handleCreateClinic} disabled={creatingClinic}
                    style={{padding:"10px 20px",background:T.primary,color:"#fff",border:"none",borderRadius:9,fontWeight:700,fontSize:13,cursor:creatingClinic?"not-allowed":"pointer",whiteSpace:"nowrap"}}>
                    {creatingClinic?"Creating…":"+ Add Clinic"}
                  </button>
                </div>
              </Card>

              {clinics.length===0?(
                <Card style={{textAlign:"center",padding:"40px"}}>
                  <div style={{fontSize:40,marginBottom:10}}>🏥</div>
                  <div style={{fontWeight:700,color:T.text}}>No clinics yet</div>
                  <div style={{color:T.muted,fontSize:13,marginTop:4}}>Add one above — doctors and patients can then be scoped to it.</div>
                </Card>
              ):(
                <div style={{display:"grid",gap:10}}>
                  {clinics.map(c=>{
                    const clinicDoctors = doctors.filter(d=>d.clinicId===c.id).length;
                    return (
                      <Card key={c.id} style={{padding:"16px 20px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            {c.logo ? (
                              <img src={c.logo} alt={c.name} style={{width:44,height:44,borderRadius:10,objectFit:"cover",border:`1.5px solid ${T.border}`}} onError={e=>{e.target.style.display="none";}}/>
                            ) : (
                              <div style={{width:44,height:44,borderRadius:10,background:T.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🏥</div>
                            )}
                            <div>
                              <div style={{fontWeight:800,fontSize:15,color:T.text}}>{c.name}</div>
                              {c.address&&<div style={{fontSize:12,color:T.muted}}>📍 {c.address}</div>}
                              {c.phone&&<div style={{fontSize:12,color:T.muted}}>📞 {c.phone}</div>}
                              <div style={{fontSize:11,color:T.primary,fontWeight:600,marginTop:4}}>{clinicDoctors} doctor(s) assigned · /clinic/{c.slug}</div>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>openEditClinic(c)}
                              style={{padding:"8px 16px",background:T.white,color:T.text,border:`1.5px solid ${T.border}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                              ✏️ Edit
                            </button>
                            <button onClick={()=>copyClinicLink(c)}
                              style={{padding:"8px 16px",background:T.primaryLight,color:T.primary,border:`1.5px solid ${T.primary}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                              🔗 Copy Patient Signup Link
                            </button>
                            <button onClick={()=>handleDeleteClinic(c)}
                              style={{padding:"8px 16px",background:"#fef2f2",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {editingClinic && (
                <div onClick={()=>setEditingClinic(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                  <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:28,maxWidth:480,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
                    <div style={{fontWeight:800,fontSize:16,color:T.text,marginBottom:18}}>Edit Clinic</div>

                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Clinic Name</label>
                    <input value={editingClinic.name} onChange={e=>setEditingClinic(ec=>({...ec,name:e.target.value}))}
                      style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:14}}/>

                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Address</label>
                    <input value={editingClinic.address} onChange={e=>setEditingClinic(ec=>({...ec,address:e.target.value}))}
                      style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:14}}/>

                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Phone</label>
                    <input value={editingClinic.phone} onChange={e=>setEditingClinic(ec=>({...ec,phone:e.target.value}))}
                      style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:14}}/>

                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",marginBottom:6}}>Logo</label>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                      {editingClinic.logo ? (
                        <img src={editingClinic.logo} alt="Logo preview" style={{width:56,height:56,borderRadius:12,objectFit:"cover",border:`1.5px solid ${T.border}`}} onError={e=>{e.target.style.display="none";}}/>
                      ) : (
                        <div style={{width:56,height:56,borderRadius:12,background:T.bg,border:`1.5px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏥</div>
                      )}
                      <label style={{padding:"9px 16px",background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",color:T.text}}>
                        📷 {editingClinic.logo?"Change Logo":"Upload Logo"}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                          const file=e.target.files[0]; if(!file) return;
                          if(file.size>500000){ showToast("Logo must be under 500KB."); return; }
                          const reader=new FileReader();
                          reader.onload=ev=>setEditingClinic(ec=>({...ec,logo:ev.target.result}));
                          reader.readAsDataURL(file);
                        }}/>
                      </label>
                      {editingClinic.logo && (
                        <button onClick={()=>setEditingClinic(ec=>({...ec,logo:""}))}
                          style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#EF4444",borderRadius:7,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                          Remove
                        </button>
                      )}
                    </div>

                    <div style={{display:"flex",gap:10}}>
                      <button onClick={()=>setEditingClinic(null)}
                        style={{flex:1,padding:"11px",background:"#fff",border:`1.5px solid ${T.border}`,borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer",color:T.muted}}>
                        Cancel
                      </button>
                      <button onClick={handleSaveClinicEdit} disabled={savingClinicEdit}
                        style={{flex:2,padding:"11px",background:T.primary,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:13,cursor:savingClinicEdit?"not-allowed":"pointer"}}>
                        {savingClinicEdit?"Saving…":"Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROMOTIONS ── */}
          {view==="promotions"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <AdminPromotionsManager/>
            </div>
          )}

          {/* ── BACKUP & RESTORE ── */}
          {view==="backup"&&(
            <div style={{animation:"fadeUp 0.4s ease-out"}}>
              <AdminBackupRestore/>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

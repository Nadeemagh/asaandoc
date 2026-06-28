// src/pages/AdminPanel.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Card, StatCard, Toast, Spinner } from "../components/UI";
import { getDoctors, getAllUsers, getAllAppointments, addDoctor, deleteDoctor, updateUserPhone } from "../firebase/services";
import { logoutUser } from "../firebase/services";

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

const formatDate = (d) => {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
      year: "numeric", month: "short", day: "numeric"
    });
  } catch { return d; }
};

export default function AdminPanel() {
  const [view, setView] = useState("dashboard");
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchPatient, setSearchPatient] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, usrs, appts] = await Promise.all([
        getDoctors(),
        getAllUsers(),
        getAllAppointments(),
      ]);
      setDoctors(Array.isArray(docs) ? docs : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setAppointments(Array.isArray(appts) ? appts : []);
    } catch (e) {
      console.error("Admin load error:", e);
      showToast("Failed to load data.", "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const patients = users.filter(u => u.role === "patient");
  const totalRevenue = appointments
    .filter(a => a.status === "completed")
    .reduce((s, a) => s + Number(a.clinicFee || 0), 0);

  const filteredAppointments = appointments.filter(a => {
    const docMatch = filterDoctor === "All" || a.doctorId === filterDoctor;
    const statusMatch = filterStatus === "All" || a.status === filterStatus;
    return docMatch && statusMatch;
  });

  const filteredPatients = patients.filter(p =>
    !searchPatient ||
    p.name?.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchPatient.toLowerCase()) ||
    (p.phone && p.phone.includes(searchPatient))
  );

  const handleDeleteDoctor = async (doctorId, doctorName) => {
    if (!window.confirm(`Delete ${doctorName}? This cannot be undone.`)) return;
    try {
      await deleteDoctor(doctorId);
      setDoctors(prev => prev.filter(d => d.id !== doctorId));
      showToast(`${doctorName} deleted.`);
    } catch {
      showToast("Failed to delete.", "error");
    }
  };

  const handleUpdatePhone = async (p) => {
    const phone = window.prompt(`Enter phone for ${p.name}:`);
    if (!phone) return;
    try {
      await updateUserPhone(p.uid || p.id, phone);
      setUsers(prev => prev.map(u => (u.id === p.id || u.uid === p.uid) ? {...u, phone} : u));
      showToast("Phone updated! ✅");
    } catch {
      showToast("Failed to update phone.", "error");
    }
  };

  const nav = [
    ["dashboard", "📊", "Dashboard"],
    ["doctors",   "🏥", "Doctors"],
    ["patients",  "👥", "Patients"],
    ["appointments", "📋", "Appointments"],
    ["analytics", "📈", "Analytics"],
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:T.bg, fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <Spinner />
        <div style={{ color:T.muted, fontSize:14, marginTop:12 }}>Loading admin data...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"Inter,system-ui,sans-serif", background:T.bg }}>

      {/* SIDEBAR */}
      <div style={{ width:sidebarOpen?230:64, background:"linear-gradient(180deg,#1a2e3b,#0a1929)",
        display:"flex", flexDirection:"column", flexShrink:0, transition:"width 0.25s",
        overflow:"hidden", boxShadow:"4px 0 20px rgba(0,0,0,0.2)", position:"relative", zIndex:10 }}>
        <div style={{ padding:"18px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:sidebarOpen?12:0 }}>
            {sidebarOpen ? (
              <img src="/logo.png" alt="AsaanDoc" style={{ height:32, filter:"brightness(0) invert(1)" }}
                onError={e=>{e.target.style.display="none";}} />
            ) : <span style={{ fontSize:22 }}>⚙️</span>}
            {sidebarOpen && <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10 }}>Admin Panel</div>}
          </div>
          {sidebarOpen && (
            <div style={{ padding:"8px 10px", background:"rgba(255,165,0,0.15)", borderRadius:8, border:"1px solid rgba(255,165,0,0.3)" }}>
              <div style={{ color:"#FFA500", fontWeight:700, fontSize:12 }}>🔐 Admin Access</div>
              <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10 }}>Full system control</div>
            </div>
          )}
        </div>

        <div style={{ padding:"10px 8px", flex:1 }}>
          {nav.map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ width:"100%", padding:"11px 10px", borderRadius:10, border:"none", cursor:"pointer",
                marginBottom:4, textAlign:"left", display:"flex", alignItems:"center", gap:10,
                background:view===v?"rgba(255,165,0,0.2)":"transparent",
                color:view===v?"#FFA500":"rgba(255,255,255,0.55)",
                fontWeight:600, fontSize:13, whiteSpace:"nowrap" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
              {sidebarOpen && label}
            </button>
          ))}
        </div>

        <div style={{ padding:"10px 8px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={logoutUser}
            style={{ width:"100%", padding:"9px 10px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.2)",
              background:"transparent", color:"rgba(255,255,255,0.6)", fontWeight:600,
              fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <span>🚪</span>{sidebarOpen && "Sign Out"}
          </button>
        </div>

        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ position:"absolute", top:18, right:-12, width:24, height:24, borderRadius:"50%",
            background:"#FFA500", border:"2px solid #1a2e3b", color:"#fff", fontSize:12,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
          {sidebarOpen ? "‹" : "›"}
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, overflow:"auto" }}>
        <div style={{ background:T.white, padding:"14px 24px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)", position:"sticky", top:0, zIndex:9 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:T.text }}>
              {view==="dashboard"&&"Admin Dashboard"}
              {view==="doctors"&&"Manage Doctors"}
              {view==="patients"&&"All Patients"}
              {view==="appointments"&&"All Appointments"}
              {view==="analytics"&&"Analytics"}
            </div>
            <div style={{ fontSize:12, color:T.muted }}>
              {new Date().toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
          <button onClick={loadData}
            style={{ padding:"7px 14px", background:T.primaryLight, color:T.primary,
              border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            🔄 Refresh
          </button>
        </div>

        <div style={{ padding:"24px" }}>

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div>
              <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:800, color:T.text }}>Welcome, Admin 👋</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Doctors"    value={doctors.length}      icon="🏥" color={T.primary} />
                <StatCard label="Patients"   value={patients.length}     icon="👥" color={T.accent} />
                <StatCard label="Appointments" value={appointments.length} icon="📋" color="#8B5CF6" />
                <StatCard label="Completed"  value={appointments.filter(a=>a.status==="completed").length} icon="✅" color="#16a34a" />
                <StatCard label="Revenue"    value={`PKR ${totalRevenue.toLocaleString()}`} icon="💰" color="#F59E0B" />
              </div>
              <Card>
                <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>📋 Recent Appointments</h3>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:`linear-gradient(135deg,${T.primary},${T.primaryDark})` }}>
                        {["Patient","Doctor","Clinic","Date","Fee","Status"].map(h=>(
                          <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#fff", fontSize:12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0,10).map((a,i)=>(
                        <tr key={a.id} style={{ background:i%2===0?T.bg:T.white }}>
                          <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:600 }}>{a.patientName||"—"}</td>
                          <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>{a.doctorName||"—"}</td>
                          <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{a.clinicName||"—"}</td>
                          <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{formatDate(a.date)}</td>
                          <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:700, color:T.primary }}>
                            {a.clinicFee>0?`PKR ${Number(a.clinicFee).toLocaleString()}`:"—"}
                          </td>
                          <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}><Badge status={a.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* DOCTORS */}
          {view === "doctors" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>All Doctors ({doctors.length})</h2>
                <button onClick={() => setShowAddDoctor(true)}
                  style={{ padding:"10px 20px", background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
                    color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  + Add New Doctor
                </button>
              </div>
              <div style={{ display:"grid", gap:12 }}>
                {doctors.map(doc => {
                  const docAppts = appointments.filter(a => a.doctorId === doc.id);
                  const docRevenue = docAppts.filter(a=>a.status==="completed").reduce((s,a)=>s+Number(a.clinicFee||0),0);
                  const isSelected = selectedDoctor?.id === doc.id;
                  return (
                    <Card key={doc.id} style={{ padding:"20px" }}>
                      <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                        {doc.photo ? (
                          <img src={doc.photo} alt={doc.name} style={{ width:56,height:56,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.border}`,flexShrink:0 }} />
                        ) : (
                          <div style={{ width:56,height:56,borderRadius:"50%",background:doc.color||T.primary,
                            display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0 }}>
                            {doc.avatar||"DR"}
                          </div>
                        )}
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                            <div>
                              <div style={{ fontWeight:800, fontSize:16, color:T.text }}>{doc.name}</div>
                              <div style={{ fontSize:13, color:T.primary, fontWeight:600 }}>{doc.specialty}</div>
                              <div style={{ fontSize:12, color:T.muted }}>⏳ {doc.exp} years · {doc.clinics?.length||0} clinics</div>
                            </div>
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={()=>setSelectedDoctor(isSelected?null:doc)}
                                style={{ padding:"7px 14px", background:T.primaryLight, color:T.primary,
                                  border:`1.5px solid ${T.primary}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                                {isSelected?"Hide":"View Profile"}
                              </button>
                              <button onClick={()=>handleDeleteDoctor(doc.id, doc.name)}
                                style={{ padding:"7px 14px", background:"#fef2f2", color:"#EF4444",
                                  border:"1.5px solid #EF4444", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:12, marginTop:10, flexWrap:"wrap" }}>
                            <div style={{ padding:"8px 14px", background:T.bg, borderRadius:8, textAlign:"center" }}>
                              <div style={{ fontSize:18, fontWeight:800, color:T.primary }}>{docAppts.length}</div>
                              <div style={{ fontSize:11, color:T.muted }}>Appointments</div>
                            </div>
                            <div style={{ padding:"8px 14px", background:T.bg, borderRadius:8, textAlign:"center" }}>
                              <div style={{ fontSize:14, fontWeight:800, color:"#16a34a" }}>PKR {docRevenue.toLocaleString()}</div>
                              <div style={{ fontSize:11, color:T.muted }}>Revenue</div>
                            </div>
                          </div>

                          {isSelected && (
                            <div style={{ marginTop:16, padding:16, background:T.bg, borderRadius:12 }}>
                              {doc.qualifications && (
                                <div style={{ marginBottom:12 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:6 }}>🎓 Qualifications</div>
                                  {doc.qualifications.split("\n").filter(q=>q.trim()).map((q,i)=>(
                                    <div key={i} style={{ fontSize:12, color:T.muted }}>• {q}</div>
                                  ))}
                                </div>
                              )}
                              {doc.services && (
                                <div style={{ marginBottom:12 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:6 }}>🩺 Services</div>
                                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                    {doc.services.split("\n").filter(s=>s.trim()).map((s,i)=>(
                                      <span key={i} style={{ padding:"3px 10px", background:T.primaryLight, color:T.primary, borderRadius:20, fontSize:11, fontWeight:600 }}>{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {doc.clinics?.map((c,i)=>(
                                <div key={i} style={{ padding:"10px 12px", background:T.white, borderRadius:8, marginBottom:8, borderLeft:`3px solid ${c.isOnline?"#16a34a":T.primary}` }}>
                                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                                    <div style={{ fontWeight:600, fontSize:13, color:T.text }}>{c.isOnline?"💻":"🏥"} {c.name}</div>
                                    <div style={{ fontWeight:700, color:T.primary }}>PKR {Number(c.fee).toLocaleString()}</div>
                                  </div>
                                  {!c.isOnline && <div style={{ fontSize:11, color:T.muted }}>📍 {c.address}</div>}
                                  <div style={{ fontSize:11, color:T.muted }}>
                                    📅 {Array.isArray(c.days)?(c.days.length===7?"Every Day":c.days.join(", ")):c.days}
                                    {c.startTime&&` · 🕐 ${formatTime(c.startTime)} – ${formatTime(c.endTime)}`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              {showAddDoctor && (
                <AddDoctorModal
                  onClose={() => setShowAddDoctor(false)}
                  onSave={async (data) => {
                    try {
                      await addDoctor(data);
                      await loadData();
                      setShowAddDoctor(false);
                      showToast("Doctor added! ✅");
                    } catch { showToast("Failed to add.", "error"); }
                  }}
                />
              )}
            </div>
          )}

          {/* PATIENTS */}
          {view === "patients" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>All Patients ({filteredPatients.length})</h2>
                <input value={searchPatient} onChange={e=>setSearchPatient(e.target.value)}
                  placeholder="🔍 Search name, email or phone..."
                  style={{ padding:"10px 16px", borderRadius:10, border:`1.5px solid ${T.border}`,
                    fontSize:13, outline:"none", width:280, fontFamily:"inherit" }} />
              </div>
              <Card>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:`linear-gradient(135deg,${T.primary},${T.primaryDark})` }}>
                        {["#","Name","Email","Phone","Appointments","Last Visit","Action"].map(h=>(
                          <th key={h} style={{ padding:"11px 12px", textAlign:"left", color:"#fff", fontSize:12, whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p,i)=>{
                        const pAppts = appointments.filter(a=>a.patientUid===p.uid||a.patientEmail===p.email);
                        const last = pAppts.sort((a,b)=>b.date?.localeCompare(a.date))[0];
                        return (
                          <tr key={p.id} style={{ background:i%2===0?T.bg:T.white }}>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{i+1}</td>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:700 }}>{p.name||"—"}</td>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{p.email||"—"}</td>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}` }}>
                              {p.phone
                                ? <span style={{ fontWeight:600, color:T.primary }}>📱 {p.phone}</span>
                                : <span style={{ color:"#EF4444", fontSize:11 }}>Not provided</span>}
                            </td>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:700, color:T.primary, textAlign:"center" }}>{pAppts.length}</td>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{last?formatDate(last.date):"—"}</td>
                            <td style={{ padding:"11px 12px", borderBottom:`1px solid ${T.border}` }}>
                              <button onClick={()=>handleUpdatePhone(p)}
                                style={{ padding:"5px 12px", background:T.primaryLight, color:T.primary,
                                  border:`1px solid ${T.primary}`, borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                                {p.phone?"Edit":"Add"} Phone
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* APPOINTMENTS */}
          {view === "appointments" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>All Appointments ({filteredAppointments.length})</h2>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <select value={filterDoctor} onChange={e=>setFilterDoctor(e.target.value)}
                    style={{ padding:"8px 12px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:13, color:T.text, outline:"none", fontFamily:"inherit" }}>
                    <option value="All">All Doctors</option>
                    {doctors.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                    style={{ padding:"8px 12px", borderRadius:8, border:`1.5px solid ${T.border}`, fontSize:13, color:T.text, outline:"none", fontFamily:"inherit" }}>
                    {["All","pending","confirmed","completed","cancelled"].map(s=>(
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Card>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ background:`linear-gradient(135deg,${T.primary},${T.primaryDark})` }}>
                        {["Patient","Email","Phone","Doctor","Clinic","Date","Time","Fee","Status"].map(h=>(
                          <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#fff", fontSize:12, whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.map((a,i)=>{
                        const patient = users.find(u=>u.uid===a.patientUid||u.email===a.patientEmail);
                        return (
                          <tr key={a.id} style={{ background:i%2===0?T.bg:T.white }}>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:600 }}>{a.patientName||"—"}</td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{a.patientEmail||"—"}</td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>
                              {patient?.phone
                                ? <span style={{ fontWeight:600, color:T.primary }}>📱 {patient.phone}</span>
                                : <span style={{ color:T.muted }}>—</span>}
                            </td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>{a.doctorName||"—"}</td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{a.clinicName||"—"}</td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{formatDate(a.date)}</td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{formatTime(a.slot)}</td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:700, color:T.primary }}>
                              {a.clinicFee>0?`PKR ${Number(a.clinicFee).toLocaleString()}`:"—"}
                            </td>
                            <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}><Badge status={a.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ANALYTICS */}
          {view === "analytics" && (
            <div>
              <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800, color:T.text }}>Platform Analytics</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Doctors"    value={doctors.length} icon="🏥" color={T.primary} />
                <StatCard label="Patients"   value={patients.length} icon="👥" color={T.accent} />
                <StatCard label="Total Appts" value={appointments.length} icon="📋" color="#8B5CF6" />
                <StatCard label="Completed"  value={appointments.filter(a=>a.status==="completed").length} icon="✅" color="#16a34a" />
                <StatCard label="Revenue"    value={`PKR ${totalRevenue.toLocaleString()}`} icon="💰" color="#F59E0B" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>💰 Revenue by Doctor</h3>
                  {doctors.map((doc,i)=>{
                    const rev = appointments.filter(a=>a.doctorId===doc.id&&a.status==="completed").reduce((s,a)=>s+Number(a.clinicFee||0),0);
                    const pct = totalRevenue>0?Math.round(rev/totalRevenue*100):0;
                    return (
                      <div key={i} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{doc.name?.split(" ").slice(0,2).join(" ")}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:T.primary }}>PKR {rev.toLocaleString()}</span>
                        </div>
                        <div style={{ height:7, background:T.bg, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:10, background:`linear-gradient(90deg,${T.primary},${T.accent})`, width:`${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>📊 Status Breakdown</h3>
                  {[["confirmed",T.accent,"Confirmed"],["pending","#F59E0B","Pending"],["completed","#16a34a","Completed"],["cancelled","#EF4444","Cancelled"]].map(([status,color,label])=>{
                    const count=appointments.filter(a=>a.status===status).length;
                    const pct=appointments.length?Math.round(count/appointments.length*100):0;
                    return (
                      <div key={status} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{label}</span>
                          <span style={{ fontSize:13, fontWeight:700, color }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:T.bg, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:10, background:color, width:`${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            </div>
          )}

        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}
    </div>
  );
}

// ─── ADD DOCTOR MODAL ─────────────────────────────────────────────
function AddDoctorModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name:"", specialty:"", exp:"", color:"#218EB6",
    qualifications:"", services:"",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.specialty) { alert("Name and specialty required!"); return; }
    setSaving(true);
    const initials = form.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    await onSave({ ...form, exp:Number(form.exp)||0, avatar:initials, clinics:[] });
    setSaving(false);
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#fff", borderRadius:16, padding:28, maxWidth:500, width:"100%",
          maxHeight:"85vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:800, color:T.text }}>+ Add New Doctor</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:T.muted }}>×</button>
        </div>
        {[["Full Name","name","Dr. Ahmed Ali"],["Specialty","specialty","Cardiologist"],["Years of Experience","exp","10"]].map(([label,key,ph])=>(
          <div key={key} style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</label>
            <input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
              style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`, fontSize:14, color:T.text, width:"100%", outline:"none", fontFamily:"inherit" }} />
          </div>
        ))}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Profile Color</label>
          <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))}
            style={{ width:50, height:36, borderRadius:8, border:`1.5px solid ${T.border}`, cursor:"pointer" }} />
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Qualifications</label>
          <textarea value={form.qualifications} onChange={e=>setForm(f=>({...f,qualifications:e.target.value}))}
            placeholder="MBBS, FCPS..." rows={3}
            style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`, fontSize:14, color:T.text, width:"100%", outline:"none", fontFamily:"inherit", resize:"vertical" }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Services (one per line)</label>
          <textarea value={form.services} onChange={e=>setForm(f=>({...f,services:e.target.value}))}
            placeholder="Heart Disease Treatment&#10;ECG" rows={3}
            style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`, fontSize:14, color:T.text, width:"100%", outline:"none", fontFamily:"inherit", resize:"vertical" }} />
        </div>
        <div style={{ padding:12, background:T.bg, borderRadius:8, marginBottom:16, fontSize:12, color:T.muted }}>
          ℹ️ Doctor can set up clinics & schedule from their own dashboard after login.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"12px", background:T.white, border:`2px solid ${T.border}`, borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", color:T.muted }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:2, padding:"12px", background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
              color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
            {saving?"Adding...":"✅ Add Doctor"}
          </button>
        </div>
      </div>
    </div>
  );
}

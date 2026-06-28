// src/pages/DoctorDashboard.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Avatar, Card, StatCard, Toast, Spinner } from "../components/UI";
import { getAppointmentsByDoctor, updateAppointmentStatus, getDoctors } from "../firebase/services";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/services";

const today = new Date();
const fmtDate = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [view, setView]                 = useState("dashboard");
  const [doctor, setDoctor]             = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [selectedDate, setSelectedDate] = useState(fmtDate(today));
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast]               = useState(null);
  const [sidebarOpen, setSidebarOpen]   = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const allDoctors = await getDoctors();
      const myDoc = allDoctors.find(d =>
        d.id === profile?.doctorId ||
        d.name?.toLowerCase() === profile?.name?.toLowerCase()
      ) || allDoctors[0];
      setDoctor(myDoc);
      if (myDoc) {
        const appts = await getAppointmentsByDoctor(myDoc.id);
        setAppointments(appts);
      }
    } catch (e) {
      console.error("Load error:", e);
      showToast("Failed to load data.", "error");
    }
    setLoadingData(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      const msgs = { confirmed:"Appointment confirmed ✓", completed:"Marked as completed ✓", cancelled:"Appointment declined." };
      showToast(msgs[status] || "Updated.");
    } catch {
      showToast("Failed to update. Try again.", "error");
    }
  };

  const todayStr    = fmtDate(today);
  const todayAppts  = appointments.filter(a => a.date === todayStr);
  const upcoming    = appointments.filter(a => a.date > todayStr && a.status !== "cancelled");
  const pending     = appointments.filter(a => a.status === "pending");
  const completed   = appointments.filter(a => a.status === "completed");
  const dayAppts    = appointments.filter(a => a.date === selectedDate);
  const filteredAll = filterStatus === "All" ? appointments : appointments.filter(a => a.status === filterStatus);

  const getPatientDisplay = (a) => a.patientName || a.patientEmail?.split("@")[0] || "Unknown Patient";

  const nav = [
    ["dashboard","📊","Dashboard"],
    ["schedule","📅","Schedule"],
    ["patients","👥","Appointments"],
    ["stats","📈","Analytics"],
  ];

  if (loadingData) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:T.bg, fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <Spinner />
        <div style={{ color:T.muted, fontSize:14, marginTop:12 }}>Loading your dashboard...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"Inter,system-ui,sans-serif", background:T.bg }}>

      {/* SIDEBAR */}
      <div style={{ width:sidebarOpen?230:64, background:`linear-gradient(180deg,${T.primaryDark} 0%,#0a3d52 100%)`,
        display:"flex", flexDirection:"column", flexShrink:0, transition:"width 0.25s ease", overflow:"hidden",
        boxShadow:"4px 0 20px rgba(0,0,0,0.15)", position:"relative", zIndex:10 }}>

        <div style={{ padding:"18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:sidebarOpen?16:0 }}>
            {sidebarOpen ? (
              <img src="/logo.png" alt="AsaanDoc" style={{ height:32, filter:"brightness(0) invert(1)" }}
                onError={e => { e.target.style.display="none"; }} />
            ) : (
              <span style={{ fontSize:24, flexShrink:0 }}>🏥</span>
            )}
            {sidebarOpen && <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, marginTop:2 }}>Doctor Portal</div>}
          </div>
          {sidebarOpen && doctor && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 8px",
              background:"rgba(255,255,255,0.07)", borderRadius:10 }}>
              <Avatar initials={doctor.avatar||"DR"} color="rgba(255,255,255,0.15)" size={36} />
              <div style={{ minWidth:0 }}>
                <div style={{ color:"#fff", fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {profile?.name || doctor.name}
                </div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10 }}>{doctor.specialty}</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:"10px 8px", flex:1 }}>
          {nav.map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ width:"100%", padding:"11px 10px", borderRadius:10, border:"none", cursor:"pointer",
                marginBottom:4, textAlign:"left", display:"flex", alignItems:"center", gap:10,
                background:view===v?"rgba(255,255,255,0.15)":"transparent",
                color:view===v?"#fff":"rgba(255,255,255,0.55)",
                fontWeight:600, fontSize:13, transition:"all 0.15s", whiteSpace:"nowrap" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
              {sidebarOpen && label}
            </button>
          ))}
        </div>

        <div style={{ padding:"10px 8px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          {sidebarOpen && doctor && doctor.clinics && (
            <div style={{ padding:"10px 12px", background:"rgba(255,255,255,0.07)", borderRadius:10, marginBottom:8 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginBottom:3 }}>Fees from</div>
              <div style={{ fontSize:17, fontWeight:800, color:"#fff" }}>
                PKR {Math.min(...doctor.clinics.map(c => Number(c.fee)||0)).toLocaleString()}
              </div>
            </div>
          )}
          <button onClick={logoutUser}
            style={{ width:"100%", padding:"9px 10px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.2)",
              background:"transparent", color:"rgba(255,255,255,0.6)", fontWeight:600,
              fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <span>🚪</span>{sidebarOpen && "Sign Out"}
          </button>
        </div>

        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ position:"absolute", top:18, right:-12, width:24, height:24, borderRadius:"50%",
            background:T.primary, border:`2px solid ${T.primaryDark}`, color:"#fff", fontSize:12,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
          {sidebarOpen?"‹":"›"}
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, overflow:"auto" }}>

        {/* Top bar */}
        <div style={{ background:T.white, padding:"14px 24px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)", position:"sticky", top:0, zIndex:9 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:T.text }}>
              {view==="dashboard"&&"Dashboard"}{view==="schedule"&&"My Schedule"}
              {view==="patients"&&"All Appointments"}{view==="stats"&&"Analytics"}
            </div>
            <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
              {new Date().toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {pending.length > 0 && (
              <div style={{ padding:"5px 12px", background:"#fffbeb", color:"#F59E0B",
                borderRadius:20, fontSize:12, fontWeight:700, border:"1.5px solid #F59E0B" }}>
                🔔 {pending.length} Pending
              </div>
            )}
            <button onClick={loadData}
              style={{ padding:"7px 14px", background:T.primaryLight, color:T.primary,
                border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={{ padding:"24px" }}>

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div>
              <div style={{ marginBottom:22 }}>
                <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800, color:T.text }}>
                  Good {new Date().getHours()<12?"Morning":new Date().getHours()<17?"Afternoon":"Evening"},{" "}
                  {profile?.name?.split(" ")[1] || profile?.name || "Doctor"} 👋
                </h2>
                <p style={{ margin:0, color:T.muted, fontSize:13 }}>Here's what's happening with your appointments today.</p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Today"     value={todayAppts.length} icon="📅" color={T.primary}  sub="appointments" />
                <StatCard label="Upcoming"  value={upcoming.length}   icon="⏳" color={T.accent}   sub="confirmed" />
                <StatCard label="Pending"   value={pending.length}    icon="🔔" color={T.warn}     sub="need action" />
                <StatCard label="Completed" value={completed.length}  icon="✅" color="#8B5CF6"    sub="all time" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:T.text }}>📅 Today's Schedule</h3>
                    <span style={{ fontSize:12, color:T.muted }}>{todayAppts.length} appts</span>
                  </div>
                  {todayAppts.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:T.muted }}>
                      <div style={{ fontSize:36, marginBottom:8 }}>🌟</div>
                      <div style={{ fontSize:13 }}>No appointments today</div>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gap:8 }}>
                      {todayAppts.sort((a,b)=>a.slot?.localeCompare(b.slot)).map(a => (
                        <div key={a.id} style={{ padding:"12px 13px", borderRadius:10, background:T.bg,
                          borderLeft:`4px solid ${a.status==="confirmed"?T.accent:a.status==="pending"?T.warn:T.border}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{getPatientDisplay(a)}</div>
                              <div style={{ fontSize:11, color:T.muted }}>📧 {a.patientEmail||"—"}</div>
                              <div style={{ fontSize:11, color:T.muted }}>🕐 {formatTime(a.slot)} · {a.clinicName||a.type}</div>
                              {a.reason && <div style={{ fontSize:11, color:T.muted }}>📝 {a.reason}</div>}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                              <Badge status={a.status} />
                              {a.status==="pending" && (
                                <div style={{ display:"flex", gap:4 }}>
                                  <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                                    style={{ padding:"3px 8px", background:T.accent, color:"#fff", border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>✓</button>
                                  <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                                    style={{ padding:"3px 8px", background:"#fef2f2", color:"#EF4444", border:"1px solid #EF4444", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>✗</button>
                                </div>
                              )}
                              {a.status==="confirmed" && (
                                <button onClick={()=>handleUpdateStatus(a.id,"completed")}
                                  style={{ padding:"3px 8px", background:T.primaryLight, color:T.primary, border:`1px solid ${T.primary}`, borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Done</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:T.text }}>🔔 Pending Approvals</h3>
                    <span style={{ fontSize:12, color:T.muted }}>{pending.length} requests</span>
                  </div>
                  {pending.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"28px 0", color:T.muted }}>
                      <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
                      <div style={{ fontSize:13 }}>All caught up!</div>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gap:8, maxHeight:340, overflowY:"auto" }}>
                      {pending.map(a => (
                        <div key={a.id} style={{ padding:"12px 13px", borderRadius:10, background:"#fffbeb", border:"1.5px solid #F59E0B" }}>
                          <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{getPatientDisplay(a)}</div>
                          <div style={{ fontSize:11, color:T.muted, marginBottom:2 }}>📧 {a.patientEmail||"—"}</div>
                          <div style={{ fontSize:11, color:T.muted, marginBottom:2 }}>
                            📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric"})} at {formatTime(a.slot)}
                          </div>
                          {a.clinicName && <div style={{ fontSize:11, color:T.muted, marginBottom:2 }}>🏥 {a.clinicName}</div>}
                          {a.reason && <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>📝 {a.reason}</div>}
                          <div style={{ display:"flex", gap:6, marginTop:8 }}>
                            <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                              style={{ flex:1, padding:"7px", background:T.accent, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>✓ Accept</button>
                            <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                              style={{ flex:1, padding:"7px", background:"#fef2f2", color:"#EF4444", border:"1.5px solid #EF4444", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>✗ Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {upcoming.length > 0 && (
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>⏳ Upcoming Confirmed ({upcoming.length})</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
                    {upcoming.slice(0,6).map(a => (
                      <div key={a.id} style={{ padding:"12px 14px", borderRadius:10, background:T.bg, border:`1.5px solid ${T.border}` }}>
                        <div style={{ fontWeight:700, fontSize:13, color:T.text, marginBottom:4 }}>{getPatientDisplay(a)}</div>
                        <div style={{ fontSize:12, color:T.muted }}>📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric"})}</div>
                        <div style={{ fontSize:12, color:T.muted }}>🕐 {formatTime(a.slot)}</div>
                        {a.clinicName && <div style={{ fontSize:12, color:T.muted }}>🏥 {a.clinicName}</div>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* SCHEDULE */}
          {view === "schedule" && (
            <div>
              <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800, color:T.text }}>Weekly Schedule</h2>
              <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
                {Array.from({length:14},(_,i)=>addDays(today,i-1)).map(d => {
                  const df = fmtDate(d);
                  const count = appointments.filter(a => a.date===df && a.status!=="cancelled").length;
                  const isToday = df === todayStr;
                  return (
                    <button key={df} onClick={() => setSelectedDate(df)}
                      style={{ padding:"10px 12px", borderRadius:12, flexShrink:0, minWidth:64,
                        border:`2px solid ${selectedDate===df?T.primary:isToday?T.primary:"#dde8ed"}`,
                        background:selectedDate===df?T.primaryLight:T.white, cursor:"pointer", textAlign:"center", position:"relative" }}>
                      {isToday && <div style={{ position:"absolute", top:4, right:6, width:6, height:6, borderRadius:"50%", background:T.primary }} />}
                      <div style={{ fontSize:11, fontWeight:600, color:selectedDate===df?T.primary:T.muted }}>{DAYS[d.getDay()]}</div>
                      <div style={{ fontSize:17, fontWeight:800, color:selectedDate===df?T.primary:T.text }}>{d.getDate()}</div>
                      <div style={{ fontSize:10, color:T.muted }}>{count>0?`${count} appt${count>1?"s":""}`:""}</div>
                    </button>
                  );
                })}
              </div>
              <Card>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:T.text }}>
                    {new Date(selectedDate+"T00:00:00").toLocaleDateString("en-PK",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
                  </h3>
                  <div style={{ fontSize:12, color:T.muted }}>{dayAppts.filter(a=>a.status!=="cancelled").length} appointments</div>
                </div>
                {dayAppts.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"32px 0", color:T.muted }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>📅</div>
                    <div>No appointments on this day</div>
                  </div>
                ) : (
                  <div style={{ display:"grid", gap:8 }}>
                    {dayAppts.sort((a,b)=>a.slot?.localeCompare(b.slot)).map(a => (
                      <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                        borderRadius:10, border:`1.5px solid ${a.status!=="cancelled"?T.primary:T.border}`,
                        background:a.status!=="cancelled"?T.primaryLight:T.bg }}>
                        <div style={{ fontWeight:800, fontSize:14, color:T.primary, minWidth:70 }}>{formatTime(a.slot)}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{getPatientDisplay(a)}</div>
                          <div style={{ fontSize:11, color:T.muted }}>📧 {a.patientEmail||"—"}</div>
                          {a.clinicName && <div style={{ fontSize:11, color:T.muted }}>🏥 {a.clinicName}</div>}
                          {a.reason && <div style={{ fontSize:11, color:T.muted }}>📝 {a.reason}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                          <Badge status={a.status} />
                          {a.status==="pending" && (
                            <div style={{ display:"flex", gap:4 }}>
                              <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                                style={{ padding:"4px 10px", background:T.accent, color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Accept</button>
                              <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                                style={{ padding:"4px 10px", background:"#fef2f2", color:"#EF4444", border:"1px solid #EF4444", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Decline</button>
                            </div>
                          )}
                          {a.status==="confirmed" && (
                            <button onClick={()=>handleUpdateStatus(a.id,"completed")}
                              style={{ padding:"4px 10px", background:T.primaryLight, color:T.primary, border:`1px solid ${T.primary}`, borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Mark Done</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ALL APPOINTMENTS */}
          {view === "patients" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:12 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>All Appointments ({filteredAll.length})</h2>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["All","pending","confirmed","completed","cancelled"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ padding:"6px 13px", borderRadius:20, border:`1.5px solid ${filterStatus===s?T.primary:T.border}`,
                        background:filterStatus===s?T.primary:T.white, color:filterStatus===s?"#fff":T.muted,
                        fontSize:12, fontWeight:600, cursor:"pointer", textTransform:"capitalize" }}>
                      {s} {s!=="All"&&`(${appointments.filter(a=>a.status===s).length})`}
                    </button>
                  ))}
                </div>
              </div>
              {filteredAll.length === 0 ? (
                <Card style={{ textAlign:"center", padding:"48px 20px" }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                  <div style={{ fontWeight:700, color:T.text }}>No appointments found</div>
                </Card>
              ) : (
                <div style={{ display:"grid", gap:10 }}>
                  {filteredAll.sort((a,b)=>b.date?.localeCompare(a.date)).map(a => (
                    <Card key={a.id} style={{ padding:"16px 20px" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:14, flexWrap:"wrap" }}>
                        <div style={{ width:46, height:46, borderRadius:"50%", background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
                          display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:16, flexShrink:0 }}>
                          {getPatientDisplay(a).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:200 }}>
                          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:6 }}>
                            <span style={{ fontWeight:800, fontSize:16, color:T.text }}>{getPatientDisplay(a)}</span>
                            <Badge status={a.status} />
                          </div>
                          {a.patientEmail && <div style={{ fontSize:12, color:T.primary, fontWeight:600, marginBottom:4 }}>📧 {a.patientEmail}</div>}
                          {a.clinicName && <div style={{ fontSize:12, color:T.text, fontWeight:600, marginBottom:4 }}>🏥 {a.clinicName}</div>}
                          {a.clinicAddress && <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>📍 {a.clinicAddress}</div>}
                          <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:4 }}>
                            <span style={{ fontSize:12, color:T.muted }}>📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}</span>
                            <span style={{ fontSize:12, color:T.muted }}>🕐 {formatTime(a.slot)}</span>
                            <span style={{ fontSize:12, color:T.muted }}>{a.type==="Online"?"💻":"🏥"} {a.type}</span>
                            {a.clinicFee > 0 && <span style={{ fontSize:12, fontWeight:700, color:T.primary }}>PKR {Number(a.clinicFee).toLocaleString()}</span>}
                          </div>
                          {a.reason && <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>📝 {a.reason}</div>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start" }}>
                          {a.status==="pending" && (
                            <>
                              <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                                style={{ padding:"8px 16px", background:T.accent, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>✓ Accept</button>
                              <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                                style={{ padding:"8px 14px", background:"#fef2f2", color:"#EF4444", border:"1.5px solid #EF4444", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>✗ Decline</button>
                            </>
                          )}
                          {a.status==="confirmed" && (
                            <button onClick={()=>handleUpdateStatus(a.id,"completed")}
                              style={{ padding:"8px 16px", background:T.primaryLight, color:T.primary, border:`1.5px solid ${T.primary}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>✅ Mark Done</button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS */}
          {view === "stats" && (
            <div>
              <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800, color:T.text }}>Analytics Overview</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Total"     value={appointments.length} icon="📋" color={T.primary} />
                <StatCard label="Confirmed" value={appointments.filter(a=>a.status==="confirmed").length} icon="✅" color={T.accent} />
                <StatCard label="Completed" value={completed.length} icon="🎯" color="#8B5CF6" />
                <StatCard label="Cancelled" value={appointments.filter(a=>a.status==="cancelled").length} icon="❌" color="#EF4444" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>Status Breakdown</h3>
                  {[["confirmed",T.accent,"Confirmed"],["pending",T.warn,"Pending"],["completed","#8B5CF6","Completed"],["cancelled","#EF4444","Cancelled"]].map(([status,color,label]) => {
                    const count = appointments.filter(a=>a.status===status).length;
                    const pct = appointments.length ? Math.round(count/appointments.length*100) : 0;
                    return (
                      <div key={status} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{label}</span>
                          <span style={{ fontSize:13, fontWeight:700, color }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:T.bg, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:10, background:color, width:`${pct}%`, transition:"width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>Consultation Types</h3>
                  {["Online","In Person"].map(type => {
                    const count = appointments.filter(a=>a.type===type).length;
                    const pct = appointments.length ? Math.round(count/appointments.length*100) : 0;
                    return (
                      <div key={type} style={{ marginBottom:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{type==="Online"?"💻 Online":"🏥 In Person"}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:T.primary }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:T.bg, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:10,
                            background:type==="Online"?`linear-gradient(90deg,${T.primary},${T.accent})`:`linear-gradient(90deg,#8B5CF6,#EC4899)`,
                            width:`${pct}%`, transition:"width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
              {doctor && (
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>My Profile</h3>
                  <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
                    <Avatar initials={doctor.avatar||"DR"} color={doctor.color||T.primary} size={60} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:17, color:T.text }}>{profile?.name||doctor.name}</div>
                      <div style={{ fontSize:14, color:T.primary, fontWeight:600 }}>{doctor.specialty}</div>
                      <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>⏳ {doctor.exp} years experience</div>
                      {doctor.clinics && Array.isArray(doctor.clinics) && (
                        <div style={{ marginTop:10 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:6 }}>🏥 Clinic Locations:</div>
                          {doctor.clinics.map((c,i) => (
                            <div key={i} style={{ padding:"8px 12px", background:T.bg, borderRadius:8, marginBottom:6, borderLeft:`3px solid ${c.isOnline?"#16a34a":T.primary}` }}>
                              <div style={{ fontWeight:600, fontSize:12, color:T.text }}>{c.isOnline?"💻":"🏥"} {c.name}</div>
                              {!c.isOnline && <div style={{ fontSize:11, color:T.muted }}>📍 {c.address}</div>}
                              <div style={{ fontSize:11, color:T.muted }}>
                                📅 {Array.isArray(c.days)?(c.days.length===7?"Every Day":c.days.join(", ")):c.days}
                                {c.startTime && ` · 🕐 ${formatTime(c.startTime)} – ${formatTime(c.endTime)}`}
                              </div>
                              <div style={{ fontSize:12, fontWeight:700, color:c.isOnline?"#16a34a":T.primary }}>PKR {Number(c.fee).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

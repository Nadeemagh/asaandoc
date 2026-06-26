// src/pages/DoctorDashboard.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Avatar, Card, StatCard, Toast, Spinner, inputStyle, labelStyle } from "../components/UI";
import { getAppointmentsByDoctor, updateAppointmentStatus, getDoctors } from "../firebase/services";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/services";

const today = new Date();
const fmtDate = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function DoctorDashboard() {
  const { user, profile } = useAuth();
  const [view, setView]               = useState("dashboard");
  const [doctor, setDoctor]           = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState(fmtDate(today));
  const [filterStatus, setFilterStatus] = useState("All");
  const [toast, setToast]             = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Find this doctor's profile from doctors collection
      const allDoctors = await getDoctors();
      // Match by doctorId stored in user profile, or by name
      const myDoc = allDoctors.find(d =>
        d.id === profile?.doctorId ||
        d.name?.toLowerCase() === profile?.name?.toLowerCase()
      ) || allDoctors[0]; // fallback to first doctor for demo

      setDoctor(myDoc);

      if (myDoc) {
        const appts = await getAppointmentsByDoctor(myDoc.id);
        setAppointments(appts);
      }
    } catch (e) {
      showToast("Failed to load data. Check Firebase setup.", "error");
    }
    setLoadingData(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      const msgs = {
        confirmed: "Appointment confirmed ✓",
        completed: "Marked as completed ✓",
        cancelled: "Appointment declined.",
      };
      showToast(msgs[status] || "Updated.");
    } catch {
      showToast("Failed to update. Try again.", "error");
    }
  };

  // Derived stats
  const todayStr    = fmtDate(today);
  const todayAppts  = appointments.filter(a => a.date === todayStr);
  const upcoming    = appointments.filter(a => a.date > todayStr && a.status !== "cancelled");
  const pending     = appointments.filter(a => a.status === "pending");
  const completed   = appointments.filter(a => a.status === "completed");
  const dayAppts    = appointments.filter(a => a.date === selectedDate);
  const filteredAll = filterStatus === "All" ? appointments : appointments.filter(a => a.status === filterStatus);

  const nav = [
    ["dashboard", "📊", "Dashboard"],
    ["schedule",  "📅", "Schedule"],
    ["patients",  "👥", "Appointments"],
    ["stats",     "📈", "Analytics"],
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

      {/* ── SIDEBAR ── */}
      <div style={{
        width: sidebarOpen ? 230 : 64,
        background: `linear-gradient(180deg,${T.primaryDark} 0%,#0a3d52 100%)`,
        display:"flex", flexDirection:"column", flexShrink:0,
        transition:"width 0.25s ease", overflow:"hidden",
        boxShadow:"4px 0 20px rgba(0,0,0,0.15)", position:"relative", zIndex:10,
      }}>
        {/* Logo */}
        <div style={{ padding:"18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: sidebarOpen ? 16 : 0 }}>
            <span style={{ fontSize:24, flexShrink:0 }}>🏥</span>
            {sidebarOpen && (
              <div>
                <div style={{ color:"#fff", fontWeight:800, fontSize:15, lineHeight:1 }}>AsaanDoc</div>
                <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10 }}>Doctor Portal</div>
              </div>
            )}
          </div>
          {sidebarOpen && doctor && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 8px",
              background:"rgba(255,255,255,0.07)", borderRadius:10 }}>
              <Avatar initials={doctor.avatar || "DR"} color="rgba(255,255,255,0.15)" size={36} />
              <div style={{ minWidth:0 }}>
                <div style={{ color:"#fff", fontWeight:700, fontSize:12,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {profile?.name || doctor.name}
                </div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:10 }}>{doctor.specialty}</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <div style={{ padding:"10px 8px", flex:1 }}>
          {nav.map(([v, icon, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ width:"100%", padding:"11px 10px", borderRadius:10, border:"none",
                cursor:"pointer", marginBottom:4, textAlign:"left",
                display:"flex", alignItems:"center", gap:10,
                background: view===v ? "rgba(255,255,255,0.15)" : "transparent",
                color: view===v ? "#fff" : "rgba(255,255,255,0.55)",
                fontWeight:600, fontSize:13, transition:"all 0.15s", whiteSpace:"nowrap" }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{icon}</span>
              {sidebarOpen && label}
            </button>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ padding:"10px 8px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          {sidebarOpen && doctor && (
            <div style={{ padding:"10px 12px", background:"rgba(255,255,255,0.07)", borderRadius:10, marginBottom:8 }}>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", marginBottom:3 }}>Consultation Fee</div>
              <div style={{ fontSize:17, fontWeight:800, color:"#fff" }}>PKR {doctor.fee?.toLocaleString()}</div>
            </div>
          )}
          <button onClick={logoutUser}
            style={{ width:"100%", padding:"9px 10px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.2)",
              background:"transparent", color:"rgba(255,255,255,0.6)", fontWeight:600,
              fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
            <span>🚪</span>{sidebarOpen && "Sign Out"}
          </button>
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(o => !o)}
          style={{ position:"absolute", top:18, right:-12, width:24, height:24,
            borderRadius:"50%", background:T.primary, border:`2px solid ${T.primaryDark}`,
            color:"#fff", fontSize:12, cursor:"pointer", display:"flex",
            alignItems:"center", justifyContent:"center", fontWeight:700 }}>
          {sidebarOpen ? "‹" : "›"}
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, overflow:"auto" }}>

        {/* Top bar */}
        <div style={{ background:T.white, padding:"14px 24px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)", position:"sticky", top:0, zIndex:9 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:T.text }}>
              { view==="dashboard" && "Dashboard" }
              { view==="schedule"  && "My Schedule" }
              { view==="patients"  && "All Appointments" }
              { view==="stats"     && "Analytics" }
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

        <div style={{ padding:"24px 24px" }}>

          {/* ── DASHBOARD VIEW ── */}
          {view === "dashboard" && (
            <div>
              {/* Greeting */}
              <div style={{ marginBottom:22 }}>
                <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800, color:T.text }}>
                  Good {new Date().getHours()<12?"Morning":new Date().getHours()<17?"Afternoon":"Evening"},
                  {" "}{profile?.name?.split(" ")[1] || "Doctor"} 👋
                </h2>
                <p style={{ margin:0, color:T.muted, fontSize:13 }}>
                  Here's what's happening with your appointments today.
                </p>
              </div>

              {/* Stat cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Today"     value={todayAppts.length} icon="📅" color={T.primary}  sub="appointments" />
                <StatCard label="Upcoming"  value={upcoming.length}   icon="⏳" color={T.accent}   sub="confirmed" />
                <StatCard label="Pending"   value={pending.length}    icon="🔔" color={T.warn}     sub="need action" />
                <StatCard label="Completed" value={completed.length}  icon="✅" color="#8B5CF6"    sub="all time" />
              </div>

              {/* Today's schedule + Pending side by side */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>

                {/* Today's schedule */}
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
                        <div key={a.id} style={{ padding:"11px 13px", borderRadius:10, background:T.bg,
                          borderLeft:`4px solid ${a.status==="confirmed"?T.accent:a.status==="pending"?T.warn:T.border}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{a.patientName}</div>
                              <div style={{ fontSize:11, color:T.muted }}>🕐 {a.slot} · {a.type}</div>
                              {a.reason && <div style={{ fontSize:11, color:T.muted }}>📝 {a.reason}</div>}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                              <Badge status={a.status} />
                              {a.status==="pending" && (
                                <div style={{ display:"flex", gap:4 }}>
                                  <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                                    style={{ padding:"3px 8px", background:T.accent, color:"#fff",
                                      border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>✓</button>
                                  <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                                    style={{ padding:"3px 8px", background:T.dangerLight, color:T.danger,
                                      border:`1px solid ${T.danger}`, borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>✗</button>
                                </div>
                              )}
                              {a.status==="confirmed" && (
                                <button onClick={()=>handleUpdateStatus(a.id,"completed")}
                                  style={{ padding:"3px 8px", background:T.primaryLight, color:T.primary,
                                    border:`1px solid ${T.primary}`, borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Done</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Pending approvals */}
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
                        <div key={a.id} style={{ padding:"12px 13px", borderRadius:10,
                          background:"#fffbeb", border:"1.5px solid #F59E0B" }}>
                          <div style={{ fontWeight:700, fontSize:13, color:T.text, marginBottom:4 }}>{a.patientName}</div>
                          <div style={{ fontSize:11, color:T.muted, marginBottom:2 }}>
                            📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric"})} at {a.slot}
                          </div>
                          <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>
                            {a.type==="Online"?"💻":"🏥"} {a.type} {a.reason ? `· ${a.reason}` : ""}
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                              style={{ flex:1, padding:"7px", background:T.accent, color:"#fff",
                                border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                              ✓ Accept
                            </button>
                            <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                              style={{ flex:1, padding:"7px", background:T.dangerLight, color:T.danger,
                                border:`1.5px solid ${T.danger}`, borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                              ✗ Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Upcoming confirmed */}
              {upcoming.length > 0 && (
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>
                    ⏳ Upcoming Confirmed ({upcoming.length})
                  </h3>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10 }}>
                    {upcoming.slice(0,6).map(a => (
                      <div key={a.id} style={{ padding:"12px 14px", borderRadius:10, background:T.bg,
                        border:`1.5px solid ${T.border}` }}>
                        <div style={{ fontWeight:700, fontSize:13, color:T.text, marginBottom:4 }}>{a.patientName}</div>
                        <div style={{ fontSize:12, color:T.muted }}>
                          📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric"})}
                        </div>
                        <div style={{ fontSize:12, color:T.muted }}>🕐 {a.slot} · {a.type==="Online"?"💻":"🏥"} {a.type}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── SCHEDULE VIEW ── */}
          {view === "schedule" && (
            <div>
              <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800, color:T.text }}>Weekly Schedule</h2>

              {/* 7-day calendar strip */}
              <div style={{ display:"flex", gap:8, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
                {Array.from({length:14},(_,i)=>addDays(today,i-1)).map(d => {
                  const df = fmtDate(d);
                  const dayName = DAYS[d.getDay()];
                  const isAvail = doctor?.available?.includes(dayName);
                  const count   = appointments.filter(a => a.date===df && a.status!=="cancelled").length;
                  const isToday = df === todayStr;
                  return (
                    <button key={df} onClick={() => setSelectedDate(df)}
                      style={{ padding:"10px 12px", borderRadius:12, flexShrink:0, minWidth:64,
                        border:`2px solid ${selectedDate===df?T.primary:isToday?"#218EB6":"#dde8ed"}`,
                        background:selectedDate===df?T.primaryLight:isAvail?T.white:"#f9f9f9",
                        cursor:"pointer", textAlign:"center", position:"relative" }}>
                      {isToday && (
                        <div style={{ position:"absolute", top:4, right:6, width:6, height:6,
                          borderRadius:"50%", background:T.primary }} />
                      )}
                      <div style={{ fontSize:11, fontWeight:600, color:selectedDate===df?T.primary:T.muted }}>{dayName}</div>
                      <div style={{ fontSize:17, fontWeight:800, color:selectedDate===df?T.primary:isAvail?T.text:"#ccc" }}>{d.getDate()}</div>
                      <div style={{ fontSize:10, color:T.muted }}>
                        {count>0?`${count} appt${count>1?"s":""}`:(isAvail?"Open":"Off")}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Slots for selected day */}
              <Card>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:T.text }}>
                    {new Date(selectedDate+"T00:00:00").toLocaleDateString("en-PK",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
                  </h3>
                  <div style={{ fontSize:12, color:T.muted }}>
                    {dayAppts.filter(a=>a.status!=="cancelled").length} / {doctor?.slots?.length || 0} slots booked
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height:6, background:T.bg, borderRadius:10, marginBottom:18, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:10, background:`linear-gradient(90deg,${T.primary},${T.accent})`,
                    width:`${Math.round((dayAppts.filter(a=>a.status!=="cancelled").length/(doctor?.slots?.length||1))*100)}%`,
                    transition:"width 0.4s ease" }} />
                </div>

                <div style={{ display:"grid", gap:8 }}>
                  {(doctor?.slots || []).map(slot => {
                    const appt = dayAppts.find(a => a.slot===slot && a.status!=="cancelled");
                    return (
                      <div key={slot} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                        borderRadius:10, border:`1.5px solid ${appt?T.primary:T.border}`,
                        background:appt?T.primaryLight:T.bg }}>
                        <div style={{ fontWeight:800, fontSize:14, color:T.primary, minWidth:52 }}>{slot}</div>
                        {appt ? (
                          <>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{appt.patientName}</div>
                              <div style={{ fontSize:11, color:T.muted }}>
                                {appt.type==="Online"?"💻":"🏥"} {appt.type}
                                {appt.reason ? ` · ${appt.reason}` : ""}
                              </div>
                              {appt.patientEmail && (
                                <div style={{ fontSize:11, color:T.muted }}>📧 {appt.patientEmail}</div>
                              )}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                              <Badge status={appt.status} />
                              {appt.status==="pending" && (
                                <div style={{ display:"flex", gap:4 }}>
                                  <button onClick={()=>handleUpdateStatus(appt.id,"confirmed")}
                                    style={{ padding:"4px 10px", background:T.accent, color:"#fff",
                                      border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Accept</button>
                                  <button onClick={()=>handleUpdateStatus(appt.id,"cancelled")}
                                    style={{ padding:"4px 10px", background:T.dangerLight, color:T.danger,
                                      border:`1px solid ${T.danger}`, borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Decline</button>
                                </div>
                              )}
                              {appt.status==="confirmed" && (
                                <button onClick={()=>handleUpdateStatus(appt.id,"completed")}
                                  style={{ padding:"4px 10px", background:T.primaryLight, color:T.primary,
                                    border:`1px solid ${T.primary}`, borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Mark Done</button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div style={{ flex:1, fontSize:13, color:"#aaa" }}>— Available —</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ── ALL APPOINTMENTS VIEW ── */}
          {view === "patients" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:12 }}>
                <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:T.text }}>
                  All Appointments ({filteredAll.length})
                </h2>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["All","pending","confirmed","completed","cancelled"].map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      style={{ padding:"6px 13px", borderRadius:20,
                        border:`1.5px solid ${filterStatus===s?T.primary:T.border}`,
                        background:filterStatus===s?T.primary:T.white,
                        color:filterStatus===s?"#fff":T.muted,
                        fontSize:12, fontWeight:600, cursor:"pointer", textTransform:"capitalize" }}>
                      {s} {s!=="All" && `(${appointments.filter(a=>a.status===s).length})`}
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
                    <Card key={a.id} style={{ padding:"14px 18px" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                        <div style={{ width:42, height:42, borderRadius:"50%", background:T.primaryLight,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>👤</div>
                        <div style={{ flex:1, minWidth:180 }}>
                          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
                            <span style={{ fontWeight:700, fontSize:15, color:T.text }}>{a.patientName}</span>
                            <Badge status={a.status} />
                          </div>
                          <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                            <span style={{ fontSize:12, color:T.muted }}>
                              📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
                            </span>
                            <span style={{ fontSize:12, color:T.muted }}>🕐 {a.slot}</span>
                            <span style={{ fontSize:12, color:T.muted }}>{a.type==="Online"?"💻":"🏥"} {a.type}</span>
                          </div>
                          {a.patientEmail && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>📧 {a.patientEmail}</div>}
                          {a.reason && <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>📝 {a.reason}</div>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {a.status==="pending" && (
                            <>
                              <button onClick={()=>handleUpdateStatus(a.id,"confirmed")}
                                style={{ padding:"7px 14px", background:T.accent, color:"#fff",
                                  border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>Accept</button>
                              <button onClick={()=>handleUpdateStatus(a.id,"cancelled")}
                                style={{ padding:"7px 12px", background:T.dangerLight, color:T.danger,
                                  border:`1.5px solid ${T.danger}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>Decline</button>
                            </>
                          )}
                          {a.status==="confirmed" && (
                            <button onClick={()=>handleUpdateStatus(a.id,"completed")}
                              style={{ padding:"7px 14px", background:T.primaryLight, color:T.primary,
                                border:`1.5px solid ${T.primary}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>Mark Done</button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ANALYTICS VIEW ── */}
          {view === "stats" && (
            <div>
              <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800, color:T.text }}>Analytics Overview</h2>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Total Appointments" value={appointments.length}  icon="📋" color={T.primary} />
                <StatCard label="Confirmed"          value={appointments.filter(a=>a.status==="confirmed").length}  icon="✅" color={T.accent}  />
                <StatCard label="Completed"          value={completed.length}     icon="🎯" color="#8B5CF6" />
                <StatCard label="Cancelled"          value={appointments.filter(a=>a.status==="cancelled").length}  icon="❌" color={T.danger}  />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                {/* Consultation type breakdown */}
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>Consultation Types</h3>
                  {["Online","In Person"].map(type => {
                    const count = appointments.filter(a=>a.type===type).length;
                    const pct   = appointments.length ? Math.round(count/appointments.length*100) : 0;
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

                {/* Status breakdown */}
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>Status Breakdown</h3>
                  {[
                    ["confirmed", T.accent,   "Confirmed"],
                    ["pending",   T.warn,     "Pending"],
                    ["completed", "#8B5CF6",  "Completed"],
                    ["cancelled", T.danger,   "Cancelled"],
                  ].map(([status, color, label]) => {
                    const count = appointments.filter(a=>a.status===status).length;
                    const pct   = appointments.length ? Math.round(count/appointments.length*100) : 0;
                    return (
                      <div key={status} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />
                        <div style={{ flex:1, fontSize:13, color:T.text, fontWeight:600 }}>{label}</div>
                        <div style={{ fontSize:13, fontWeight:800, color }}>{count}</div>
                        <div style={{ fontSize:11, color:T.muted, minWidth:32 }}>{pct}%</div>
                      </div>
                    );
                  })}
                </Card>
              </div>

              {/* Doctor info card */}
              {doctor && (
                <Card>
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>My Profile</h3>
                  <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                    <Avatar initials={doctor.avatar} color={doctor.color} size={60} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:17, color:T.text }}>{profile?.name || doctor.name}</div>
                      <div style={{ fontSize:14, color:T.primary, fontWeight:600 }}>{doctor.specialty}</div>
                      <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>🏥 {doctor.hospital}</div>
                      <div style={{ fontSize:13, color:T.muted }}>⏳ {doctor.exp} years experience</div>
                      <div style={{ fontSize:13, color:T.muted }}>📅 Available: {doctor.available?.join(", ")}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>Consultation Fee</div>
                      <div style={{ fontSize:24, fontWeight:900, color:T.text }}>PKR {doctor.fee?.toLocaleString()}</div>
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

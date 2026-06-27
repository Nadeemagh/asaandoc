// src/pages/PatientPortal.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Avatar, Card, StatCard, Toast, Spinner, inputStyle, labelStyle } from "../components/UI";
import { getDoctors, bookAppointment, getAppointmentsByPatient, updateAppointmentStatus } from "../firebase/services";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/services";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const today = new Date();
const fmtDate = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function PatientPortal() {
  const { user, profile } = useAuth();
  const [view, setView] = useState("home");
  const [doctors, setDoctors] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [filterSpec, setFilterSpec] = useState("All");
  const [bookStep, setBookStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ date: "", slot: "", type: "Online", reason: "" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);
   try {
      const [docs, appts] = await Promise.all([
        getDoctors(),
        getAppointmentsByPatient(user.uid),
      ]);
      setDoctors(docs.length > 0 ? docs : []);
      setAppointments(appts);
    } catch (e) {
      showToast("Failed to load data. Check Firebase setup.", "error");
    }
    setLoadingData(false);
  }, [user.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const doctorList = doctors || [];
const specialties = ["All", ...new Set(doctorList.map(d => d.specialty))];
const filtered = filterSpec === "All" ? doctorList : doctorList.filter(d => d.specialty === filterSpec);

  const getAvailableDates = (doc) => {
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const d = addDays(today, i);
      if (doc.available?.includes(DAYS[d.getDay()])) dates.push(fmtDate(d));
    }
    return dates;
  };

  const bookedSlots = appointments
    .filter(a => a.doctorId === selectedDoctor?.id && a.date === form.date && a.status !== "cancelled")
    .map(a => a.slot);

  const handleBook = async () => {
    if (!form.date || !form.slot) return;
    setSubmitting(true);
    try {
      await bookAppointment({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        patientUid: user.uid,
        patientName: profile?.name || user.displayName || "Patient",
        patientEmail: user.email,
        ...form,
      });
      await loadData();
      setView("myappts");
      setBookStep(1);
      setForm({ date: "", slot: "", type: "Online", reason: "" });
      showToast("Appointment booked! Awaiting doctor confirmation. 🎉");
    } catch (e) {
      showToast("Booking failed. Please try again.", "error");
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    try {
      await updateAppointmentStatus(id, "cancelled");
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
      showToast("Appointment cancelled.");
    } catch {
      showToast("Failed to cancel.", "error");
    }
  };

  const upcoming = appointments.filter(a => a.status === "confirmed" || a.status === "pending");
  const completed = appointments.filter(a => a.status === "completed");

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "Inter,system-ui,sans-serif" }}>
      {/* Nav */}
      <div style={{ background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`, position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 4px 20px rgba(33,142,182,0.3)", padding: "0 16px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>AsaanDoc</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Patient Portal</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[["home","🏠","Home"],["browse","🔍","Doctors"],["myappts","📋","My Appointments"]].map(([v,icon,label]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                  fontWeight: 600, background: view === v ? "rgba(255,255,255,0.2)" : "transparent",
                  color: view === v ? "#fff" : "rgba(255,255,255,0.65)" }}>
                <span>{icon}</span> <span style={{ display: window.innerWidth > 560 ? "inline" : "none" }}>{label}</span>
              </button>
            ))}
            <button onClick={logoutUser}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.3)",
                background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {loadingData ? <Spinner /> : (
          <>
            {/* HOME */}
            {view === "home" && (
              <div>
                <div style={{ background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`, borderRadius: 20,
                  padding: "32px 28px", color: "#fff", marginBottom: 24, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", right: -10, top: -10, fontSize: 110, opacity: 0.06 }}>🏥</div>
                  <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
                    Welcome back, {profile?.name || user.displayName || "Patient"} 👋
                  </div>
                  <h1 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 900, lineHeight: 1.2 }}>
                    Your Health, Our Priority 💙
                  </h1>
                  <p style={{ margin: "0 0 20px", opacity: 0.8, fontSize: 14 }}>
                    Book consultations with top specialists across Pakistan — online or in-person.
                  </p>
                  <button onClick={() => setView("browse")}
                    style={{ padding: "12px 24px", background: "#fff", color: T.primary, border: "none",
                      borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    Book an Appointment →
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                  <StatCard label="Total Bookings" value={appointments.length} icon="📋" color={T.primary} />
                  <StatCard label="Upcoming" value={upcoming.length} icon="⏳" color={T.accent} />
                  <StatCard label="Completed" value={completed.length} icon="✅" color="#8B5CF6" />
                </div>

                <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: T.text }}>Featured Specialists</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
                {doctorList.slice(0, 4).map(doc => (
                    <div key={doc.id} style={{ background: T.white, borderRadius: 14, padding: 16,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1.5px solid ${T.border}` }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                        <Avatar initials={doc.avatar} color={doc.color} size={44} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{doc.name}</div>
                          <div style={{ fontSize: 12, color: T.muted }}>{doc.specialty}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: T.muted }}>⏳ {doc.exp} yrs</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.primary }}>PKR {doc.fee?.toLocaleString()}</div>
                      </div>
                      <button onClick={() => { setSelectedDoctor(doc); setView("book"); setBookStep(1); setForm({ date:"", slot:"", type:"Online", reason:"" }); }}
                        style={{ width: "100%", padding: "9px", background: T.primaryLight, color: T.primary,
                          border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                        Book Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BROWSE */}
            {view === "browse" && (
              <div>
                <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: T.text }}>Find a Doctor</h2>
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                  {specialties.map(s => (
                    <button key={s} onClick={() => setFilterSpec(s)}
                      style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${filterSpec===s ? T.primary : T.border}`,
                        background: filterSpec===s ? T.primary : T.white, color: filterSpec===s ? "#fff" : T.muted,
                        fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  {(filtered || []).map(doc => (
                    <Card key={doc.id} style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap", padding:"18px 20px" }}>
                      <Avatar initials={doc.avatar} color={doc.color} size={52} />
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{doc.name}</div>
                        <div style={{ fontSize: 13, color: T.primary, fontWeight: 600, marginBottom: 4 }}>{doc.specialty}</div>
                        <div style={{ fontSize: 12, color: T.muted }}>🏥 {doc.hospital}</div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>⏳ {doc.exp} years · 📅 {doc.available?.join(", ")}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 8 }}>PKR {doc.fee?.toLocaleString()}</div>
                        <button onClick={() => { setSelectedDoctor(doc); setView("book"); setBookStep(1); setForm({ date:"", slot:"", type:"Online", reason:"" }); }}
                          style={{ padding:"10px 20px", background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
                            color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                          Book Appointment
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* BOOK */}
            {view === "book" && selectedDoctor && (
              <div>
                <button onClick={() => setView("browse")} style={{ background:"none", border:"none", color:T.primary,
                  fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, padding:0 }}>
                  ← Back to Doctors
                </button>
                <Card style={{ marginBottom:20, display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                  <Avatar initials={selectedDoctor.avatar} color={selectedDoctor.color} size={56} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:18, color:T.text }}>{selectedDoctor.name}</div>
                    <div style={{ color:T.primary, fontWeight:600, fontSize:14 }}>{selectedDoctor.specialty}</div>
                    <div style={{ color:T.muted, fontSize:13 }}>🏥 {selectedDoctor.hospital}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:20, fontWeight:800, color:T.text }}>PKR {selectedDoctor.fee?.toLocaleString()}</div>
                    <div style={{ fontSize:12, color:T.muted }}>per consultation</div>
                  </div>
                </Card>

                {/* Step indicators */}
                <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
                  {["Date & Time","Confirm"].map((s,i) => (
                    <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center",
                          justifyContent:"center", fontWeight:700, fontSize:13,
                          background: bookStep>i+1 ? T.accent : bookStep===i+1 ? T.primary : T.border,
                          color: bookStep>=i+1 ? "#fff" : T.muted }}>
                          {bookStep>i+1 ? "✓" : i+1}
                        </div>
                        <div style={{ fontSize:11, fontWeight:600, color:bookStep===i+1?T.primary:T.muted }}>{s}</div>
                      </div>
                      {i<1 && <div style={{ height:2, flex:1, background:bookStep>i+1?T.accent:T.border, marginBottom:20 }} />}
                    </div>
                  ))}
                </div>

                {/* Step 1 */}
                {bookStep === 1 && (
                  <Card>
                    <h3 style={{ margin:"0 0 4px", color:T.text, fontSize:16 }}>Choose Date & Time</h3>
                    <p style={{ margin:"0 0 16px", color:T.muted, fontSize:13 }}>Available: {selectedDoctor.available?.join(", ")}</p>
                    <div>
                      <label style={labelStyle}>Select Date</label>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                        {getAvailableDates(selectedDoctor).map(d => {
                          const dateObj = new Date(d+"T00:00:00");
                          return (
                            <button key={d} onClick={() => setForm(f=>({...f,date:d,slot:""}))}
                              style={{ padding:"10px 12px", borderRadius:10, border:`2px solid ${form.date===d?T.primary:T.border}`,
                                background:form.date===d?T.primaryLight:T.white, cursor:"pointer",
                                color:form.date===d?T.primary:T.text, fontWeight:600, fontSize:12, textAlign:"center" }}>
                              <div>{DAYS[dateObj.getDay()]}</div>
                              <div style={{ fontSize:14, fontWeight:800 }}>{dateObj.getDate()}</div>
                              <div style={{ fontSize:10, color:T.muted }}>{dateObj.toLocaleString("default",{month:"short"})}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {form.date && (
                      <div>
                        <label style={labelStyle}>Select Time Slot</label>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                          {selectedDoctor.slots?.map(slot => {
                            const booked = bookedSlots.includes(slot);
                            return (
                              <button key={slot} onClick={() => !booked && setForm(f=>({...f,slot}))} disabled={booked}
                                style={{ padding:"10px", borderRadius:10,
                                  border:`2px solid ${form.slot===slot?T.primary:booked?"#eee":T.border}`,
                                  background:form.slot===slot?T.primaryLight:booked?"#f9f9f9":T.white,
                                  color:form.slot===slot?T.primary:booked?"#ccc":T.text,
                                  fontWeight:600, fontSize:13, cursor:booked?"not-allowed":"pointer",
                                  textDecoration:booked?"line-through":"none" }}>
                                {slot} {booked?"🚫":""}
                              </button>
                            );
                          })}
                        </div>
                        <label style={labelStyle}>Consultation Type</label>
                        <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                          {["Online","In Person"].map(t => (
                            <button key={t} onClick={() => setForm(f=>({...f,type:t}))}
                              style={{ flex:1, padding:"10px", border:`2px solid ${form.type===t?T.primary:T.border}`,
                                borderRadius:10, background:form.type===t?T.primaryLight:T.white,
                                color:form.type===t?T.primary:T.muted, fontWeight:600, cursor:"pointer" }}>
                              {t==="Online"?"💻 Online":"🏥 In Person"}
                            </button>
                          ))}
                        </div>
                        <label style={labelStyle}>Reason for Visit</label>
                        <textarea value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}
                          placeholder="Describe your symptoms or reason..."
                          style={{ ...inputStyle, height:80, resize:"vertical" }} />
                      </div>
                    )}
                    <button onClick={() => form.date && form.slot && setBookStep(2)}
                      disabled={!form.date || !form.slot}
                      style={{ marginTop:16, width:"100%", padding:"13px",
                        background:form.date&&form.slot?`linear-gradient(135deg,${T.primary},${T.primaryDark})`:T.border,
                        color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14,
                        cursor:form.date&&form.slot?"pointer":"not-allowed" }}>
                      Review Booking →
                    </button>
                  </Card>
                )}

                {/* Step 2 Confirm */}
                {bookStep === 2 && (
                  <Card>
                    <h3 style={{ margin:"0 0 18px", color:T.text, fontSize:16 }}>Confirm Appointment</h3>
                    <div style={{ background:T.bg, borderRadius:12, padding:16, marginBottom:18 }}>
                      {[
                        ["Doctor", selectedDoctor.name],
                        ["Specialty", selectedDoctor.specialty],
                        ["Patient", profile?.name || user.displayName],
                        ["Date", new Date(form.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})],
                        ["Time", form.slot],
                        ["Type", form.type],
                        ["Fee", `PKR ${selectedDoctor.fee?.toLocaleString()}`],
                        ["Reason", form.reason || "—"],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0",
                          borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                          <span style={{ color:T.muted, fontWeight:600 }}>{k}</span>
                          <span style={{ color:T.text, fontWeight:600, textAlign:"right", maxWidth:"60%" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={() => setBookStep(1)}
                        style={{ flex:1, padding:"13px", background:T.white, border:`2px solid ${T.border}`,
                          borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", color:T.muted }}>← Back</button>
                      <button onClick={handleBook} disabled={submitting}
                        style={{ flex:2, padding:"13px", background:`linear-gradient(135deg,${T.accent},#00a87e)`,
                          color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14,
                          cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1 }}>
                        {submitting ? "Booking..." : "✅ Confirm Booking"}
                      </button>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* MY APPOINTMENTS */}
            {view === "myappts" && (
              <div>
                <h2 style={{ margin:"0 0 18px", fontSize:20, fontWeight:800, color:T.text }}>My Appointments</h2>
                {appointments.length === 0 ? (
                  <Card style={{ textAlign:"center", padding:"48px 20px" }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                    <div style={{ fontWeight:700, fontSize:16, color:T.text, marginBottom:8 }}>No appointments yet</div>
                    <div style={{ color:T.muted, fontSize:14, marginBottom:20 }}>Book your first consultation</div>
                    <button onClick={() => setView("browse")} style={{ padding:"11px 24px",
                      background:T.primary, color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer" }}>
                      Find a Doctor
                    </button>
                  </Card>
                ) : (
                  <div style={{ display:"grid", gap:12 }}>
                    {appointments.map(a => (
                      <Card key={a.id} style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>
                        <Avatar initials={a.doctorName?.split(" ").map(w=>w[0]).slice(0,2).join("") || "DR"} color={T.primary} size={44} />
                        <div style={{ flex:1, minWidth:180 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{a.doctorName}</div>
                              <div style={{ fontSize:13, color:T.primary }}>{a.doctorSpecialty}</div>
                            </div>
                            <Badge status={a.status} />
                          </div>
                          <div style={{ display:"flex", gap:14, marginTop:8, flexWrap:"wrap" }}>
                            <span style={{ fontSize:12, color:T.muted }}>📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric"})}</span>
                            <span style={{ fontSize:12, color:T.muted }}>🕐 {a.slot}</span>
                            <span style={{ fontSize:12, color:T.muted }}>{a.type==="Online"?"💻":"🏥"} {a.type}</span>
                          </div>
                          {a.reason && <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>📝 {a.reason}</div>}
                        </div>
                        {(a.status==="confirmed"||a.status==="pending") && (
                          <button onClick={() => handleCancel(a.id)}
                            style={{ padding:"7px 14px", background:"#fef2f2", color:"#EF4444",
                              border:"1.5px solid #EF4444", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                            Cancel
                          </button>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

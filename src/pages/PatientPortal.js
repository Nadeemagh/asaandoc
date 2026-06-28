// src/pages/PatientPortal.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Card, StatCard, Toast, Spinner, inputStyle, labelStyle } from "../components/UI";
import { getDoctors, bookAppointment, getAppointmentsByPatient, updateAppointmentStatus } from "../firebase/services";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/services";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const today = new Date();
const fmtDate = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

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

// Doctor Photo Component — shows real photo or colored initials fallback
const DoctorPhoto = ({ doc, size = 44 }) => {
  const [imgError, setImgError] = useState(false);
  if (doc.photo && !imgError) {
    return (
      <img
        src={doc.photo}
        alt={doc.name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0,
          border: `2px solid ${T.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: doc.color || T.primary, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 800, fontSize: size * 0.35,
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
    }}>
      {(doc.avatar || doc.name?.charAt(0) || "D")}
    </div>
  );
};

export default function PatientPortal() {
  const { user, profile } = useAuth();
  const [view, setView] = useState("home");
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [filterSpec, setFilterSpec] = useState("All");
  const [bookStep, setBookStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [form, setForm] = useState({ date: "", slot: "", reason: "", receipt: "", receiptName: "" });

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
      setDoctors(Array.isArray(docs) ? docs : []);
      setAppointments(Array.isArray(appts) ? appts : []);
    } catch (e) {
      console.error("Load error:", e);
      showToast("Failed to load data.", "error");
    }
    setLoadingData(false);
  }, [user.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const specialties = ["All", ...new Set(doctors.map(d => d.specialty))];
  const filtered = filterSpec === "All" ? doctors : doctors.filter(d => d.specialty === filterSpec);

  const getDoctorClinics = (doc) => {
    if (doc.clinics && Array.isArray(doc.clinics)) return doc.clinics;
    return [{
      name: doc.hospital || "Clinic",
      address: "",
      days: Array.isArray(doc.available) ? doc.available : [],
      slots: Array.isArray(doc.slots) ? doc.slots : [],
      fee: doc.fee || 0,
      startTime: "", endTime: "", isOnline: false,
    }];
  };

  const getAvailableDates = (clinic) => {
    if (!clinic) return [];
    const dates = [];
    const holidays = selectedDoctor?.holidays?.map(h => h.date) || [];
    for (let i = 1; i <= 14; i++) {
      const d = addDays(today, i);
      const df = fmtDate(d);
      if (clinic.days?.includes(DAYS[d.getDay()]) && !holidays.includes(df)) {
        dates.push(df);
      }
    }
    return dates;
  };

  const bookedSlots = appointments
    .filter(a => a.doctorId === selectedDoctor?.id && a.clinicName === selectedClinic?.name
      && a.date === form.date && a.status !== "cancelled")
    .map(a => a.slot);

  const handleBook = async () => {
    if (!form.date || !form.slot || !selectedClinic) return;
    setSubmitting(true);
    try {
      const fee = parseFee(selectedClinic.fee);
      await bookAppointment({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        doctorPhoto: selectedDoctor.photo || "",
        clinicName: selectedClinic.name,
        clinicAddress: selectedClinic.address || "",
        clinicFee: fee,
        type: selectedClinic.isOnline ? "Online" : "In Person",
        patientUid: user.uid,
        patientName: profile?.name || user.displayName || "Patient",
        patientEmail: user.email,
        date: form.date,
        slot: form.slot,
        reason: form.reason,
        paymentReceipt: form.receipt || "",
        paymentReceiptName: form.receiptName || "",
      });
      await loadData();
      setView("myappts");
      setBookStep(1);
      setSelectedClinic(null);
      setForm({ date: "", slot: "", reason: "", receipt: "", receiptName: "" });
      showToast("Appointment booked! Awaiting doctor confirmation. 🎉");
    } catch (e) {
      console.error("Book error:", e);
      showToast("Booking failed. Please try again.", "error");
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    try {
      await updateAppointmentStatus(id, "cancelled");
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
      showToast("Appointment cancelled.");
    } catch { showToast("Failed to cancel.", "error"); }
  };

  const startBooking = (doc) => {
    setSelectedDoctor(doc);
    setSelectedClinic(null);
    setForm({ date: "", slot: "", reason: "", receipt: "", receiptName: "" });
    setBookStep(1);
    setView("book");
  };

  const upcoming = appointments.filter(a => a.status === "confirmed" || a.status === "pending");
  const completed = appointments.filter(a => a.status === "completed");

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"Inter,system-ui,sans-serif" }}>

      {/* NAV */}
      <div style={{ background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`, position:"sticky",
        top:0, zIndex:100, boxShadow:"0 4px 20px rgba(33,142,182,0.3)", padding:"0 16px" }}>
        <div style={{ maxWidth:960, margin:"0 auto", height:60, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <img src="/logo.png" alt="AsaanDoc" style={{ height:36, filter:"brightness(0) invert(1)" }}
              onError={e => { e.target.style.display="none"; }} />
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11 }}>Patient Portal</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {[["home","🏠","Home"],["browse","🔍","Doctors"],["myappts","📋","My Appointments"]].map(([v,icon,label]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding:"7px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13,
                  fontWeight:600, background:view===v?"rgba(255,255,255,0.2)":"transparent",
                  color:view===v?"#fff":"rgba(255,255,255,0.65)" }}>
                <span>{icon}</span> <span style={{ display:window.innerWidth>560?"inline":"none" }}>{label}</span>
              </button>
            ))}
            <button onClick={logoutUser}
              style={{ padding:"7px 12px", borderRadius:8, border:"1.5px solid rgba(255,255,255,0.3)",
                background:"transparent", color:"rgba(255,255,255,0.75)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"24px 16px" }}>
        {loadingData ? <Spinner /> : (
          <>
            {/* HOME */}
            {view === "home" && (
              <div>
                <div style={{ background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`, borderRadius:20,
                  padding:"32px 28px", color:"#fff", marginBottom:24, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", right:-10, top:-10, fontSize:110, opacity:0.06 }}>🏥</div>
                  <div style={{ fontSize:13, opacity:0.75, marginBottom:6 }}>
                    Welcome back, {profile?.name || user.displayName || "Patient"} 👋
                  </div>
                  <h1 style={{ margin:"0 0 8px", fontSize:24, fontWeight:900, lineHeight:1.2 }}>
                    Your Health, Our Priority 💙
                  </h1>
                  <p style={{ margin:"0 0 4px", opacity:0.7, fontSize:13, fontFamily:"serif" }}>صحت کا آسان راستہ</p>
                  <p style={{ margin:"0 0 20px", opacity:0.8, fontSize:13 }}>
                    Book consultations with top specialists across Pakistan.
                  </p>
                  <button onClick={() => setView("browse")}
                    style={{ padding:"12px 24px", background:"#fff", color:T.primary, border:"none",
                      borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer" }}>
                    Book an Appointment →
                  </button>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
                  <StatCard label="Total Bookings" value={appointments.length} icon="📋" color={T.primary} />
                  <StatCard label="Upcoming" value={upcoming.length} icon="⏳" color={T.accent} />
                  <StatCard label="Completed" value={completed.length} icon="✅" color="#8B5CF6" />
                </div>

                <h3 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:T.text }}>Featured Specialists</h3>
                {doctors.length === 0 ? (
                  <div style={{ padding:"24px", textAlign:"center", color:T.muted, background:T.white,
                    borderRadius:14, border:`1.5px solid ${T.border}` }}>No doctors available yet.</div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
                    {doctors.slice(0,4).map(doc => {
                      const clinics = getDoctorClinics(doc);
                      const fees = clinics.map(c => parseFee(c.fee)).filter(f => f > 0);
                      const minFee = fees.length > 0 ? Math.min(...fees) : 0;
                      return (
                        <div key={doc.id} style={{ background:T.white, borderRadius:14, overflow:"hidden",
                          boxShadow:"0 2px 10px rgba(0,0,0,0.06)", border:`1.5px solid ${T.border}` }}>
                          {/* Doctor photo banner */}
                          <div style={{ height:100, background:`linear-gradient(135deg,${doc.color||T.primary}22,${doc.color||T.primary}44)`,
                            display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                            <DoctorPhoto doc={doc} size={80} />
                          </div>
                          <div style={{ padding:"12px 16px 16px" }}>
                            <div style={{ fontWeight:700, fontSize:14, color:T.text, textAlign:"center", marginBottom:2 }}>{doc.name}</div>
                            <div style={{ fontSize:12, color:T.primary, fontWeight:600, textAlign:"center", marginBottom:10 }}>{doc.specialty}</div>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                              <div style={{ fontSize:12, color:T.muted }}>🏥 {clinics.length} location{clinics.length>1?"s":""}</div>
                              <div style={{ fontSize:12, color:T.muted }}>⏳ {doc.exp} yrs</div>
                            </div>
                            <div style={{ fontSize:13, fontWeight:700, color:T.primary, textAlign:"center", marginBottom:12 }}>
                              {minFee > 0 ? `From PKR ${minFee.toLocaleString()}` : "See clinics"}
                            </div>
                            <button onClick={() => startBooking(doc)}
                              style={{ width:"100%", padding:"9px", background:T.primaryLight, color:T.primary,
                                border:"none", borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer" }}>
                              Book Now
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* BROWSE */}
            {view === "browse" && (
              <div>
                <h2 style={{ margin:"0 0 16px", fontSize:20, fontWeight:800, color:T.text }}>Find a Doctor</h2>
                <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
                  {specialties.map(s => (
                    <button key={s} onClick={() => setFilterSpec(s)}
                      style={{ padding:"7px 14px", borderRadius:20,
                        border:`1.5px solid ${filterSpec===s?T.primary:T.border}`,
                        background:filterSpec===s?T.primary:T.white,
                        color:filterSpec===s?"#fff":T.muted,
                        fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                      {s}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <div style={{ padding:"40px", textAlign:"center", color:T.muted }}>No doctors found.</div>
                ) : (
                  <div style={{ display:"grid", gap:16 }}>
                    {filtered.map(doc => {
                      const clinics = getDoctorClinics(doc);
                      return (
                        <Card key={doc.id} style={{ padding:"20px" }}>
                          <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
                            <DoctorPhoto doc={doc} size={72} />
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:800, fontSize:16, color:T.text }}>{doc.name}</div>
                              <div style={{ fontSize:14, color:T.primary, fontWeight:600 }}>{doc.specialty}</div>
                              <div style={{ fontSize:13, color:T.muted }}>⏳ {doc.exp} years experience</div>
                            </div>
                            <button onClick={() => startBooking(doc)}
                              style={{ padding:"11px 22px",
                                background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
                                color:"#fff", border:"none", borderRadius:10, fontWeight:700,
                                fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
                              Book Appointment
                            </button>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                            {clinics.map((clinic, i) => {
                              const fee = parseFee(clinic.fee);
                              return (
                                <div key={i} style={{ padding:"12px 14px", borderRadius:12,
                                  background:clinic.isOnline?"#f0fdf4":T.primaryLight,
                                  border:`1.5px solid ${clinic.isOnline?"#86efac":T.primary}` }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                                    <div style={{ fontWeight:700, fontSize:13, color:T.text, flex:1 }}>
                                      {clinic.isOnline?"💻":"🏥"} {clinic.name}
                                    </div>
                                    <div style={{ fontSize:13, fontWeight:800, color:clinic.isOnline?"#16a34a":T.primary,
                                      whiteSpace:"nowrap", marginLeft:8 }}>
                                      PKR {fee.toLocaleString()}
                                    </div>
                                  </div>
                                  {!clinic.isOnline && clinic.address && (
                                    <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>📍 {clinic.address}</div>
                                  )}
                                  <div style={{ fontSize:11, color:T.muted, marginBottom:2 }}>
                                    📅 {Array.isArray(clinic.days)?(clinic.days.length===7?"Every Day":clinic.days.join(", ")):clinic.days}
                                  </div>
                                  {clinic.startTime && (
                                    <div style={{ fontSize:11, color:T.muted }}>
                                      🕐 {formatTime(clinic.startTime)} – {formatTime(clinic.endTime)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* BOOK */}
            {view === "book" && selectedDoctor && (
              <div>
                <button onClick={() => setView("browse")}
                  style={{ background:"none", border:"none", color:T.primary,
                    fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, padding:0 }}>
                  ← Back to Doctors
                </button>

                <Card style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
                    <DoctorPhoto doc={selectedDoctor} size={70} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:800, fontSize:18, color:T.text }}>{selectedDoctor.name}</div>
                      <div style={{ color:T.primary, fontWeight:600, fontSize:14 }}>{selectedDoctor.specialty}</div>
                      <div style={{ color:T.muted, fontSize:13 }}>⏳ {selectedDoctor.exp} years experience</div>
                    </div>
                  </div>
                </Card>

                {/* Steps */}
                <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
                  {["Select Clinic","Date & Time","Confirm"].map((s,i) => (
                    <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flex:1 }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center",
                          justifyContent:"center", fontWeight:700, fontSize:13,
                          background:bookStep>i+1?T.accent:bookStep===i+1?T.primary:T.border,
                          color:bookStep>=i+1?"#fff":T.muted }}>
                          {bookStep>i+1?"✓":i+1}
                        </div>
                        <div style={{ fontSize:11, fontWeight:600,
                          color:bookStep===i+1?T.primary:T.muted, whiteSpace:"nowrap" }}>{s}</div>
                      </div>
                      {i<2 && <div style={{ height:2, flex:1, background:bookStep>i+1?T.accent:T.border, marginBottom:20 }} />}
                    </div>
                  ))}
                </div>

                {/* STEP 1 */}
                {bookStep === 1 && (
                  <Card>
                    <h3 style={{ margin:"0 0 16px", color:T.text, fontSize:16, fontWeight:700 }}>
                      Choose Clinic or Consultation Type
                    </h3>
                    <div style={{ display:"grid", gap:12 }}>
                      {getDoctorClinics(selectedDoctor).map((clinic, i) => {
                        const fee = parseFee(clinic.fee);
                        const isSelected = selectedClinic?.name === clinic.name;
                        return (
                          <div key={i} onClick={() => setSelectedClinic(clinic)}
                            style={{ padding:"16px", borderRadius:12, cursor:"pointer",
                              border:`2px solid ${isSelected?(clinic.isOnline?"#16a34a":T.primary):T.border}`,
                              background:isSelected?(clinic.isOnline?"#f0fdf4":T.primaryLight):T.white,
                              transition:"all 0.15s" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:4 }}>
                                  {clinic.isOnline?"💻":"🏥"} {clinic.name}
                                </div>
                                {!clinic.isOnline && clinic.address && (
                                  <div style={{ fontSize:12, color:T.muted, marginBottom:6 }}>📍 {clinic.address}</div>
                                )}
                                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}>
                                  <span style={{ fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:20,
                                    background:clinic.isOnline?"#dcfce7":"#e0f2fe",
                                    color:clinic.isOnline?"#16a34a":"#0369a1" }}>
                                    📅 {Array.isArray(clinic.days)?(clinic.days.length===7?"Every Day":clinic.days.join(", ")):clinic.days}
                                  </span>
                                  {clinic.startTime && (
                                    <span style={{ fontSize:12, fontWeight:600, padding:"3px 10px",
                                      borderRadius:20, background:"#f5f3ff", color:"#7c3aed" }}>
                                      🕐 {formatTime(clinic.startTime)} – {formatTime(clinic.endTime)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, marginLeft:12 }}>
                                <div style={{ fontSize:17, fontWeight:800, color:clinic.isOnline?"#16a34a":T.primary }}>
                                  PKR {fee > 0 ? fee.toLocaleString() : "—"}
                                </div>
                                <div style={{ width:22, height:22, borderRadius:"50%",
                                  border:`2px solid ${isSelected?(clinic.isOnline?"#16a34a":T.primary):T.border}`,
                                  background:isSelected?(clinic.isOnline?"#16a34a":T.primary):"white",
                                  display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontSize:12 }}>
                                  {isSelected?"✓":""}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => selectedClinic && setBookStep(2)} disabled={!selectedClinic}
                      style={{ marginTop:20, width:"100%", padding:"13px",
                        background:selectedClinic?`linear-gradient(135deg,${T.primary},${T.primaryDark})`:T.border,
                        color:"#fff", border:"none", borderRadius:10, fontWeight:700,
                        fontSize:14, cursor:selectedClinic?"pointer":"not-allowed" }}>
                      Continue to Date & Time →
                    </button>
                  </Card>
                )}

                {/* STEP 2 */}
                {bookStep === 2 && selectedClinic && (
                  <Card>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20,
                      padding:"12px 14px", borderRadius:10,
                      background:selectedClinic.isOnline?"#f0fdf4":T.primaryLight,
                      border:`1.5px solid ${selectedClinic.isOnline?"#86efac":T.primary}` }}>
                      <span style={{ fontSize:20 }}>{selectedClinic.isOnline?"💻":"🏥"}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{selectedClinic.name}</div>
                        {!selectedClinic.isOnline && <div style={{ fontSize:11, color:T.muted }}>{selectedClinic.address}</div>}
                        <div style={{ fontSize:12, color:selectedClinic.isOnline?"#16a34a":T.primary, fontWeight:700 }}>
                          PKR {parseFee(selectedClinic.fee).toLocaleString()}
                        </div>
                      </div>
                      <button onClick={() => setBookStep(1)}
                        style={{ background:"none", border:`1.5px solid ${T.border}`, color:T.primary,
                          fontSize:12, fontWeight:600, cursor:"pointer", padding:"5px 10px", borderRadius:7 }}>
                        Change
                      </button>
                    </div>

                    <label style={labelStyle}>Select Date</label>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                      {getAvailableDates(selectedClinic).length === 0 ? (
                        <div style={{ color:T.muted, fontSize:13, padding:"12px 0" }}>No available dates for this clinic.</div>
                      ) : (
                        getAvailableDates(selectedClinic).map(d => {
                          const dateObj = new Date(d+"T00:00:00");
                          return (
                            <button key={d} onClick={() => setForm(f=>({...f,date:d,slot:""}))}
                              style={{ padding:"10px 12px", borderRadius:10,
                                border:`2px solid ${form.date===d?T.primary:T.border}`,
                                background:form.date===d?T.primaryLight:T.white,
                                cursor:"pointer", color:form.date===d?T.primary:T.text,
                                fontWeight:600, fontSize:12, textAlign:"center" }}>
                              <div>{DAYS[dateObj.getDay()]}</div>
                              <div style={{ fontSize:14, fontWeight:800 }}>{dateObj.getDate()}</div>
                              <div style={{ fontSize:10, color:T.muted }}>{dateObj.toLocaleString("default",{month:"short"})}</div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {form.date && (
                      <div>
                        <label style={labelStyle}>Select Time Slot</label>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                          {(Array.isArray(selectedClinic.slots)?selectedClinic.slots:[]).map(slot => {
                            const booked = bookedSlots.includes(slot);
                            return (
                              <button key={slot} onClick={() => !booked && setForm(f=>({...f,slot}))} disabled={booked}
                                style={{ padding:"10px", borderRadius:10,
                                  border:`2px solid ${form.slot===slot?T.primary:booked?"#eee":T.border}`,
                                  background:form.slot===slot?T.primaryLight:booked?"#f9f9f9":T.white,
                                  color:form.slot===slot?T.primary:booked?"#ccc":T.text,
                                  fontWeight:600, fontSize:13, cursor:booked?"not-allowed":"pointer",
                                  textDecoration:booked?"line-through":"none" }}>
                                {formatTime(slot)} {booked?"🚫":""}
                              </button>
                            );
                          })}
                        </div>
                        <label style={labelStyle}>Reason for Visit</label>
                        <textarea value={form.reason} onChange={e => setForm(f=>({...f,reason:e.target.value}))}
                          placeholder="Describe your symptoms or reason..."
                          style={{ ...inputStyle, height:80, resize:"vertical" }} />

                        {/* Payment Receipt Upload */}
                        <label style={{ ...labelStyle, marginTop:16 }}>
                          Upload Payment Receipt <span style={{ color:T.muted, fontWeight:400, textTransform:"none", fontSize:11 }}>(optional)</span>
                        </label>
                        <div style={{ marginTop:6 }}>
                          {!form.receipt ? (
                            <label style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px",
                              border:`2px dashed ${T.border}`, borderRadius:10, cursor:"pointer",
                              background:T.bg, transition:"all 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = T.primary}
                              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                              <span style={{ fontSize:28 }}>📎</span>
                              <div>
                                <div style={{ fontWeight:600, fontSize:13, color:T.text }}>Click to upload receipt</div>
                                <div style={{ fontSize:11, color:T.muted }}>JPG, PNG or PDF · Max 500KB</div>
                              </div>
                              <input type="file" accept="image/*,.pdf" style={{ display:"none" }}
                                onChange={e => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  if (file.size > 500000) {
                                    alert("File too large! Please upload under 500KB.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = ev => {
                                    setForm(f => ({...f, receipt: ev.target.result, receiptName: file.name}));
                                  };
                                  reader.readAsDataURL(file);
                                }} />
                            </label>
                          ) : (
                            <div style={{ padding:"12px 14px", border:`1.5px solid ${T.accent}`,
                              borderRadius:10, background:T.accentLight,
                              display:"flex", alignItems:"center", gap:12 }}>
                              <span style={{ fontSize:24 }}>✅</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:600, fontSize:13, color:T.text }}>Receipt uploaded</div>
                                <div style={{ fontSize:11, color:T.muted }}>{form.receiptName}</div>
                              </div>
                              <button onClick={() => setForm(f=>({...f,receipt:"",receiptName:""}))}
                                style={{ background:"none", border:"none", color:"#EF4444",
                                  cursor:"pointer", fontSize:18, fontWeight:700 }}>×</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ display:"flex", gap:10, marginTop:16 }}>
                      <button onClick={() => setBookStep(1)}
                        style={{ flex:1, padding:"13px", background:T.white, border:`2px solid ${T.border}`,
                          borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", color:T.muted }}>← Back</button>
                      <button onClick={() => form.date && form.slot && setBookStep(3)} disabled={!form.date||!form.slot}
                        style={{ flex:2, padding:"13px",
                          background:form.date&&form.slot?`linear-gradient(135deg,${T.primary},${T.primaryDark})`:T.border,
                          color:"#fff", border:"none", borderRadius:10, fontWeight:700,
                          fontSize:14, cursor:form.date&&form.slot?"pointer":"not-allowed" }}>
                        Review Booking →
                      </button>
                    </div>
                  </Card>
                )}

                {/* STEP 3 */}
                {bookStep === 3 && selectedClinic && (
                  <Card>
                    <h3 style={{ margin:"0 0 18px", color:T.text, fontSize:16, fontWeight:700 }}>Confirm Appointment</h3>
                    <div style={{ background:T.bg, borderRadius:12, padding:16, marginBottom:16 }}>
                      {[
                        ["Doctor",    selectedDoctor.name],
                        ["Specialty", selectedDoctor.specialty],
                        ["Patient",   profile?.name || user.displayName || "—"],
                        ["Clinic",    selectedClinic.name],
                        ["Address",   selectedClinic.isOnline?"Online (Video Call)":selectedClinic.address],
                        ["Date",      new Date(form.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})],
                        ["Time",      formatTime(form.slot)],
                        ["Type",      selectedClinic.isOnline?"💻 Online":"🏥 In Person"],
                        ["Reason",    form.reason||"—"],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display:"flex", justifyContent:"space-between",
                          padding:"9px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                          <span style={{ color:T.muted, fontWeight:600, minWidth:80 }}>{k}</span>
                          <span style={{ color:T.text, fontWeight:600, textAlign:"right", maxWidth:"65%" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding:"14px 16px", borderRadius:10, marginBottom:16,
                      background:selectedClinic.isOnline?"#f0fdf4":T.primaryLight,
                      border:`1.5px solid ${selectedClinic.isOnline?"#86efac":T.primary}`,
                      display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontWeight:600, color:T.text }}>Consultation Fee</span>
                      <span style={{ fontWeight:900, fontSize:20, color:selectedClinic.isOnline?"#16a34a":T.primary }}>
                        PKR {parseFee(selectedClinic.fee).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={() => setBookStep(2)}
                        style={{ flex:1, padding:"13px", background:T.white, border:`2px solid ${T.border}`,
                          borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer", color:T.muted }}>← Back</button>
                      <button onClick={handleBook} disabled={submitting}
                        style={{ flex:2, padding:"13px", background:`linear-gradient(135deg,${T.accent},#00a87e)`,
                          color:"#fff", border:"none", borderRadius:10, fontWeight:700,
                          fontSize:14, cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1 }}>
                        {submitting?"Booking...":"✅ Confirm Booking"}
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
                    <button onClick={() => setView("browse")}
                      style={{ padding:"11px 24px", background:T.primary, color:"#fff",
                        border:"none", borderRadius:10, fontWeight:700, cursor:"pointer" }}>Find a Doctor</button>
                  </Card>
                ) : (
                  <div style={{ display:"grid", gap:12 }}>
                    {appointments.map(a => {
                      const isOnline = a.type === "Online";
                      return (
                        <Card key={a.id} style={{ padding:"16px 20px" }}>
                          <div style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>
                            {/* Doctor photo in appointment card */}
                            {a.doctorPhoto ? (
                              <img src={a.doctorPhoto} alt={a.doctorName}
                                style={{ width:50, height:50, borderRadius:"50%", objectFit:"cover",
                                  flexShrink:0, border:`2px solid ${T.border}` }}
                                onError={e => { e.target.style.display="none"; }} />
                            ) : (
                              <div style={{ width:50, height:50, borderRadius:"50%", background:T.primaryLight,
                                border:`2px solid ${T.primary}`, display:"flex", alignItems:"center",
                                justifyContent:"center", fontSize:20, flexShrink:0 }}>
                                {isOnline?"💻":"🏥"}
                              </div>
                            )}
                            <div style={{ flex:1, minWidth:180 }}>
                              <div style={{ display:"flex", justifyContent:"space-between",
                                alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
                                <div>
                                  <div style={{ fontWeight:700, fontSize:15, color:T.text }}>{a.doctorName}</div>
                                  <div style={{ fontSize:13, color:T.primary, fontWeight:600 }}>{a.doctorSpecialty}</div>
                                </div>
                                <Badge status={a.status} />
                              </div>
                              {a.clinicName && (
                                <div style={{ fontSize:12, color:T.text, fontWeight:600, marginTop:6 }}>
                                  {isOnline?"💻":"🏥"} {a.clinicName}
                                </div>
                              )}
                              {!isOnline && a.clinicAddress && (
                                <div style={{ fontSize:11, color:T.muted }}>📍 {a.clinicAddress}</div>
                              )}
                              <div style={{ display:"flex", gap:14, marginTop:6, flexWrap:"wrap" }}>
                                <span style={{ fontSize:12, color:T.muted }}>
                                  📅 {a.date && new Date(a.date+"T00:00:00").toLocaleDateString("en-PK",{weekday:"short",month:"short",day:"numeric"})}
                                </span>
                                <span style={{ fontSize:12, color:T.muted }}>🕐 {formatTime(a.slot)}</span>
                                {a.clinicFee > 0 && (
                                  <span style={{ fontSize:12, fontWeight:700, color:isOnline?"#16a34a":T.primary }}>
                                    PKR {Number(a.clinicFee).toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {a.reason && <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>📝 {a.reason}</div>}
                              {a.paymentReceipt && (
                                <div style={{ marginTop:8, padding:"8px 12px", background:"#f0fdf4",
                                  borderRadius:8, border:"1.5px solid #86efac", display:"inline-flex",
                                  alignItems:"center", gap:8 }}>
                                  <span>💳</span>
                                  <span style={{ fontSize:12, fontWeight:600, color:"#16a34a" }}>Receipt Uploaded</span>
                                  <button onClick={() => setReceiptModal(a.paymentReceipt)}
                                    style={{ fontSize:11, color:T.primary, background:"none", border:"none",
                                      cursor:"pointer", fontWeight:600, textDecoration:"underline" }}>
                                    View
                                  </button>
                                </div>
                              )}
                            </div>
                            {(a.status==="confirmed"||a.status==="pending") && (
                              <button onClick={() => handleCancel(a.id)}
                                style={{ padding:"7px 14px", background:"#fef2f2", color:"#EF4444",
                                  border:"1.5px solid #EF4444", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Receipt Modal */}
      {receiptModal && (
        <div onClick={() => setReceiptModal(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", borderRadius:16, padding:20, maxWidth:600, width:"100%",
              maxHeight:"85vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:16, color:T.text }}>💳 Payment Receipt</div>
              <button onClick={() => setReceiptModal(null)}
                style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:T.muted, lineHeight:1 }}>×</button>
            </div>
            {receiptModal.startsWith("data:image") ? (
              <img src={receiptModal} alt="Payment Receipt"
                style={{ width:"100%", borderRadius:8, border:`1px solid ${T.border}` }} />
            ) : receiptModal.startsWith("data:application/pdf") ? (
              <iframe src={receiptModal} style={{ width:"100%", height:500, border:"none", borderRadius:8 }} title="Receipt" />
            ) : (
              <div style={{ textAlign:"center", padding:40, color:T.muted }}>Cannot preview this file type.</div>
            )}
            <button onClick={() => setReceiptModal(null)}
              style={{ marginTop:16, width:"100%", padding:"11px", background:T.primary, color:"#fff",
                border:"none", borderRadius:10, fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

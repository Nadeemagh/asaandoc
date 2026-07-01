// src/pages/DoctorDashboard.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Card, StatCard, Toast, Spinner } from "../components/UI";
import { getAppointmentsByDoctor, updateAppointmentStatus, getDoctors, updateDoctorSchedule, updateDoctorProfile, addHoliday, removeHoliday } from "../firebase/services";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../firebase/services";

const today = new Date();
const fmtDate = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ALL_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const ALL_SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00","22:30"];

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
};

const fmtDateLong = (d) => {
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-PK", { weekday:"short", year:"numeric", month:"short", day:"numeric" }); }
  catch { return d; }
};

// ─── PDF GENERATORS ───────────────────────────────────────────────
const generateDailyReportPDF = (appointments, doctor, date) => {
  const dateStr = new Date(date + "T00:00:00").toLocaleDateString("en-PK", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const rows = appointments.map((a, i) => `
    <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${i+1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${a.patientName||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${a.patientEmail||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${formatTime(a.slot)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${a.clinicName||a.type||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${a.reason||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#218EB6">${a.clinicFee>0?`PKR ${Number(a.clinicFee).toLocaleString()}`:"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">
        <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
          background:${a.status==='completed'?'#e6faf5':a.status==='confirmed'?'#e0f2fe':'#fffbeb'};
          color:${a.status==='completed'?'#00C897':a.status==='confirmed'?'#0369a1':'#F59E0B'}">${a.status?.toUpperCase()}</span>
      </td>
    </tr>`).join("");
  const totalFee = appointments.reduce((s,a)=>s+Number(a.clinicFee||0),0);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Daily Report</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;color:#1a2e3b;}
  .page{padding:40px;max-width:1100px;margin:0 auto;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head>
  <body><div class="page">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #218EB6">
    <div><div style="font-size:28px;font-weight:900;color:#218EB6">AsaanDoc</div><div style="font-size:12px;color:#6a8a9a">صحت کا آسان راستہ</div></div>
    <div style="text-align:right"><div style="font-size:18px;font-weight:800">Daily Report</div>
    <div style="font-size:13px;color:#6a8a9a">${dateStr}</div>
    <div style="font-size:13px;color:#218EB6;font-weight:600">Dr. ${doctor?.name||"—"}</div></div></div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead><tr style="background:#218EB6">${["#","Patient","Email","Time","Clinic","Reason","Fee","Status"].map(h=>`<th style="padding:12px;text-align:left;color:#fff;font-size:12px">${h}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody></table>
  <div style="display:flex;justify-content:flex-end">
    <div style="padding:16px 24px;background:#218EB6;border-radius:10px;color:#fff;text-align:right">
      <div style="font-size:12px;opacity:0.8">Total Collection</div>
      <div style="font-size:24px;font-weight:900">PKR ${totalFee.toLocaleString()}</div></div></div>
  </div></body></html>`;
  const win = window.open("","_blank"); win.document.write(html); win.document.close(); setTimeout(()=>win.print(),500);
};

const generateInvoicePDF = (appointment, doctor) => {
  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
  const issueDate = new Date().toLocaleDateString("en-PK",{year:"numeric",month:"long",day:"numeric"});
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${invoiceNo}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;color:#1a2e3b;}
  .page{padding:50px;max-width:800px;margin:0 auto;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head>
  <body><div class="page">
  <div style="background:linear-gradient(135deg,#218EB6,#155f7a);padding:30px;border-radius:12px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center">
    <div><div style="color:#fff;font-size:30px;font-weight:900">AsaanDoc</div><div style="color:rgba(255,255,255,0.7);font-size:13px">صحت کا آسان راستہ</div></div>
    <div style="text-align:right"><div style="color:#fff;font-size:28px;font-weight:900">INVOICE</div>
    <div style="color:rgba(255,255,255,0.8);font-size:14px">${invoiceNo}</div><div style="color:rgba(255,255,255,0.7);font-size:12px">${issueDate}</div></div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
    <div style="padding:20px;background:#f8fafc;border-radius:10px;border-left:4px solid #218EB6">
      <div style="font-size:11px;font-weight:700;color:#6a8a9a;text-transform:uppercase;margin-bottom:10px">From (Doctor)</div>
      <div style="font-weight:800;font-size:16px">${doctor?.name||"—"}</div>
      <div style="font-size:13px;color:#218EB6;font-weight:600">${doctor?.specialty||""}</div>
      <div style="font-size:12px;color:#6a8a9a;margin-top:6px">🏥 ${appointment.clinicName||"—"}</div>
      <div style="font-size:12px;color:#6a8a9a">📍 ${appointment.clinicAddress||"—"}</div></div>
    <div style="padding:20px;background:#f8fafc;border-radius:10px;border-left:4px solid #00C897">
      <div style="font-size:11px;font-weight:700;color:#6a8a9a;text-transform:uppercase;margin-bottom:10px">Bill To (Patient)</div>
      <div style="font-weight:800;font-size:16px">${appointment.patientName||"—"}</div>
      <div style="font-size:12px;color:#6a8a9a">📧 ${appointment.patientEmail||"—"}</div></div></div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead><tr style="background:#218EB6">${["Description","Date","Time","Type","Amount"].map(h=>`<th style="padding:12px 16px;text-align:left;color:#fff;font-size:12px">${h}</th>`).join("")}</tr></thead>
    <tbody><tr style="background:#f8fafc">
      <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0"><div style="font-weight:700">Medical Consultation</div><div style="font-size:12px;color:#6a8a9a">${appointment.reason||"General"}</div></td>
      <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px">${formatDate(appointment.date)}</td>
      <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px">${formatTime(appointment.slot)}</td>
      <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px">${appointment.type==="Online"?"💻 Online":"🏥 In Person"}</td>
      <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:800;color:#218EB6">PKR ${Number(appointment.clinicFee||0).toLocaleString()}</td></tr></tbody></table>
  <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
    <div style="min-width:260px">
      <div style="display:flex;justify-content:space-between;padding:14px 16px;background:#218EB6;border-radius:8px;color:#fff">
        <span style="font-weight:700;font-size:15px">TOTAL</span><span style="font-weight:900;font-size:18px">PKR ${Number(appointment.clinicFee||0).toLocaleString()}</span></div></div></div>
  <div style="padding:14px 20px;background:#e6faf5;border-radius:10px;border:1.5px solid #00C897;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:700;color:#00C897">✅ PAYMENT RECEIVED</span><span style="font-size:12px;color:#6a8a9a">${issueDate}</span></div>
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;color:#6a8a9a;font-size:11px">
    <div style="font-weight:700;color:#218EB6">AsaanDoc · asaandoc.com</div>
    <div>Invoice: ${invoiceNo} · Generated: ${new Date().toLocaleString("en-PK")}</div></div>
  </div></body></html>`;
  const win = window.open("","_blank"); win.document.write(html); win.document.close(); setTimeout(()=>win.print(),500);
};

// ─── MANAGE SCHEDULE COMPONENT ────────────────────────────────────
function ManageSchedule({ doctor, onUpdate, showToast }) {
  const [clinics, setClinics] = useState(() => doctor?.clinics ? JSON.parse(JSON.stringify(doctor.clinics)) : []);
  const [holidays, setHolidays] = useState(doctor?.holidays || []);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayReason, setNewHolidayReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeClinic, setActiveClinic] = useState(0);
  const [activeTab, setActiveTab] = useState("clinics");
  const [exp, setExp] = useState(doctor?.exp || "");
  const [services, setServices] = useState(doctor?.services || "");
  const [qualifications, setQualifications] = useState(doctor?.qualifications || "");
  const [photo, setPhoto] = useState(doctor?.photo || "");
  const [photoPreview, setPhotoPreview] = useState(doctor?.photo || "");

  useEffect(() => {
    if (doctor?.clinics) setClinics(JSON.parse(JSON.stringify(doctor.clinics)));
    if (doctor?.holidays) setHolidays(doctor.holidays);
    if (doctor?.exp) setExp(doctor.exp);
    if (doctor?.services) setServices(doctor.services);
    if (doctor?.qualifications) setQualifications(doctor.qualifications);
  }, [doctor]);

  const updateClinicField = (ci, field, val) => {
    const u = JSON.parse(JSON.stringify(clinics));
    u[ci][field] = val;
    setClinics(u);
  };
  const toggleDay = (ci, day) => {
    const u = JSON.parse(JSON.stringify(clinics));
    const days = u[ci].days || [];
    u[ci].days = days.includes(day) ? days.filter(d=>d!==day) : [...days,day];
    setClinics(u);
  };
  const toggleSlot = (ci, slot) => {
    const u = JSON.parse(JSON.stringify(clinics));
    const slots = u[ci].slots || [];
    u[ci].slots = slots.includes(slot) ? slots.filter(s=>s!==slot) : [...slots,slot].sort();
    setClinics(u);
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await updateDoctorSchedule(doctor.id, clinics);
      await onUpdate();
      showToast("Schedule saved! ✅");
      setTimeout(() => window.location.reload(), 1500);
    } catch { showToast("Failed to save.", "error"); }
    setSaving(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateDoctorProfile(doctor.id, { exp, services, qualifications, photo });
      await onUpdate();
      showToast("Profile saved! ✅");
      setTimeout(() => window.location.reload(), 1500);
    } catch { showToast("Failed to save.", "error"); }
    setSaving(false);
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate) return;
    setSaving(true);
    try {
      await addHoliday(doctor.id, newHolidayDate, newHolidayReason);
      setHolidays(prev=>[...prev,{date:newHolidayDate,reason:newHolidayReason||"Holiday"}]);
      setNewHolidayDate(""); setNewHolidayReason("");
      showToast("Holiday marked! ✅");
    } catch { showToast("Failed.","error"); }
    setSaving(false);
  };

  const handleRemoveHoliday = async (date) => {
    setSaving(true);
    try {
      await removeHoliday(doctor.id, date);
      setHolidays(prev=>prev.filter(h=>h.date!==date));
      showToast("Holiday removed.");
    } catch { showToast("Failed.","error"); }
    setSaving(false);
  };

  const addClinic = () => {
    const newClinic = { name:"", address:"", fee:0, days:[], slots:[], startTime:"09:00", endTime:"17:00", isOnline:false };
    setClinics(prev => { const u=[...prev,newClinic]; return u; });
    setActiveClinic(clinics.length);
  };

  return (
    <div>
      <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800,color:T.text}}>⚙️ Manage Schedule</h2>

      {/* Main Tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20,borderBottom:`2px solid ${T.border}`,paddingBottom:12}}>
        {[["clinics","🏥","Clinic Schedule"],["profile","👨","Profile & Services"],["holidays","🏖️","Holidays"]].map(([tab,icon,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{padding:"9px 18px",borderRadius:10,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
              background:activeTab===tab?T.primary:"transparent",color:activeTab===tab?"#fff":T.muted}}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* CLINIC SCHEDULE */}
      {activeTab === "clinics" && (
        <div>
          {/* No clinics yet */}
          {clinics.length === 0 && (
            <div style={{padding:"28px",textAlign:"center",background:"#f0f9ff",border:"2px dashed #218EB6",borderRadius:14,marginBottom:20}}>
              <div style={{fontSize:48,marginBottom:12}}>🏥</div>
              <h3 style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>No Clinics Added Yet</h3>
              <p style={{color:T.muted,fontSize:13,marginBottom:20}}>Add your clinic locations where patients can book appointments.</p>
              <button onClick={addClinic}
                style={{padding:"12px 24px",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer"}}>
                + Add First Clinic
              </button>
            </div>
          )}

          {/* Clinic tabs */}
          {clinics.length > 0 && (
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
              {clinics.map((c,i)=>(
                <button key={i} onClick={()=>setActiveClinic(i)}
                  style={{padding:"8px 16px",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer",
                    border:`2px solid ${activeClinic===i?T.primary:T.border}`,
                    background:activeClinic===i?T.primaryLight:T.white,
                    color:activeClinic===i?T.primary:T.muted}}>
                  {c.isOnline?"💻":"🏥"} {c.name?.split(" ").slice(0,2).join(" ")||`Clinic ${i+1}`}
                </button>
              ))}
              <button onClick={addClinic}
                style={{padding:"8px 16px",borderRadius:10,fontWeight:600,fontSize:13,cursor:"pointer",
                  border:`2px dashed ${T.border}`,background:T.white,color:T.muted}}>
                + Add Clinic
              </button>
            </div>
          )}

          {clinics[activeClinic] && (
            <Card style={{marginBottom:20}}>
              {/* Clinic Name */}
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Clinic Name</label>
                <input value={clinics[activeClinic].name||""} onChange={e=>updateClinicField(activeClinic,"name",e.target.value)}
                  placeholder="e.g. City Medical Center"
                  style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none",fontFamily:"inherit"}}/>
              </div>

              {/* Online Toggle */}
              <div style={{marginBottom:16,padding:"12px 14px",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between",
                background:clinics[activeClinic].isOnline?"#f0fdf4":"#f8fafc",
                border:`1.5px solid ${clinics[activeClinic].isOnline?"#86efac":T.border}`}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13,color:T.text}}>💻 Online Consultation</div>
                  <div style={{fontSize:11,color:T.muted}}>Enable if patients can book online sessions</div>
                </div>
                <button onClick={()=>updateClinicField(activeClinic,"isOnline",!clinics[activeClinic].isOnline)}
                  style={{padding:"7px 16px",borderRadius:20,fontWeight:700,fontSize:12,cursor:"pointer",border:"none",
                    background:clinics[activeClinic].isOnline?"#EF4444":"#16a34a",color:"#fff"}}>
                  {clinics[activeClinic].isOnline?"Disable":"Enable"}
                </button>
              </div>

              {/* Address - only for in-person */}
              {!clinics[activeClinic].isOnline && (
                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Clinic Address</label>
                  <input value={clinics[activeClinic].address||""} onChange={e=>updateClinicField(activeClinic,"address",e.target.value)}
                    placeholder="e.g. 24 Block A, Johar Town, Lahore"
                    style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none",fontFamily:"inherit"}}/>
                </div>
              )}

              {/* Fee */}
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Consultation Fee (PKR)</label>
                <input type="number" value={clinics[activeClinic].fee||""} onChange={e=>updateClinicField(activeClinic,"fee",parseInt(e.target.value)||0)}
                  style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:200,outline:"none"}}/>
              </div>

              {/* Times */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Start Time</label>
                  <select value={clinics[activeClinic].startTime||"09:00"} onChange={e=>updateClinicField(activeClinic,"startTime",e.target.value)}
                    style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none"}}>
                    {ALL_SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>End Time</label>
                  <select value={clinics[activeClinic].endTime||"17:00"} onChange={e=>updateClinicField(activeClinic,"endTime",e.target.value)}
                    style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none"}}>
                    {ALL_SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Days */}
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Available Days</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {ALL_DAYS.map(day=>{
                    const active=clinics[activeClinic].days?.includes(day);
                    return <button key={day} onClick={()=>toggleDay(activeClinic,day)}
                      style={{padding:"8px 16px",borderRadius:20,fontWeight:700,fontSize:13,cursor:"pointer",
                        border:`2px solid ${active?T.primary:T.border}`,background:active?T.primary:T.white,color:active?"#fff":T.muted}}>{day}</button>;
                  })}
                </div>
              </div>

              {/* Slots */}
              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Time Slots</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8}}>
                  {ALL_SLOTS.map(slot=>{
                    const active=clinics[activeClinic].slots?.includes(slot);
                    const hour=parseInt(slot.split(":")[0]);
                    const lbl=`${hour%12||12}:${slot.split(":")[1]} ${hour>=12?"PM":"AM"}`;
                    return <button key={slot} onClick={()=>toggleSlot(activeClinic,slot)}
                      style={{padding:"8px 6px",borderRadius:8,fontWeight:600,fontSize:12,cursor:"pointer",
                        border:`2px solid ${active?T.primary:T.border}`,background:active?T.primaryLight:T.white,color:active?T.primary:T.muted}}>{lbl}</button>;
                  })}
                </div>
              </div>

              <div style={{display:"flex",gap:10}}>
                <button onClick={saveSchedule} disabled={saving}
                  style={{flex:1,padding:"13px",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
                    color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}>
                  {saving?"Saving...":"💾 Save Clinic Schedule"}
                </button>
                {clinics.length > 1 && (
                  <button onClick={()=>{
                    if(!window.confirm("Remove this clinic?")) return;
                    const u=JSON.parse(JSON.stringify(clinics));
                    u.splice(activeClinic,1);
                    setClinics(u);
                    setActiveClinic(Math.max(0,activeClinic-1));
                  }}
                    style={{padding:"13px 20px",background:"#fef2f2",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    🗑️ Remove
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* PROFILE */}
      {activeTab === "profile" && (
        <Card style={{marginBottom:20}}>
          <h3 style={{margin:"0 0 20px",fontSize:15,fontWeight:700,color:T.text}}>👨 Profile & Services</h3>

          {/* Photo Upload */}
          <div style={{marginBottom:24,padding:16,background:T.bg,borderRadius:12,border:`1.5px solid ${T.border}`}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>Profile Photo</label>
            <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              {photoPreview
                ?<img src={photoPreview} alt="Profile" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.primary}`}}/>
                :<div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:28}}>{doctor?.avatar||"DR"}</div>}
              <div>
                <label htmlFor="photoUpload" style={{display:"inline-block",padding:"10px 20px",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,color:"#fff",borderRadius:9,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>
                  📷 Upload Photo
                </label>
                <input id="photoUpload" type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 500000) { alert("Photo must be under 500KB!"); return; }
                  const reader = new FileReader();
                  reader.onload = (ev) => { setPhoto(ev.target.result); setPhotoPreview(ev.target.result); };
                  reader.readAsDataURL(file);
                }}/>
                <div style={{fontSize:11,color:T.muted}}>Max 500KB · JPG or PNG</div>
                {photoPreview && <button onClick={()=>{setPhoto("");setPhotoPreview("");}} style={{marginTop:6,padding:"4px 10px",background:"#fef2f2",color:"#EF4444",border:"1px solid #EF4444",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>Remove Photo</button>}
              </div>
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Years of Experience</label>
            <input type="number" value={exp} onChange={e=>setExp(e.target.value)} placeholder="e.g. 25"
              style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:150,outline:"none"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Qualifications</label>
            <textarea value={qualifications} onChange={e=>setQualifications(e.target.value)} rows={4}
              placeholder="e.g. MBBS, FCPS (Medicine)"
              style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none",fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Services (one per line)</label>
            <textarea value={services} onChange={e=>setServices(e.target.value)} rows={6}
              placeholder="Diabetes Management&#10;Thyroid Disorders&#10;Blood Sugar Control"
              style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none",fontFamily:"inherit",resize:"vertical"}}/>
          </div>
          {(qualifications||services) && (
            <div style={{padding:"16px",background:T.bg,borderRadius:10,marginBottom:20,border:`1.5px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,color:T.muted,marginBottom:10,textTransform:"uppercase"}}>Preview</div>
              {qualifications && <div style={{marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>🎓 Qualifications</div>
                {qualifications.split("\n").filter(q=>q.trim()).map((q,i)=><div key={i} style={{fontSize:12,color:T.muted}}>• {q}</div>)}
              </div>}
              {services && <div>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:6}}>🩺 Services</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {services.split("\n").filter(s=>s.trim()).map((s,i)=><span key={i} style={{padding:"4px 10px",background:T.primaryLight,color:T.primary,borderRadius:20,fontSize:12,fontWeight:600}}>{s.trim()}</span>)}
                </div>
              </div>}
            </div>
          )}
          <button onClick={saveProfile} disabled={saving}
            style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
              color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}>
            {saving?"Saving...":"💾 Save Profile & Services"}
          </button>
        </Card>
      )}

      {/* HOLIDAYS */}
      {activeTab === "holidays" && (
        <Card>
          <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:T.text}}>🏖️ Mark Holidays / Days Off</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,marginBottom:20,alignItems:"end"}}>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Date</label>
              <input type="date" value={newHolidayDate} onChange={e=>setNewHolidayDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none"}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Reason</label>
              <input value={newHolidayReason} onChange={e=>setNewHolidayReason(e.target.value)} placeholder="e.g. Eid, Conference..."
                style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,width:"100%",outline:"none",fontFamily:"inherit"}}/>
            </div>
            <button onClick={handleAddHoliday} disabled={!newHolidayDate||saving}
              style={{padding:"10px 20px",background:!newHolidayDate?"#ccc":"#EF4444",color:"#fff",border:"none",borderRadius:9,fontWeight:700,fontSize:13,cursor:!newHolidayDate?"not-allowed":"pointer"}}>
              🚫 Mark Off
            </button>
          </div>
          {holidays.length === 0
            ? <div style={{textAlign:"center",padding:"24px 0",color:T.muted,fontSize:13}}>No holidays marked.</div>
            : <div style={{display:"grid",gap:8}}>
                {holidays.sort((a,b)=>a.date.localeCompare(b.date)).map((h,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:"#fef2f2",border:"1.5px solid #EF4444"}}>
                    <span style={{fontSize:20}}>🚫</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,color:T.text}}>{fmtDateLong(h.date)}</div>
                      <div style={{fontSize:12,color:"#EF4444",fontWeight:600}}>{h.reason}</div>
                    </div>
                    <button onClick={()=>handleRemoveHoliday(h.date)}
                      style={{padding:"5px 12px",background:"#fff",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
          }
        </Card>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────
export default function DoctorDashboard() {
  const { profile, user } = useAuth();
  const [view, setView] = useState("dashboard");
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedDate, setSelectedDate] = useState(fmtDate(today));
  const [filterStatus, setFilterStatus] = useState("All");
  const [reportDate, setReportDate] = useState(fmtDate(today));
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [receiptModal, setReceiptModal] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const allDoctors = await getDoctors();
      const myDoc = allDoctors.find(d =>
        d.id === profile?.doctorId ||
        d.email === user?.email ||
        d.name?.toLowerCase() === profile?.name?.toLowerCase()
      ) || null;
      setDoctor(myDoc);
      if (myDoc) {
        const appts = await getAppointmentsByDoctor(myDoc.id);
        setAppointments(appts);
      }
    } catch(e) {
      console.error("Load error:",e);
      showToast("Failed to load data.","error");
    }
    setLoadingData(false);
  }, [profile, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-switch new doctors to manage schedule
  useEffect(() => {
    if (doctor !== null && (!doctor.clinics || doctor.clinics.length === 0)) {
      setView("manage");
    }
  }, [doctor]);

  const handleUpdateStatus = async (id, status, appointment) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev=>prev.map(a=>a.id===id?{...a,status}:a));
      const msgs = { confirmed:"Confirmed ✓", completed:"Completed ✓", cancelled:"Declined." };
      showToast(msgs[status]||"Updated.");
      if (status==="completed"&&appointment) {
        setTimeout(()=>{ if(window.confirm("Generate invoice?")) generateInvoicePDF(appointment,doctor); },500);
      }
    } catch { showToast("Failed.","error"); }
  };

  const todayStr = fmtDate(today);
  const todayAppts = appointments.filter(a=>a.date===todayStr);
  const upcoming = appointments.filter(a=>a.date>todayStr&&a.status!=="cancelled");
  const pending = appointments.filter(a=>a.status==="pending");
  const completed = appointments.filter(a=>a.status==="completed");
  const dayAppts = appointments.filter(a=>a.date===selectedDate);
  const filteredAll = filterStatus==="All"?appointments:appointments.filter(a=>a.status===filterStatus);
  const reportAppts = appointments.filter(a=>a.date===reportDate);
  const getP = (a) => a.patientName||a.patientEmail?.split("@")[0]||"Unknown";

  const nav = [
    ["dashboard","📊","Dashboard"],
    ["schedule","📅","Schedule"],
    ["patients","👥","Appointments"],
    ["report","📄","Daily Report"],
    ["manage","⚙️","Manage Schedule"],
    ["stats","📈","Analytics"],
  ];

  if (loadingData) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}><Spinner/><div style={{color:T.muted,fontSize:14,marginTop:12}}>Loading...</div></div>
    </div>
  );

  if (!doctor) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{textAlign:"center",maxWidth:400,padding:40}}>
        <div style={{fontSize:64,marginBottom:16}}>👨‍⚕️</div>
        <h2 style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:12}}>Welcome, {profile?.name}!</h2>
        <p style={{color:T.muted,fontSize:14,marginBottom:24}}>Your profile is being set up. Please refresh in a moment.</p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <button onClick={loadData} style={{padding:"12px 24px",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer"}}>🔄 Refresh</button>
          <button onClick={logoutUser} style={{padding:"12px 24px",background:"#fff",color:T.primary,border:`2px solid ${T.primary}`,borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer"}}>Sign Out</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"Inter,system-ui,sans-serif",background:T.bg}}>

      {/* Mobile overlay */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div onClick={()=>setSidebarOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9}}/>
      )}

      {/* SIDEBAR */}
      <div style={{
        width: sidebarOpen ? 230 : (window.innerWidth <= 768 ? 0 : 64),
        minWidth: sidebarOpen ? 230 : (window.innerWidth <= 768 ? 0 : 64),
        background:`linear-gradient(180deg,${T.primaryDark},#0a3d52)`,
        display:"flex", flexDirection:"column", flexShrink:0, transition:"width 0.25s, min-width 0.25s",
        overflow:"hidden", boxShadow:"4px 0 20px rgba(0,0,0,0.15)",
        position: window.innerWidth <= 768 ? "fixed" : "relative",
        top:0, left:0, bottom:0, zIndex:10,
        height: window.innerWidth <= 768 ? "100vh" : "auto"
      }}>
        <div style={{padding:"18px 14px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:sidebarOpen?16:0}}>
            {sidebarOpen?<img src="/logo.png" alt="AsaanDoc" style={{height:32,filter:"brightness(0) invert(1)"}} onError={e=>{e.target.style.display="none";}}/>
              :<span style={{fontSize:24}}>🏥</span>}
            {sidebarOpen&&<div style={{color:"rgba(255,255,255,0.45)",fontSize:10}}>Doctor Portal</div>}
          </div>
          {sidebarOpen&&doctor&&(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 8px",background:"rgba(255,255,255,0.07)",borderRadius:10}}>
              {doctor.photo
                ?<img src={doctor.photo} alt={doctor.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,0.3)",flexShrink:0}} onError={e=>{e.target.style.display="none";}}/>
                :<div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:14,flexShrink:0}}>{doctor.avatar||"DR"}</div>}
              <div style={{minWidth:0}}>
                <div style={{color:"#fff",fontWeight:700,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{profile?.name||doctor.name}</div>
                <div style={{color:"rgba(255,255,255,0.5)",fontSize:10}}>{doctor.specialty}</div>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"10px 8px",flex:1}}>
          {nav.map(([v,icon,label])=>(
            <button key={v} onClick={()=>{ setView(v); if(window.innerWidth<=768) setSidebarOpen(false); }}
              style={{width:"100%",padding:"11px 10px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:4,
                textAlign:"left",display:"flex",alignItems:"center",gap:10,whiteSpace:"nowrap",
                background:view===v?"rgba(255,255,255,0.15)":"transparent",
                color:view===v?"#fff":"rgba(255,255,255,0.55)",fontWeight:600,fontSize:13}}>
              <span style={{fontSize:16,flexShrink:0}}>{icon}</span>{sidebarOpen&&label}
            </button>
          ))}
        </div>
        <div style={{padding:"10px 8px 16px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          {sidebarOpen&&doctor?.clinics?.length>0&&(
            <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.07)",borderRadius:10,marginBottom:8}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginBottom:3}}>Fees from</div>
              <div style={{fontSize:17,fontWeight:800,color:"#fff"}}>
                PKR {Math.min(...doctor.clinics.filter(c=>!c.isOnline).map(c=>Number(c.fee)||0).filter(f=>f>0)).toLocaleString()}
              </div>
            </div>
          )}
          <button onClick={logoutUser}
            style={{width:"100%",padding:"9px 10px",borderRadius:10,border:"1.5px solid rgba(255,255,255,0.2)",
              background:"transparent",color:"rgba(255,255,255,0.6)",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            <span>🚪</span>{sidebarOpen&&"Sign Out"}
          </button>
        </div>
        <button onClick={()=>setSidebarOpen(o=>!o)}
          style={{position:"absolute",top:18,right:-12,width:24,height:24,borderRadius:"50%",
            background:T.primary,border:`2px solid ${T.primaryDark}`,color:"#fff",fontSize:12,
            cursor:"pointer",display: window.innerWidth<=768?"none":"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>
          {sidebarOpen?"‹":"›"}
        </button>
      </div>

      {/* MAIN */}
      <div style={{flex:1,overflow:"auto"}}>
        <div style={{background:T.white,padding:"14px 24px",borderBottom:`1px solid ${T.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)",position:"sticky",top:0,zIndex:9}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Hamburger for mobile */}
          <button onClick={()=>setSidebarOpen(o=>!o)}
            style={{display: window.innerWidth<=768?"flex":"none", alignItems:"center",justifyContent:"center",
              width:38,height:38,borderRadius:10,border:`1.5px solid ${T.border}`,
              background:T.white,cursor:"pointer",fontSize:18,color:T.text}}>
            ☰
          </button>
          <div>
            <div style={{fontWeight:800,fontSize:18,color:T.text}}>
              {view==="dashboard"&&"Dashboard"}{view==="schedule"&&"My Schedule"}
              {view==="patients"&&"All Appointments"}{view==="report"&&"Daily Report"}
              {view==="manage"&&"Manage Schedule"}{view==="stats"&&"Analytics"}
            </div>
            <div style={{fontSize:12,color:T.muted}}>{new Date().toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
        </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {pending.length>0&&<div style={{padding:"5px 12px",background:"#fffbeb",color:"#F59E0B",borderRadius:20,fontSize:12,fontWeight:700,border:"1.5px solid #F59E0B"}}>🔔 {pending.length} Pending</div>}
            <button onClick={loadData} style={{padding:"7px 14px",background:T.primaryLight,color:T.primary,border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>🔄 Refresh</button>
          </div>
        </div>

        <div style={{padding:"24px"}}>

          {/* DASHBOARD */}
          {view==="dashboard"&&(
            <div>
              <div style={{marginBottom:22}}>
                <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:T.text}}>
                  Good {new Date().getHours()<12?"Morning":new Date().getHours()<17?"Afternoon":"Evening"}, Dr. {(doctor?.name||profile?.name||"Doctor").split(" ")[0]} 👋
                </h2>
                <p style={{margin:0,color:T.muted,fontSize:13}}>Here's your appointments overview.</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:16}}>
                <StatCard label="Today"    value={todayAppts.length} icon="📅" color={T.primary} sub="appointments"/>
                <StatCard label="Upcoming" value={upcoming.length}   icon="⏳" color={T.accent}  sub="confirmed"/>
                <StatCard label="Pending"  value={pending.length}    icon="🔔" color={T.warn}    sub="need action"/>
                <StatCard label="Completed" value={completed.length} icon="✅" color="#8B5CF6"   sub="all time"/>
              </div>
              {/* Fee banners */}
              <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginBottom:24}}>
                {[
                  ["Today's Total Fees","linear-gradient(135deg,#16a34a,#15803d)",todayAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0),todayAppts.length+" appointment"+(todayAppts.length!==1?"s":"")],
                  ["Collected Today","linear-gradient(135deg,#218EB6,#155f7a)",todayAppts.filter(a=>a.status==="completed").reduce((s,a)=>s+Number(a.clinicFee||0),0),todayAppts.filter(a=>a.status==="completed").length+" completed"],
                  ["Pending Fees","linear-gradient(135deg,#F59E0B,#d97706)",todayAppts.filter(a=>a.status!=="completed"&&a.status!=="cancelled").reduce((s,a)=>s+Number(a.clinicFee||0),0),"not yet collected"],
                ].map(([lbl,bg,val,sub])=>(
                  <div key={lbl} style={{padding:"16px 20px",borderRadius:12,background:bg,color:"#fff"}}>
                    <div style={{fontSize:11,fontWeight:700,opacity:0.8,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{lbl}</div>
                    <div style={{fontSize:24,fontWeight:900}}>PKR {val.toLocaleString()}</div>
                    <div style={{fontSize:11,opacity:0.75,marginTop:4}}>{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <h3 style={{margin:0,fontSize:15,fontWeight:700,color:T.text}}>📅 Today's Schedule</h3>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:12,color:T.muted}}>{todayAppts.length} appts</span>
                      {todayAppts.length>0&&<button onClick={()=>generateDailyReportPDF(todayAppts,doctor,todayStr)} style={{padding:"4px 10px",background:T.primaryLight,color:T.primary,border:`1px solid ${T.primary}`,borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>📄 PDF</button>}
                    </div>
                  </div>
                  {todayAppts.length===0
                    ?<div style={{textAlign:"center",padding:"28px 0",color:T.muted}}><div style={{fontSize:36,marginBottom:8}}>🌟</div><div style={{fontSize:13}}>No appointments today</div></div>
                    :<div style={{display:"grid",gap:8}}>
                      {todayAppts.sort((a,b)=>a.slot?.localeCompare(b.slot)).map(a=>(
                        <div key={a.id} style={{padding:"12px 13px",borderRadius:10,background:T.bg,borderLeft:`4px solid ${a.status==="confirmed"?T.accent:a.status==="pending"?T.warn:T.border}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:700,fontSize:14,color:T.text}}>{getP(a)}</div>
                              <div style={{fontSize:11,color:T.muted}}>📧 {a.patientEmail||"—"}</div>
                              <div style={{fontSize:11,color:T.muted}}>🕐 {formatTime(a.slot)} · {a.clinicName||a.type}</div>
                              {a.clinicFee>0&&<div style={{fontSize:11,color:T.primary,fontWeight:600}}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                              {a.reason&&<div style={{fontSize:11,color:T.muted}}>📝 {a.reason}</div>}
                              {a.paymentReceipt&&<div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                                <span style={{fontSize:10}}>💳</span>
                                <span style={{fontSize:11,color:"#16a34a",fontWeight:600}}>Receipt uploaded</span>
                                <button onClick={()=>setReceiptModal(a.paymentReceipt)} style={{fontSize:10,color:T.primary,background:"none",border:"none",cursor:"pointer",fontWeight:600,textDecoration:"underline"}}>View</button>
                              </div>}
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                              <Badge status={a.status}/>
                              {a.status==="pending"&&<div style={{display:"flex",gap:4}}>
                                <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)} style={{padding:"3px 8px",background:T.accent,color:"#fff",border:"none",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✓</button>
                                <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)} style={{padding:"3px 8px",background:"#fef2f2",color:"#EF4444",border:"1px solid #EF4444",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>✗</button>
                              </div>}
                              {a.status==="confirmed"&&<button onClick={()=>handleUpdateStatus(a.id,"completed",a)} style={{padding:"3px 8px",background:T.primaryLight,color:T.primary,border:`1px solid ${T.primary}`,borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>Done</button>}
                              {a.status==="completed"&&<button onClick={()=>generateInvoicePDF(a,doctor)} style={{padding:"3px 8px",background:"#f0fdf4",color:"#16a34a",border:"1px solid #16a34a",borderRadius:5,fontSize:10,fontWeight:700,cursor:"pointer"}}>🧾</button>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>}
                </Card>

                <Card>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <h3 style={{margin:0,fontSize:15,fontWeight:700,color:T.text}}>🔔 Pending Approvals</h3>
                    <span style={{fontSize:12,color:T.muted}}>{pending.length} requests</span>
                  </div>
                  {pending.length===0
                    ?<div style={{textAlign:"center",padding:"28px 0",color:T.muted}}><div style={{fontSize:36,marginBottom:8}}>✅</div><div style={{fontSize:13}}>All caught up!</div></div>
                    :<div style={{display:"grid",gap:8,maxHeight:340,overflowY:"auto"}}>
                      {pending.map(a=>(
                        <div key={a.id} style={{padding:"12px 13px",borderRadius:10,background:"#fffbeb",border:"1.5px solid #F59E0B"}}>
                          <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:2}}>{getP(a)}</div>
                          <div style={{fontSize:11,color:T.muted}}>📧 {a.patientEmail||"—"}</div>
                          <div style={{fontSize:11,color:T.muted}}>📅 {formatDate(a.date)} at {formatTime(a.slot)}</div>
                          {a.clinicName&&<div style={{fontSize:11,color:T.muted}}>🏥 {a.clinicName}</div>}
                          {a.clinicFee>0&&<div style={{fontSize:11,color:T.primary,fontWeight:600}}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                          {a.reason&&<div style={{fontSize:11,color:T.muted,marginBottom:8}}>📝 {a.reason}</div>}
                          <div style={{display:"flex",gap:6,marginTop:8}}>
                            <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)} style={{flex:1,padding:"7px",background:T.accent,color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Accept</button>
                            <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)} style={{flex:1,padding:"7px",background:"#fef2f2",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer"}}>✗ Decline</button>
                          </div>
                        </div>
                      ))}
                    </div>}
                </Card>
              </div>

              {upcoming.length>0&&<Card>
                <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:T.text}}>⏳ Upcoming Confirmed ({upcoming.length})</h3>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
                  {upcoming.slice(0,6).map(a=>(
                    <div key={a.id} style={{padding:"12px 14px",borderRadius:10,background:T.bg,border:`1.5px solid ${T.border}`}}>
                      <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:4}}>{getP(a)}</div>
                      <div style={{fontSize:12,color:T.muted}}>📅 {formatDate(a.date)}</div>
                      <div style={{fontSize:12,color:T.muted}}>🕐 {formatTime(a.slot)}</div>
                      {a.clinicName&&<div style={{fontSize:12,color:T.muted}}>🏥 {a.clinicName}</div>}
                      {a.clinicFee>0&&<div style={{fontSize:12,color:T.primary,fontWeight:600}}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              </Card>}
            </div>
          )}

          {/* SCHEDULE */}
          {view==="schedule"&&(
            <div>
              <h2 style={{margin:"0 0 18px",fontSize:18,fontWeight:800,color:T.text}}>Weekly Schedule</h2>
              <div style={{display:"flex",gap:8,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
                {Array.from({length:14},(_,i)=>addDays(today,i-1)).map(d=>{
                  const df=fmtDate(d);
                  const count=appointments.filter(a=>a.date===df&&a.status!=="cancelled").length;
                  return (
                    <button key={df} onClick={()=>setSelectedDate(df)}
                      style={{padding:"10px 12px",borderRadius:12,flexShrink:0,minWidth:64,cursor:"pointer",textAlign:"center",position:"relative",
                        border:`2px solid ${selectedDate===df?T.primary:df===todayStr?T.primary:"#dde8ed"}`,
                        background:selectedDate===df?T.primaryLight:T.white}}>
                      {df===todayStr&&<div style={{position:"absolute",top:4,right:6,width:6,height:6,borderRadius:"50%",background:T.primary}}/>}
                      <div style={{fontSize:11,fontWeight:600,color:selectedDate===df?T.primary:T.muted}}>{DAYS[d.getDay()]}</div>
                      <div style={{fontSize:17,fontWeight:800,color:selectedDate===df?T.primary:T.text}}>{d.getDate()}</div>
                      <div style={{fontSize:10,color:T.muted}}>{count>0?`${count} appt${count>1?"s":""}`:""}</div>
                    </button>
                  );
                })}
              </div>
              <Card>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <h3 style={{margin:0,fontSize:15,fontWeight:700,color:T.text}}>
                    {new Date(selectedDate+"T00:00:00").toLocaleDateString("en-PK",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
                  </h3>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{fontSize:12,color:T.muted}}>{dayAppts.filter(a=>a.status!=="cancelled").length} appointments</div>
                    {dayAppts.length>0&&<button onClick={()=>generateDailyReportPDF(dayAppts,doctor,selectedDate)} style={{padding:"6px 14px",background:T.primary,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>📄 Report</button>}
                  </div>
                </div>
                {dayAppts.length===0
                  ?<div style={{textAlign:"center",padding:"32px 0",color:T.muted}}><div style={{fontSize:32,marginBottom:8}}>📅</div><div>No appointments</div></div>
                  :<div style={{display:"grid",gap:8}}>
                    {dayAppts.sort((a,b)=>a.slot?.localeCompare(b.slot)).map(a=>(
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,
                        border:`1.5px solid ${a.status!=="cancelled"?T.primary:T.border}`,background:a.status!=="cancelled"?T.primaryLight:T.bg}}>
                        <div style={{fontWeight:800,fontSize:14,color:T.primary,minWidth:70}}>{formatTime(a.slot)}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:13,color:T.text}}>{getP(a)}</div>
                          <div style={{fontSize:11,color:T.muted}}>📧 {a.patientEmail||"—"}</div>
                          {a.clinicName&&<div style={{fontSize:11,color:T.muted}}>🏥 {a.clinicName}</div>}
                          {a.clinicFee>0&&<div style={{fontSize:11,color:T.primary,fontWeight:600}}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                          <Badge status={a.status}/>
                          {a.status==="pending"&&<div style={{display:"flex",gap:4}}>
                            <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)} style={{padding:"4px 10px",background:T.accent,color:"#fff",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>Accept</button>
                            <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)} style={{padding:"4px 10px",background:"#fef2f2",color:"#EF4444",border:"1px solid #EF4444",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>Decline</button>
                          </div>}
                          {a.status==="confirmed"&&<button onClick={()=>handleUpdateStatus(a.id,"completed",a)} style={{padding:"4px 10px",background:T.primaryLight,color:T.primary,border:`1px solid ${T.primary}`,borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>Mark Done</button>}
                          {a.status==="completed"&&<button onClick={()=>generateInvoicePDF(a,doctor)} style={{padding:"4px 10px",background:"#f0fdf4",color:"#16a34a",border:"1px solid #16a34a",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>🧾 Invoice</button>}
                        </div>
                      </div>
                    ))}
                  </div>}
              </Card>
            </div>
          )}

          {/* ALL APPOINTMENTS */}
          {view==="patients"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
                <h2 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>All Appointments ({filteredAll.length})</h2>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["All","pending","confirmed","completed","cancelled"].map(s=>(
                    <button key={s} onClick={()=>setFilterStatus(s)}
                      style={{padding:"6px 13px",borderRadius:20,border:`1.5px solid ${filterStatus===s?T.primary:T.border}`,
                        background:filterStatus===s?T.primary:T.white,color:filterStatus===s?"#fff":T.muted,
                        fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>
                      {s} {s!=="All"&&`(${appointments.filter(a=>a.status===s).length})`}
                    </button>
                  ))}
                </div>
              </div>
              {filteredAll.length===0
                ?<Card style={{textAlign:"center",padding:"48px 20px"}}><div style={{fontSize:48,marginBottom:12}}>📋</div><div style={{fontWeight:700,color:T.text}}>No appointments found</div></Card>
                :<div style={{display:"grid",gap:10}}>
                  {filteredAll.sort((a,b)=>b.date?.localeCompare(a.date)).map(a=>(
                    <Card key={a.id} style={{padding:"16px 20px"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
                        <div style={{width:46,height:46,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16,flexShrink:0}}>
                          {getP(a).charAt(0).toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                            <span style={{fontWeight:800,fontSize:16,color:T.text}}>{getP(a)}</span><Badge status={a.status}/>
                          </div>
                          {a.patientEmail&&<div style={{fontSize:12,color:T.primary,fontWeight:600,marginBottom:4}}>📧 {a.patientEmail}</div>}
                          {a.patientPhone&&<div style={{fontSize:12,color:"#16a34a",fontWeight:600,marginBottom:4}}>📱 +92{a.patientPhone}</div>}
                          {a.clinicName&&<div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:4}}>🏥 {a.clinicName}</div>}
                          {a.clinicAddress&&<div style={{fontSize:11,color:T.muted,marginBottom:4}}>📍 {a.clinicAddress}</div>}
                          <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:4}}>
                            <span style={{fontSize:12,color:T.muted}}>📅 {formatDate(a.date)}</span>
                            <span style={{fontSize:12,color:T.muted}}>🕐 {formatTime(a.slot)}</span>
                            <span style={{fontSize:12,color:T.muted}}>{a.type==="Online"?"💻":"🏥"} {a.type}</span>
                            {a.clinicFee>0&&<span style={{fontSize:12,fontWeight:700,color:T.primary}}>PKR {Number(a.clinicFee).toLocaleString()}</span>}
                          </div>
                          {a.reason&&<div style={{fontSize:12,color:T.muted,marginTop:4}}>📝 {a.reason}</div>}
                          {a.paymentReceipt
                            ?<div style={{marginTop:8,padding:"8px 12px",background:"#f0fdf4",borderRadius:8,border:"1.5px solid #86efac",display:"flex",alignItems:"center",gap:10}}>
                              <span>💳</span>
                              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#16a34a"}}>Payment Receipt Uploaded</div>{a.paymentReceiptName&&<div style={{fontSize:11,color:T.muted}}>{a.paymentReceiptName}</div>}</div>
                              <button onClick={()=>setReceiptModal(a.paymentReceipt)} style={{padding:"5px 12px",background:"#16a34a",color:"#fff",border:"none",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer"}}>👁️ View</button>
                            </div>
                            :a.status!=="cancelled"&&<div style={{marginTop:6,fontSize:11,color:T.muted,fontStyle:"italic"}}>⏳ No receipt yet</div>}
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-start"}}>
                          {a.status==="pending"&&<>
                            <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)} style={{padding:"8px 16px",background:T.accent,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Accept</button>
                            <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)} style={{padding:"8px 14px",background:"#fef2f2",color:"#EF4444",border:"1.5px solid #EF4444",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>✗ Decline</button>
                          </>}
                          {a.status==="confirmed"&&<button onClick={()=>handleUpdateStatus(a.id,"completed",a)} style={{padding:"8px 16px",background:T.primaryLight,color:T.primary,border:`1.5px solid ${T.primary}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>✅ Mark Done</button>}
                          {a.status==="completed"&&<button onClick={()=>generateInvoicePDF(a,doctor)} style={{padding:"8px 14px",background:"#f0fdf4",color:"#16a34a",border:"1.5px solid #16a34a",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>🧾 Invoice</button>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>}
            </div>
          )}

          {/* DAILY REPORT */}
          {view==="report"&&(
            <div>
              <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:800,color:T.text}}>📄 Daily Report</h2>
              <Card style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>Select Date</label>
                    <input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)}
                      style={{padding:"10px 14px",borderRadius:9,border:`1.5px solid ${T.border}`,fontSize:14,color:T.text,outline:"none"}}/>
                  </div>
                  <button onClick={()=>generateDailyReportPDF(reportAppts,doctor,reportDate)} disabled={reportAppts.length===0}
                    style={{padding:"12px 24px",background:reportAppts.length>0?`linear-gradient(135deg,${T.primary},${T.primaryDark})`:T.border,
                      color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:reportAppts.length>0?"pointer":"not-allowed"}}>
                    📄 Download PDF
                  </button>
                </div>
              </Card>
              {reportAppts.length>0&&(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12,marginBottom:20}}>
                    <StatCard label="Total" value={reportAppts.length} icon="📋" color={T.primary}/>
                    <StatCard label="Completed" value={reportAppts.filter(a=>a.status==="completed").length} icon="✅" color={T.accent}/>
                    <StatCard label="Confirmed" value={reportAppts.filter(a=>a.status==="confirmed").length} icon="📅" color="#8B5CF6"/>
                    <StatCard label="Total Fees" value={`PKR ${reportAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}`} icon="💰" color="#16a34a"/>
                  </div>
                  <Card>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`}}>
                          {["#","Patient","Email","Time","Clinic","Reason","Fee","Status"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",color:"#fff",fontSize:12,whiteSpace:"nowrap"}}>{h}</th>)}
                        </tr></thead>
                        <tbody>{reportAppts.map((a,i)=>(
                          <tr key={a.id} style={{background:i%2===0?T.bg:T.white}}>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>{i+1}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontWeight:600}}>{getP(a)}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,color:T.muted}}>{a.patientEmail||"—"}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>{formatTime(a.slot)}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,color:T.muted}}>{a.clinicName||"—"}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,color:T.muted}}>{a.reason||"—"}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontWeight:700,color:T.primary}}>{a.clinicFee>0?`PKR ${Number(a.clinicFee).toLocaleString()}`:"—"}</td>
                            <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}><Badge status={a.status}/></td>
                          </tr>
                        ))}</tbody>
                        <tfoot><tr style={{background:T.primaryLight}}>
                          <td colSpan={6} style={{padding:"12px",fontWeight:700,color:T.text}}>Total</td>
                          <td style={{padding:"12px",fontWeight:800,color:T.primary}}>PKR {reportAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}</td>
                          <td></td>
                        </tr></tfoot>
                      </table>
                    </div>
                  </Card>
                </>
              )}
              {reportAppts.length===0&&<Card style={{textAlign:"center",padding:"48px 20px"}}>
                <div style={{fontSize:48,marginBottom:12}}>📋</div>
                <div style={{fontWeight:700,color:T.text,marginBottom:8}}>No appointments on this date</div>
              </Card>}
            </div>
          )}

          {/* MANAGE SCHEDULE */}
          {view==="manage"&&<ManageSchedule doctor={doctor} onUpdate={loadData} showToast={showToast}/>}

          {/* ANALYTICS */}
          {view==="stats"&&(
            <div>
              <h2 style={{margin:"0 0 18px",fontSize:18,fontWeight:800,color:T.text}}>Analytics Overview</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:24}}>
                <StatCard label="Total"     value={appointments.length} icon="📋" color={T.primary}/>
                <StatCard label="Confirmed" value={appointments.filter(a=>a.status==="confirmed").length} icon="✅" color={T.accent}/>
                <StatCard label="Completed" value={completed.length} icon="🎯" color="#8B5CF6"/>
                <StatCard label="Revenue"   value={`PKR ${completed.reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}`} icon="💰" color="#16a34a"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <Card>
                  <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:T.text}}>Status Breakdown</h3>
                  {[["confirmed",T.accent,"Confirmed"],["pending","#F59E0B","Pending"],["completed","#8B5CF6","Completed"],["cancelled","#EF4444","Cancelled"]].map(([st,col,lbl])=>{
                    const cnt=appointments.filter(a=>a.status===st).length;
                    const pct=appointments.length?Math.round(cnt/appointments.length*100):0;
                    return <div key={st} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:600,color:T.text}}>{lbl}</span>
                        <span style={{fontSize:13,fontWeight:700,color:col}}>{cnt} ({pct}%)</span>
                      </div>
                      <div style={{height:8,background:T.bg,borderRadius:10,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:10,background:col,width:`${pct}%`}}/>
                      </div>
                    </div>;
                  })}
                </Card>
                <Card>
                  <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:T.text}}>Revenue by Clinic</h3>
                  {doctor?.clinics?.map((c,i)=>{
                    const rev=completed.filter(a=>a.clinicName===c.name).reduce((s,a)=>s+Number(a.clinicFee||0),0);
                    const total=completed.reduce((s,a)=>s+Number(a.clinicFee||0),0);
                    const pct=total>0?Math.round(rev/total*100):0;
                    return <div key={i} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:600,color:T.text}}>{c.isOnline?"💻":"🏥"} {c.name?.split(" ").slice(0,2).join(" ")}</span>
                        <span style={{fontSize:12,fontWeight:700,color:T.primary}}>PKR {rev.toLocaleString()}</span>
                      </div>
                      <div style={{height:6,background:T.bg,borderRadius:10,overflow:"hidden"}}>
                        <div style={{height:"100%",borderRadius:10,background:T.primary,width:`${pct}%`}}/>
                      </div>
                    </div>;
                  })}
                </Card>
              </div>
              {doctor&&<Card>
                <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:T.text}}>My Profile</h3>
                <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
                  {doctor.photo
                    ?<img src={doctor.photo} alt={doctor.name} style={{width:70,height:70,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.primary}`,flexShrink:0}} onError={e=>{e.target.style.display="none";}}/>
                    :<div style={{width:70,height:70,borderRadius:"50%",background:doctor.color||T.primary,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:24,flexShrink:0}}>{doctor.avatar||"DR"}</div>}
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:17,color:T.text}}>{profile?.name||doctor.name}</div>
                    <div style={{fontSize:14,color:T.primary,fontWeight:600}}>{doctor.specialty}</div>
                    <div style={{fontSize:13,color:T.muted,marginTop:4}}>⏳ {doctor.exp} years experience</div>
                    {doctor.clinics&&Array.isArray(doctor.clinics)&&<div style={{marginTop:10}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>🏥 Clinics:</div>
                      {doctor.clinics.map((c,i)=>(
                        <div key={i} style={{padding:"8px 12px",background:T.bg,borderRadius:8,marginBottom:6,borderLeft:`3px solid ${c.isOnline?"#16a34a":T.primary}`}}>
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <div style={{fontWeight:600,fontSize:12,color:T.text}}>{c.isOnline?"💻":"🏥"} {c.name}</div>
                            <div style={{fontSize:12,fontWeight:700,color:T.primary}}>PKR {Number(c.fee).toLocaleString()}</div>
                          </div>
                          {!c.isOnline&&<div style={{fontSize:11,color:T.muted}}>📍 {c.address}</div>}
                          <div style={{fontSize:11,color:T.muted}}>📅 {Array.isArray(c.days)?(c.days.length===7?"Every Day":c.days.join(", ")):c.days}{c.startTime&&` · 🕐 ${formatTime(c.startTime)} – ${formatTime(c.endTime)}`}</div>
                        </div>
                      ))}
                    </div>}
                  </div>
                </div>
              </Card>}
            </div>
          )}

        </div>
      </div>

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {receiptModal&&(
        <div onClick={()=>setReceiptModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:24,maxWidth:640,width:"100%",maxHeight:"88vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:16,color:T.text}}>💳 Payment Receipt</div>
              <button onClick={()=>setReceiptModal(null)} style={{background:"none",border:"none",fontSize:26,cursor:"pointer",color:T.muted}}>×</button>
            </div>
            {receiptModal.startsWith("data:image")
              ?<img src={receiptModal} alt="Receipt" style={{width:"100%",borderRadius:8,border:`1px solid ${T.border}`}}/>
              :receiptModal.startsWith("data:application/pdf")
              ?<iframe src={receiptModal} style={{width:"100%",height:520,border:"none",borderRadius:8}} title="Receipt"/>
              :<div style={{textAlign:"center",padding:40,color:T.muted}}>Cannot preview.</div>}
            <button onClick={()=>setReceiptModal(null)} style={{marginTop:16,width:"100%",padding:"11px",background:T.primary,color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

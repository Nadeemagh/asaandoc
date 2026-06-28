// src/pages/DoctorDashboard.js
import { useState, useEffect, useCallback } from "react";
import { T, Badge, Card, StatCard, Toast, Spinner } from "../components/UI";
import { getAppointmentsByDoctor, updateAppointmentStatus, getDoctors, updateDoctorSchedule, addHoliday, removeHoliday } from "../firebase/services";
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

const formatDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
};

// ─── PDF GENERATORS ───────────────────────────────────────────────

const generateDailyReportPDF = (appointments, doctor, date) => {
  const dateStr = new Date(date + "T00:00:00").toLocaleDateString("en-PK", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const rows = appointments.map((a, i) => `
    <tr style="background:${i%2===0?'#f8fafc':'#fff'}">
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${i+1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${a.patientName||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${a.patientEmail||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${formatTime(a.slot)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${a.clinicName||a.type||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${a.reason||"—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#218EB6">
        ${a.clinicFee > 0 ? `PKR ${Number(a.clinicFee).toLocaleString()}` : "—"}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">
        <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
          background:${a.status==='completed'?'#e6faf5':a.status==='confirmed'?'#e0f2fe':'#fffbeb'};
          color:${a.status==='completed'?'#00C897':a.status==='confirmed'?'#0369a1':'#F59E0B'}">
          ${a.status?.toUpperCase()}
        </span>
      </td>
    </tr>
  `).join("");

  const totalFee = appointments.reduce((sum, a) => sum + (Number(a.clinicFee) || 0), 0);
  const completed = appointments.filter(a => a.status === "completed").length;
  const confirmed = appointments.filter(a => a.status === "confirmed").length;
  const pending   = appointments.filter(a => a.status === "pending").length;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Report - ${dateStr}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #1a2e3b; background: #fff; }
    .page { padding: 40px; max-width: 1100px; margin: 0 auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:30px;
    padding-bottom:20px;border-bottom:3px solid #218EB6">
    <div>
      <div style="font-size:28px;font-weight:900;color:#218EB6">AsaanDoc</div>
      <div style="font-size:12px;color:#6a8a9a;font-family:serif">صحت کا آسان راستہ</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:800;color:#1a2e3b">Daily Appointment Report</div>
      <div style="font-size:13px;color:#6a8a9a;margin-top:4px">${dateStr}</div>
      <div style="font-size:13px;color:#218EB6;font-weight:600;margin-top:2px">Dr. ${doctor?.name || "—"}</div>
      <div style="font-size:12px;color:#6a8a9a">${doctor?.specialty || ""}</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px">
    ${[
      ["Total", appointments.length, "#218EB6"],
      ["Completed", completed, "#00C897"],
      ["Confirmed", confirmed, "#0369a1"],
      ["Pending", pending, "#F59E0B"],
    ].map(([label, val, color]) => `
      <div style="padding:16px;border-radius:10px;background:#f8fafc;border-left:4px solid ${color}">
        <div style="font-size:11px;font-weight:700;color:#6a8a9a;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
        <div style="font-size:28px;font-weight:900;color:${color};margin-top:4px">${val}</div>
      </div>
    `).join("")}
  </div>

  <!-- Table -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:linear-gradient(135deg,#218EB6,#155f7a)">
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">#</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Patient Name</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Email</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Time</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Clinic</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Reason</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Fee</th>
        <th style="padding:12px;text-align:left;color:#fff;font-size:12px">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- Total -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:30px">
    <div style="padding:16px 24px;background:#218EB6;border-radius:10px;color:#fff;text-align:right">
      <div style="font-size:12px;opacity:0.8">Total Collection</div>
      <div style="font-size:24px;font-weight:900">PKR ${totalFee.toLocaleString()}</div>
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:space-between;
    align-items:center;color:#6a8a9a;font-size:11px">
    <div>Generated by AsaanDoc · asaandoc.com</div>
    <div>Report Date: ${new Date().toLocaleDateString("en-PK")}</div>
    <div>Dr. ${doctor?.name || ""} · ${doctor?.specialty || ""}</div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
};

// ─── INVOICE GENERATOR ────────────────────────────────────────────

const generateInvoicePDF = (appointment, doctor) => {
  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
  const issueDate = new Date().toLocaleDateString("en-PK", {
    year: "numeric", month: "long", day: "numeric"
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoiceNo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; color: #1a2e3b; background: #fff; }
    .page { padding: 50px; max-width: 800px; margin: 0 auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header Banner -->
  <div style="background:linear-gradient(135deg,#218EB6,#155f7a);padding:30px;border-radius:12px;
    margin-bottom:30px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="color:#fff;font-size:30px;font-weight:900;letter-spacing:-1px">AsaanDoc</div>
      <div style="color:rgba(255,255,255,0.7);font-size:13px;font-family:serif">صحت کا آسان راستہ</div>
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">asaandoc.com</div>
    </div>
    <div style="text-align:right">
      <div style="color:#fff;font-size:28px;font-weight:900">INVOICE</div>
      <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">${invoiceNo}</div>
      <div style="color:rgba(255,255,255,0.7);font-size:12px;margin-top:2px">${issueDate}</div>
    </div>
  </div>

  <!-- Doctor & Patient Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
    <div style="padding:20px;background:#f8fafc;border-radius:10px;border-left:4px solid #218EB6">
      <div style="font-size:11px;font-weight:700;color:#6a8a9a;text-transform:uppercase;
        letter-spacing:0.5px;margin-bottom:10px">From (Doctor)</div>
      <div style="font-weight:800;font-size:16px;color:#1a2e3b">${doctor?.name || "—"}</div>
      <div style="font-size:13px;color:#218EB6;font-weight:600;margin-top:3px">${doctor?.specialty || ""}</div>
      <div style="font-size:12px;color:#6a8a9a;margin-top:6px">🏥 ${appointment.clinicName || "—"}</div>
      <div style="font-size:12px;color:#6a8a9a;margin-top:3px">📍 ${appointment.clinicAddress || "—"}</div>
    </div>
    <div style="padding:20px;background:#f8fafc;border-radius:10px;border-left:4px solid #00C897">
      <div style="font-size:11px;font-weight:700;color:#6a8a9a;text-transform:uppercase;
        letter-spacing:0.5px;margin-bottom:10px">Bill To (Patient)</div>
      <div style="font-weight:800;font-size:16px;color:#1a2e3b">${appointment.patientName || "—"}</div>
      <div style="font-size:12px;color:#6a8a9a;margin-top:6px">📧 ${appointment.patientEmail || "—"}</div>
    </div>
  </div>

  <!-- Appointment Details -->
  <div style="margin-bottom:24px">
    <div style="font-size:13px;font-weight:700;color:#1a2e3b;margin-bottom:12px;
      padding-bottom:8px;border-bottom:2px solid #218EB6">Appointment Details</div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#218EB6">
          <th style="padding:12px 16px;text-align:left;color:#fff;font-size:12px">Description</th>
          <th style="padding:12px 16px;text-align:left;color:#fff;font-size:12px">Date</th>
          <th style="padding:12px 16px;text-align:left;color:#fff;font-size:12px">Time</th>
          <th style="padding:12px 16px;text-align:left;color:#fff;font-size:12px">Type</th>
          <th style="padding:12px 16px;text-align:right;color:#fff;font-size:12px">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f8fafc">
          <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0">
            <div style="font-weight:700">Medical Consultation</div>
            <div style="font-size:12px;color:#6a8a9a;margin-top:3px">${appointment.reason || "General Consultation"}</div>
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px">
            ${formatDate(appointment.date)}
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px">
            ${formatTime(appointment.slot)}
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;font-size:13px">
            ${appointment.type === "Online" ? "💻 Online" : "🏥 In Person"}
          </td>
          <td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;text-align:right;
            font-weight:800;font-size:15px;color:#218EB6">
            PKR ${Number(appointment.clinicFee || 0).toLocaleString()}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Total Section -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:30px">
    <div style="min-width:260px">
      <div style="display:flex;justify-content:space-between;padding:10px 0;
        border-bottom:1px solid #e2e8f0;font-size:13px">
        <span style="color:#6a8a9a">Subtotal</span>
        <span>PKR ${Number(appointment.clinicFee || 0).toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;
        border-bottom:1px solid #e2e8f0;font-size:13px">
        <span style="color:#6a8a9a">Tax</span>
        <span>PKR 0</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:14px 16px;margin-top:8px;
        background:#218EB6;border-radius:8px;color:#fff">
        <span style="font-weight:700;font-size:15px">TOTAL</span>
        <span style="font-weight:900;font-size:18px">PKR ${Number(appointment.clinicFee || 0).toLocaleString()}</span>
      </div>
    </div>
  </div>

  <!-- Payment Status -->
  <div style="padding:14px 20px;background:#e6faf5;border-radius:10px;
    border:1.5px solid #00C897;margin-bottom:28px;display:flex;
    justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:12px;height:12px;border-radius:50%;background:#00C897"></div>
      <span style="font-weight:700;color:#00C897;font-size:15px">PAYMENT RECEIVED</span>
    </div>
    <span style="font-size:12px;color:#6a8a9a">${issueDate}</span>
  </div>

  <!-- Note -->
  <div style="padding:16px;background:#fffbeb;border-radius:8px;border-left:4px solid #F59E0B;margin-bottom:28px">
    <div style="font-size:12px;color:#92400e;font-weight:600">Note:</div>
    <div style="font-size:12px;color:#6a8a9a;margin-top:4px">
      This invoice is automatically generated by AsaanDoc upon appointment completion.
      Please keep this for your records.
    </div>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;text-align:center;color:#6a8a9a;font-size:11px">
    <div style="font-weight:700;color:#218EB6;font-size:13px;margin-bottom:4px">AsaanDoc · asaandoc.com</div>
    <div>Pakistan's Online Healthcare Platform · صحت کا آسان راستہ</div>
    <div style="margin-top:4px">Invoice No: ${invoiceNo} · Generated: ${new Date().toLocaleString("en-PK")}</div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
};

// ─── MANAGE SCHEDULE COMPONENT ───────────────────────────────────
const ALL_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const ALL_SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00"];

function ManageSchedule({ doctor, onUpdate, showToast }) {
  const [clinics, setClinics] = useState(() => 
    doctor?.clinics ? JSON.parse(JSON.stringify(doctor.clinics)) : []
  );
  const [holidays, setHolidays] = useState(doctor?.holidays || []);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayReason, setNewHolidayReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeClinic, setActiveClinic] = useState(0);

  // Sync when doctor data refreshes
  useEffect(() => {
    if (doctor?.clinics) {
      setClinics(JSON.parse(JSON.stringify(doctor.clinics)));
    }
    if (doctor?.holidays) {
      setHolidays(doctor.holidays);
    }
  }, [doctor]);

  const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-PK",
    { weekday:"short", year:"numeric", month:"short", day:"numeric" });

  const toggleDay = (clinicIdx, day) => {
    const updated = JSON.parse(JSON.stringify(clinics));
    const days = updated[clinicIdx].days || [];
    updated[clinicIdx].days = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day];
    setClinics(updated);
  };

  const toggleSlot = (clinicIdx, slot) => {
    const updated = JSON.parse(JSON.stringify(clinics));
    const slots = updated[clinicIdx].slots || [];
    updated[clinicIdx].slots = slots.includes(slot)
      ? slots.filter(s => s !== slot)
      : [...slots, slot].sort();
    setClinics(updated);
  };

  const updateFee = (clinicIdx, fee) => {
    const updated = JSON.parse(JSON.stringify(clinics));
    updated[clinicIdx].fee = parseInt(fee) || 0;
    setClinics(updated);
  };

  const updateTime = (clinicIdx, field, value) => {
    const updated = JSON.parse(JSON.stringify(clinics));
    updated[clinicIdx][field] = value;
    setClinics(updated);
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await updateDoctorSchedule(doctor.id, clinics);
      await onUpdate();
      showToast("Schedule updated successfully! ✅");
    } catch {
      showToast("Failed to save. Try again.", "error");
    }
    setSaving(false);
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate) return;
    setSaving(true);
    try {
      await addHoliday(doctor.id, newHolidayDate, newHolidayReason);
      setHolidays(prev => [...prev, { date: newHolidayDate, reason: newHolidayReason || "Holiday" }]);
      setNewHolidayDate("");
      setNewHolidayReason("");
      showToast("Holiday marked! ✅");
    } catch {
      showToast("Failed to add holiday.", "error");
    }
    setSaving(false);
  };

  const handleRemoveHoliday = async (date) => {
    setSaving(true);
    try {
      await removeHoliday(doctor.id, date);
      setHolidays(prev => prev.filter(h => h.date !== date));
      showToast("Holiday removed.");
    } catch {
      showToast("Failed to remove.", "error");
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800, color:T.text }}>⚙️ Manage Schedule</h2>

      {/* Clinic Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {clinics.map((c, i) => (
          <button key={i} onClick={() => setActiveClinic(i)}
            style={{ padding:"8px 16px", borderRadius:10, border:`2px solid ${activeClinic===i?T.primary:T.border}`,
              background:activeClinic===i?T.primaryLight:T.white, color:activeClinic===i?T.primary:T.muted,
              fontWeight:600, fontSize:13, cursor:"pointer" }}>
            {c.isOnline?"💻":"🏥"} {c.name?.split(" ").slice(0,2).join(" ")}
          </button>
        ))}
      </div>

      {clinics[activeClinic] && (
        <Card style={{ marginBottom:20 }}>
          <h3 style={{ margin:"0 0 4px", fontSize:15, fontWeight:700, color:T.text }}>
            {clinics[activeClinic].isOnline?"💻":"🏥"} {clinics[activeClinic].name}
          </h3>
          <div style={{ fontSize:12, color:T.muted, marginBottom:20 }}>📍 {clinics[activeClinic].address}</div>

          {/* Fee */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
              Consultation Fee (PKR)
            </label>
            <input type="number" value={clinics[activeClinic].fee || ""}
              onChange={e => updateFee(activeClinic, e.target.value)}
              style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`,
                fontSize:14, color:T.text, width:200, outline:"none" }} />
          </div>

          {/* Timings */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
                textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Start Time</label>
              <select value={clinics[activeClinic].startTime || ""}
                onChange={e => updateTime(activeClinic, "startTime", e.target.value)}
                style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`,
                  fontSize:14, color:T.text, width:"100%", outline:"none" }}>
                {ALL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
                textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>End Time</label>
              <select value={clinics[activeClinic].endTime || ""}
                onChange={e => updateTime(activeClinic, "endTime", e.target.value)}
                style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`,
                  fontSize:14, color:T.text, width:"100%", outline:"none" }}>
                {ALL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Days */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>
              Available Days
            </label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {ALL_DAYS.map(day => {
                const active = clinics[activeClinic].days?.includes(day);
                return (
                  <button key={day} onClick={() => toggleDay(activeClinic, day)}
                    style={{ padding:"8px 16px", borderRadius:20, fontWeight:700, fontSize:13, cursor:"pointer",
                      border:`2px solid ${active?T.primary:T.border}`,
                      background:active?T.primary:T.white,
                      color:active?"#fff":T.muted, transition:"all 0.15s" }}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:10 }}>
              Time Slots (select all available)
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))", gap:8 }}>
              {ALL_SLOTS.map(slot => {
                const active = clinics[activeClinic].slots?.includes(slot);
                const hour = parseInt(slot.split(":")[0]);
                const label = `${hour % 12 || 12}:${slot.split(":")[1]} ${hour >= 12 ? "PM" : "AM"}`;
                return (
                  <button key={slot} onClick={() => toggleSlot(activeClinic, slot)}
                    style={{ padding:"8px 6px", borderRadius:8, fontWeight:600, fontSize:12, cursor:"pointer",
                      border:`2px solid ${active?T.primary:T.border}`,
                      background:active?T.primaryLight:T.white,
                      color:active?T.primary:T.muted, transition:"all 0.15s" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={saveSchedule} disabled={saving}
            style={{ width:"100%", padding:"13px", background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
              color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14,
              cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
            {saving ? "Saving..." : "💾 Save Schedule Changes"}
          </button>
        </Card>
      )}

      {/* Holidays */}
      <Card>
        <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>
          🏖️ Mark Holidays / Days Off
        </h3>

        {/* Add Holiday */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, marginBottom:20, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Date</label>
            <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`,
                fontSize:14, color:T.text, width:"100%", outline:"none" }} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
              textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Reason (optional)</label>
            <input value={newHolidayReason} onChange={e => setNewHolidayReason(e.target.value)}
              placeholder="e.g. Eid, Conference, Leave..."
              style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`,
                fontSize:14, color:T.text, width:"100%", outline:"none", fontFamily:"inherit" }} />
          </div>
          <button onClick={handleAddHoliday} disabled={!newHolidayDate || saving}
            style={{ padding:"10px 20px", background:!newHolidayDate?"#ccc":"#EF4444",
              color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:13,
              cursor:!newHolidayDate?"not-allowed":"pointer", whiteSpace:"nowrap" }}>
            🚫 Mark Off
          </button>
        </div>

        {/* Holidays List */}
        {holidays.length === 0 ? (
          <div style={{ textAlign:"center", padding:"24px 0", color:T.muted, fontSize:13 }}>
            No holidays marked. Patients can book on all available days.
          </div>
        ) : (
          <div style={{ display:"grid", gap:8 }}>
            {holidays.sort((a,b) => a.date.localeCompare(b.date)).map((h, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                borderRadius:10, background:"#fef2f2", border:"1.5px solid #EF4444" }}>
                <span style={{ fontSize:20 }}>🚫</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:T.text }}>{fmtDate(h.date)}</div>
                  <div style={{ fontSize:12, color:"#EF4444", fontWeight:600 }}>{h.reason}</div>
                </div>
                <button onClick={() => handleRemoveHoliday(h.date)}
                  style={{ padding:"5px 12px", background:T.white, color:"#EF4444",
                    border:"1.5px solid #EF4444", borderRadius:7, fontSize:12,
                    fontWeight:700, cursor:"pointer" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [view, setView]                 = useState("dashboard");
  const [doctor, setDoctor]             = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData]   = useState(true);
  const [selectedDate, setSelectedDate] = useState(fmtDate(today));
  const [filterStatus, setFilterStatus] = useState("All");
  const [reportDate, setReportDate]     = useState(fmtDate(today));
  const [toast, setToast]               = useState(null);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [receiptModal, setReceiptModal] = useState(null);

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

  const handleUpdateStatus = async (id, status, appointment) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      const msgs = {
        confirmed: "Appointment confirmed ✓",
        completed: "Marked as completed ✓",
        cancelled: "Appointment declined.",
      };
      showToast(msgs[status] || "Updated.");
      // Auto generate invoice when marked complete
      if (status === "completed" && appointment) {
        setTimeout(() => {
          if (window.confirm("Generate invoice for this appointment?")) {
            generateInvoicePDF(appointment, doctor);
          }
        }, 500);
      }
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
  const reportAppts = appointments.filter(a => a.date === reportDate);

  const getPatientDisplay = (a) => a.patientName || a.patientEmail?.split("@")[0] || "Unknown Patient";

  const nav = [
    ["dashboard","📊","Dashboard"],
    ["schedule","📅","Schedule"],
    ["patients","👥","Appointments"],
    ["report","📄","Daily Report"],
    ["manage","⚙️","Manage Schedule"],
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
              {doctor.photo ? (
                <img src={doctor.photo} alt={doctor.name}
                  style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover",
                    border:"2px solid rgba(255,255,255,0.3)", flexShrink:0 }}
                  onError={e => { e.target.style.display="none"; }} />
              ) : (
                <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontWeight:800, fontSize:14, flexShrink:0 }}>
                  {doctor.avatar||"DR"}
                </div>
              )}
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
              {view==="patients"&&"All Appointments"}{view==="report"&&"Daily Report"}
              {view==="manage"&&"Manage Schedule"}{view==="stats"&&"Analytics"}
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

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:16 }}>
                <StatCard label="Today"     value={todayAppts.length} icon="📅" color={T.primary}  sub="appointments" />
                <StatCard label="Upcoming"  value={upcoming.length}   icon="⏳" color={T.accent}   sub="confirmed" />
                <StatCard label="Pending"   value={pending.length}    icon="🔔" color={T.warn}     sub="need action" />
                <StatCard label="Completed" value={completed.length}  icon="✅" color="#8B5CF6"    sub="all time" />
              </div>

              {/* Today's Fee Summary Banner */}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginBottom:24 }}>
                  <div style={{ padding:"16px 20px", borderRadius:12, background:"linear-gradient(135deg,#16a34a,#15803d)",
                    color:"#fff", boxShadow:"0 4px 14px rgba(22,163,74,0.3)" }}>
                    <div style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Today's Total Fees</div>
                    <div style={{ fontSize:26, fontWeight:900 }}>
                      PKR {todayAppts.reduce((s,a) => s + Number(a.clinicFee||0), 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize:11, opacity:0.75, marginTop:4 }}>{todayAppts.length} appointment{todayAppts.length>1?"s":""}</div>
                  </div>
                  <div style={{ padding:"16px 20px", borderRadius:12, background:"linear-gradient(135deg,#218EB6,#155f7a)",
                    color:"#fff", boxShadow:"0 4px 14px rgba(33,142,182,0.3)" }}>
                    <div style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Collected Today</div>
                    <div style={{ fontSize:26, fontWeight:900 }}>
                      PKR {todayAppts.filter(a=>a.status==="completed").reduce((s,a) => s + Number(a.clinicFee||0), 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize:11, opacity:0.75, marginTop:4 }}>{todayAppts.filter(a=>a.status==="completed").length} completed</div>
                  </div>
                  <div style={{ padding:"16px 20px", borderRadius:12, background:"linear-gradient(135deg,#F59E0B,#d97706)",
                    color:"#fff", boxShadow:"0 4px 14px rgba(245,158,11,0.3)" }}>
                    <div style={{ fontSize:11, fontWeight:700, opacity:0.8, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>Pending Fees</div>
                    <div style={{ fontSize:26, fontWeight:900 }}>
                      PKR {todayAppts.filter(a=>a.status!=="completed"&&a.status!=="cancelled").reduce((s,a) => s + Number(a.clinicFee||0), 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize:11, opacity:0.75, marginTop:4 }}>not yet collected</div>
                  </div>
                </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
                <Card>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:T.text }}>📅 Today's Schedule</h3>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:12, color:T.muted }}>{todayAppts.length} appts</span>
                      {todayAppts.length > 0 && (
                        <button onClick={() => generateDailyReportPDF(todayAppts, doctor, todayStr)}
                          style={{ padding:"4px 10px", background:T.primaryLight, color:T.primary,
                            border:`1px solid ${T.primary}`, borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          📄 PDF
                        </button>
                      )}
                    </div>
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
                              {a.clinicFee > 0 && <div style={{ fontSize:11, color:T.primary, fontWeight:600 }}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                              {a.reason && <div style={{ fontSize:11, color:T.muted }}>📝 {a.reason}</div>}
                              {a.paymentReceipt && (
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                                  <span style={{ fontSize:10 }}>💳</span>
                                  <span style={{ fontSize:11, color:"#16a34a", fontWeight:600 }}>Receipt uploaded</span>
                                  <button onClick={() => setReceiptModal(a.paymentReceipt)}
                                    style={{ fontSize:10, color:T.primary, background:"none", border:"none",
                                      cursor:"pointer", fontWeight:600, textDecoration:"underline" }}>View</button>
                                </div>
                              )}
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                              <Badge status={a.status} />
                              {a.status==="pending" && (
                                <div style={{ display:"flex", gap:4 }}>
                                  <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)}
                                    style={{ padding:"3px 8px", background:T.accent, color:"#fff", border:"none", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>✓</button>
                                  <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)}
                                    style={{ padding:"3px 8px", background:"#fef2f2", color:"#EF4444", border:"1px solid #EF4444", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>✗</button>
                                </div>
                              )}
                              {a.status==="confirmed" && (
                                <button onClick={()=>handleUpdateStatus(a.id,"completed",a)}
                                  style={{ padding:"3px 8px", background:T.primaryLight, color:T.primary, border:`1px solid ${T.primary}`, borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>Done</button>
                              )}
                              {a.status==="completed" && (
                                <button onClick={()=>generateInvoicePDF(a, doctor)}
                                  style={{ padding:"3px 8px", background:"#f0fdf4", color:"#16a34a", border:"1px solid #16a34a", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer" }}>🧾 Invoice</button>
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
                            📅 {formatDate(a.date)} at {formatTime(a.slot)}
                          </div>
                          {a.clinicName && <div style={{ fontSize:11, color:T.muted, marginBottom:2 }}>🏥 {a.clinicName}</div>}
                          {a.clinicFee > 0 && <div style={{ fontSize:11, color:T.primary, fontWeight:600, marginBottom:4 }}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                          {a.reason && <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>📝 {a.reason}</div>}
                          <div style={{ display:"flex", gap:6, marginTop:8 }}>
                            <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)}
                              style={{ flex:1, padding:"7px", background:T.accent, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:700, cursor:"pointer" }}>✓ Accept</button>
                            <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)}
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
                        <div style={{ fontSize:12, color:T.muted }}>📅 {formatDate(a.date)}</div>
                        <div style={{ fontSize:12, color:T.muted }}>🕐 {formatTime(a.slot)}</div>
                        {a.clinicName && <div style={{ fontSize:12, color:T.muted }}>🏥 {a.clinicName}</div>}
                        {a.clinicFee > 0 && <div style={{ fontSize:12, color:T.primary, fontWeight:600 }}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
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
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <div style={{ fontSize:12, color:T.muted }}>{dayAppts.filter(a=>a.status!=="cancelled").length} appointments</div>
                    {dayAppts.length > 0 && (
                      <button onClick={() => generateDailyReportPDF(dayAppts, doctor, selectedDate)}
                        style={{ padding:"6px 14px", background:T.primary, color:"#fff",
                          border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                        📄 Download Report
                      </button>
                    )}
                  </div>
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
                          {a.clinicFee > 0 && <div style={{ fontSize:11, color:T.primary, fontWeight:600 }}>PKR {Number(a.clinicFee).toLocaleString()}</div>}
                          {a.reason && <div style={{ fontSize:11, color:T.muted }}>📝 {a.reason}</div>}
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5 }}>
                          <Badge status={a.status} />
                          {a.status==="pending" && (
                            <div style={{ display:"flex", gap:4 }}>
                              <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)}
                                style={{ padding:"4px 10px", background:T.accent, color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Accept</button>
                              <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)}
                                style={{ padding:"4px 10px", background:"#fef2f2", color:"#EF4444", border:"1px solid #EF4444", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Decline</button>
                            </div>
                          )}
                          {a.status==="confirmed" && (
                            <button onClick={()=>handleUpdateStatus(a.id,"completed",a)}
                              style={{ padding:"4px 10px", background:T.primaryLight, color:T.primary, border:`1px solid ${T.primary}`, borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>Mark Done</button>
                          )}
                          {a.status==="completed" && (
                            <button onClick={()=>generateInvoicePDF(a, doctor)}
                              style={{ padding:"4px 10px", background:"#f0fdf4", color:"#16a34a", border:"1px solid #16a34a", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>🧾 Invoice</button>
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
                            <span style={{ fontSize:12, color:T.muted }}>📅 {formatDate(a.date)}</span>
                            <span style={{ fontSize:12, color:T.muted }}>🕐 {formatTime(a.slot)}</span>
                            <span style={{ fontSize:12, color:T.muted }}>{a.type==="Online"?"💻":"🏥"} {a.type}</span>
                            {a.clinicFee > 0 && <span style={{ fontSize:12, fontWeight:700, color:T.primary }}>PKR {Number(a.clinicFee).toLocaleString()}</span>}
                          </div>
                          {a.reason && <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>📝 {a.reason}</div>}

                          {/* Payment Receipt from Patient */}
                          {a.paymentReceipt && (
                            <div style={{ marginTop:8, padding:"8px 12px", background:"#f0fdf4",
                              borderRadius:8, border:"1.5px solid #86efac",
                              display:"flex", alignItems:"center", gap:10 }}>
                              <span style={{ fontSize:16 }}>💳</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:"#16a34a" }}>Payment Receipt Uploaded</div>
                                {a.paymentReceiptName && <div style={{ fontSize:11, color:T.muted }}>{a.paymentReceiptName}</div>}
                              </div>
                              <button onClick={() => setReceiptModal(a.paymentReceipt)}
                                style={{ padding:"5px 12px", background:"#16a34a", color:"#fff",
                                  border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                👁️ View
                              </button>
                            </div>
                          )}
                          {!a.paymentReceipt && a.status !== "cancelled" && (
                            <div style={{ marginTop:6, fontSize:11, color:T.muted, fontStyle:"italic" }}>
                              ⏳ No payment receipt uploaded yet
                            </div>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start" }}>
                          {a.status==="pending" && (
                            <>
                              <button onClick={()=>handleUpdateStatus(a.id,"confirmed",a)}
                                style={{ padding:"8px 16px", background:T.accent, color:"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>✓ Accept</button>
                              <button onClick={()=>handleUpdateStatus(a.id,"cancelled",a)}
                                style={{ padding:"8px 14px", background:"#fef2f2", color:"#EF4444", border:"1.5px solid #EF4444", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>✗ Decline</button>
                            </>
                          )}
                          {a.status==="confirmed" && (
                            <button onClick={()=>handleUpdateStatus(a.id,"completed",a)}
                              style={{ padding:"8px 16px", background:T.primaryLight, color:T.primary, border:`1.5px solid ${T.primary}`, borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>✅ Mark Done</button>
                          )}
                          {a.status==="completed" && (
                            <button onClick={()=>generateInvoicePDF(a, doctor)}
                              style={{ padding:"8px 14px", background:"#f0fdf4", color:"#16a34a", border:"1.5px solid #16a34a", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>🧾 Invoice</button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DAILY REPORT */}
          {view === "report" && (
            <div>
              <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:800, color:T.text }}>📄 Daily Report</h2>

              {/* Date Selector */}
              <Card style={{ marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                  <div style={{ flex:1 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:700, color:T.muted,
                      textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>
                      Select Date
                    </label>
                    <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
                      style={{ padding:"10px 14px", borderRadius:9, border:`1.5px solid ${T.border}`,
                        fontSize:14, color:T.text, outline:"none", fontFamily:"inherit" }} />
                  </div>
                  <button onClick={() => generateDailyReportPDF(reportAppts, doctor, reportDate)}
                    disabled={reportAppts.length === 0}
                    style={{ padding:"12px 24px", background:reportAppts.length>0
                      ?`linear-gradient(135deg,${T.primary},${T.primaryDark})`:T.border,
                      color:"#fff", border:"none", borderRadius:10, fontWeight:700, fontSize:14,
                      cursor:reportAppts.length>0?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:8 }}>
                    📄 Download PDF Report
                  </button>
                </div>
              </Card>

              {/* Summary */}
              {reportAppts.length > 0 && (
                <>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
                    <StatCard label="Total" value={reportAppts.length} icon="📋" color={T.primary} />
                    <StatCard label="Completed" value={reportAppts.filter(a=>a.status==="completed").length} icon="✅" color={T.accent} />
                    <StatCard label="Confirmed" value={reportAppts.filter(a=>a.status==="confirmed").length} icon="📅" color="#8B5CF6" />
                    <StatCard label="Total Fees"
                      value={`PKR ${reportAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}`}
                      icon="💰" color="#16a34a" />
                  </div>

                  {/* Report Table Preview */}
                  <Card>
                    <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>
                      Appointments on {new Date(reportDate+"T00:00:00").toLocaleDateString("en-PK",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
                    </h3>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                        <thead>
                          <tr style={{ background:`linear-gradient(135deg,${T.primary},${T.primaryDark})` }}>
                            {["#","Patient","Email","Time","Clinic","Reason","Fee","Status"].map(h => (
                              <th key={h} style={{ padding:"10px 12px", textAlign:"left", color:"#fff", fontSize:12, whiteSpace:"nowrap" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportAppts.map((a, i) => (
                            <tr key={a.id} style={{ background:i%2===0?T.bg:T.white }}>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>{i+1}</td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:600 }}>{getPatientDisplay(a)}</td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{a.patientEmail||"—"}</td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>{formatTime(a.slot)}</td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{a.clinicName||"—"}</td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, color:T.muted }}>{a.reason||"—"}</td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, fontWeight:700, color:T.primary }}>
                                {a.clinicFee>0?`PKR ${Number(a.clinicFee).toLocaleString()}`:"—"}
                              </td>
                              <td style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}` }}>
                                <Badge status={a.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background:T.primaryLight }}>
                            <td colSpan={6} style={{ padding:"12px", fontWeight:700, color:T.text }}>Total</td>
                            <td style={{ padding:"12px", fontWeight:800, color:T.primary }}>
                              PKR {reportAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </Card>
                </>
              )}

              {reportAppts.length === 0 && (
                <Card style={{ textAlign:"center", padding:"48px 20px" }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                  <div style={{ fontWeight:700, color:T.text, marginBottom:8 }}>No appointments on this date</div>
                  <div style={{ color:T.muted, fontSize:14 }}>Select a different date to view the report</div>
                </Card>
              )}
            </div>
          )}

          {/* MANAGE SCHEDULE */}
          {view === "manage" && (
            <ManageSchedule doctor={doctor} onUpdate={loadData} showToast={showToast} />
          )}

          {/* ANALYTICS */}
          {view === "stats" && (
            <div>
              <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800, color:T.text }}>Analytics Overview</h2>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                <StatCard label="Total"     value={appointments.length} icon="📋" color={T.primary} />
                <StatCard label="Confirmed" value={appointments.filter(a=>a.status==="confirmed").length} icon="✅" color={T.accent} />
                <StatCard label="Completed" value={completed.length} icon="🎯" color="#8B5CF6" />
                <StatCard label="Revenue"
                  value={`PKR ${completed.reduce((s,a)=>s+Number(a.clinicFee||0),0).toLocaleString()}`}
                  icon="💰" color="#16a34a" />
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
                  <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700, color:T.text }}>Revenue by Clinic</h3>
                  {doctor?.clinics?.map((c, i) => {
                    const clinicAppts = completed.filter(a => a.clinicName === c.name);
                    const revenue = clinicAppts.reduce((s,a)=>s+Number(a.clinicFee||0),0);
                    const total = completed.reduce((s,a)=>s+Number(a.clinicFee||0),0);
                    const pct = total > 0 ? Math.round(revenue/total*100) : 0;
                    return (
                      <div key={i} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{c.isOnline?"💻":"🏥"} {c.name.split(" ").slice(0,2).join(" ")}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:T.primary }}>PKR {revenue.toLocaleString()}</span>
                        </div>
                        <div style={{ height:6, background:T.bg, borderRadius:10, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:10, background:T.primary, width:`${pct}%` }} />
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
                    {doctor.photo ? (
                      <img src={doctor.photo} alt={doctor.name}
                        style={{ width:70, height:70, borderRadius:"50%", objectFit:"cover",
                          border:`3px solid ${T.primary}`, flexShrink:0 }}
                        onError={e => { e.target.style.display="none"; }} />
                    ) : (
                      <div style={{ width:70, height:70, borderRadius:"50%", background:doctor.color||T.primary,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#fff", fontWeight:800, fontSize:24, flexShrink:0 }}>
                        {doctor.avatar||"DR"}
                      </div>
                    )}
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

      {/* Receipt Modal */}
      {receiptModal && (
        <div onClick={() => setReceiptModal(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", borderRadius:16, padding:24, maxWidth:640, width:"100%",
              maxHeight:"88vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:16, color:T.text }}>💳 Patient Payment Receipt</div>
              <button onClick={() => setReceiptModal(null)}
                style={{ background:"none", border:"none", fontSize:26, cursor:"pointer", color:T.muted, lineHeight:1 }}>×</button>
            </div>
            {receiptModal.startsWith("data:image") ? (
              <img src={receiptModal} alt="Payment Receipt"
                style={{ width:"100%", borderRadius:8, border:`1px solid ${T.border}` }} />
            ) : receiptModal.startsWith("data:application/pdf") ? (
              <iframe src={receiptModal} style={{ width:"100%", height:520, border:"none", borderRadius:8 }} title="Receipt PDF" />
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

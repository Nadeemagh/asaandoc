// src/components/TokenSystem.jsx
// Token management for doctor portal
// Shows today's queue, allows manual token generation

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";

const C = {
  teal:"#2ABFBF", tealDark:"#1a9999", tealLight:"#e8f9f9",
  navy:"#1B3A5C", white:"#ffffff", gray50:"#f8fafc",
  gray100:"#f1f5f9", gray200:"#e2e8f0", gray400:"#94a3b8",
  gray600:"#475569", gray800:"#1e293b", red:"#ef4444", green:"#10b981",
};

const today = () => new Date().toISOString().split("T")[0];

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

// ── Print Token ───────────────────────────────────────────────
const printToken = (token, doctor = {}) => {
  const win = window.open("", "_blank");
  const num = token.tokenNumber;
  const name = token.patientName || "Patient";
  const isWalkIn = token.isWalkIn ? "Walk-in Patient" : "Appointment";
  const reason = token.reason || "";
  const slot = token.slot || "";
  const date = new Date().toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"});
  const time = new Date().toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"});
  const docName = doctor.name || "";
  const docSpec = doctor.specialty || "";
  const docQual = doctor.qualification || "";

  const html = [
    "<!DOCTYPE html><html><head><title>Token #" + num + "</title>",
    "<style>",
    "* { margin:0; padding:0; box-sizing:border-box; }",
    "body { font-family:'Segoe UI',Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f4f8; }",
    ".ticket { width:300px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.15); }",
    ".header { background:linear-gradient(135deg,#1B3A5C,#2d5a8e); padding:20px; text-align:center; }",
    ".avatar { width:70px; height:70px; border-radius:50%; background:linear-gradient(135deg,#2ABFBF,#1a9999); margin:0 auto 10px; border:3px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:36px; }",
    ".logo { font-size:20px; font-weight:900; color:#fff; }",
    ".logo span { color:#2ABFBF; }",
    ".tagline { font-size:11px; color:rgba(255,255,255,0.5); margin-top:2px; font-family:serif; }",
    ".doc-info { margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.15); }",
    ".doc-name { font-size:15px; font-weight:800; color:#fff; }",
    ".doc-spec { font-size:12px; color:#2ABFBF; font-weight:600; margin-top:2px; }",
    ".doc-qual { font-size:10px; color:rgba(255,255,255,0.5); margin-top:2px; }",
    ".token-box { padding:24px; text-align:center; border-bottom:2px dashed #e2e8f0; }",
    ".lbl { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.1em; }",
    ".num { font-size:72px; font-weight:900; color:#1B3A5C; line-height:1; margin:8px 0; }",
    ".info { padding:16px 20px; }",
    ".row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:13px; }",
    ".il { color:#94a3b8; font-weight:600; }",
    ".iv { color:#1e293b; font-weight:700; }",
    ".footer { padding:16px 20px; background:#f8fafc; text-align:center; }",
    ".ft { font-size:11px; color:#94a3b8; }",
    ".bar { margin:10px auto; height:40px; background:repeating-linear-gradient(90deg,#1B3A5C 0px,#1B3A5C 2px,transparent 2px,transparent 5px); width:200px; border-radius:2px; }",
    "@media print { body{background:#fff;} .ticket{box-shadow:none;} }",
    "</style></head><body>",
    "<div class='ticket'>",
    "<div class='header'>",
    "<div class='avatar'>&#128104;&#8205;&#9877;&#65039;</div>",
    "<div class='logo'>asaan<span>doc</span></div>",
    "<div class='tagline'>&#1589;&#1581;&#1578; &#1603;&#1575; &#1570;&#1587;&#1575;&#1606; &#1585;&#1575;&#1587;&#1578;&#1607;</div>",
    docName ? "<div class='doc-info'><div class='doc-name'>" + docName + "</div>" + (docSpec ? "<div class='doc-spec'>" + docSpec + "</div>" : "") + (docQual ? "<div class='doc-qual'>" + docQual + "</div>" : "") + "</div>" : "",
    "</div>",
    "<div class='token-box'>",
    "<div class='lbl'>Your Token Number</div>",
    "<div class='num'>#" + num + "</div>",
    "<div class='lbl'>" + isWalkIn + "</div>",
    "</div>",
    "<div class='info'>",
    "<div class='row'><span class='il'>Patient</span><span class='iv'>" + name + "</span></div>",
    slot ? "<div class='row'><span class='il'>Time Slot</span><span class='iv'>" + slot + "</span></div>" : "",
    reason ? "<div class='row'><span class='il'>Reason</span><span class='iv'>" + reason + "</span></div>" : "",
    "<div class='row'><span class='il'>Date</span><span class='iv'>" + date + "</span></div>",
    "<div class='row'><span class='il'>Time</span><span class='iv'>" + time + "</span></div>",
    "</div>",
    "<div class='footer'>",
    "<div class='bar'></div>",
    "<div class='ft' style='margin-top:10px'>Please wait for your token to be called</div>",
    "<div class='ft'>asaandoc.com</div>",
    "</div></div>",
    "</body></html>",
  ].join("");

  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
};

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playTone(880, 0, 0.15);
    playTone(1100, 0.2, 0.15);
    playTone(880, 0.4, 0.3);
  } catch(e) { console.log("Audio not supported"); }
};

const announceToken = (tokenNumber, patientName) => {
  playBeep();
  setTimeout(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(
        `Token number ${tokenNumber}. ${patientName || "Patient"}, please proceed to the doctor.`
      );
      msg.lang = "en-US";
      msg.rate = 0.85;
      msg.pitch = 1;
      msg.volume = 1;
      window.speechSynthesis.speak(msg);
    }
  }, 600);
};

function TokenCard({ token, onCall, onComplete, onSkip, onPrint }) {
  const statusColor = {
    waiting: C.teal, called: "#f59e0b", completed: C.green, skipped: C.gray400,
  }[token.tokenStatus] || C.gray400;

  const statusBg = {
    waiting: C.tealLight, called: "#fffbeb", completed: "#f0fdf4", skipped: C.gray100,
  }[token.tokenStatus] || C.gray100;

  return (
    <div style={{
      background: C.white, borderRadius: 14, padding: "16px 18px",
      border: `2px solid ${token.tokenStatus === "called" ? "#f59e0b" : token.tokenStatus === "completed" ? C.green : C.gray200}`,
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: token.tokenStatus === "called" ? "0 4px 20px rgba(245,158,11,0.2)" : "0 1px 4px rgba(0,0,0,0.05)",
      transition: "all 0.2s",
    }}>
      {/* Token number */}
      <div style={{
        width: 56, height: 56, borderRadius: 14, flexShrink: 0,
        background: token.tokenStatus === "completed" ? C.green : token.tokenStatus === "called" ? "#f59e0b" : C.navy,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: `0 4px 12px ${token.tokenStatus === "called" ? "rgba(245,158,11,0.4)" : "rgba(27,58,92,0.3)"}`,
      }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.05em" }}>TOKEN</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>#{token.tokenNumber}</div>
      </div>

      {/* Patient info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>{token.patientName || "Walk-in Patient"}</div>
        <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>
          {token.slot ? `🕐 ${formatTime(token.slot)}` : "🚶 Walk-in"}
          {token.patientPhone ? ` · 📱 ${token.patientPhone}` : ""}
        </div>
        {token.reason && <div style={{ fontSize: 12, color: C.gray600, marginTop: 2 }}>📝 {token.reason}</div>}
        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: statusBg, border: `1px solid ${statusColor}30` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: "capitalize" }}>{token.tokenStatus}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {token.tokenStatus === "waiting" && (
          <button onClick={() => onCall(token)}
            style={{ padding: "8px 16px", background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            📢 Call
          </button>
        )}
        {token.tokenStatus === "called" && (
          <>
            <button onClick={() => onComplete(token)}
              style={{ padding: "8px 14px", background: "#f0fdf4", color: C.green, border: `1.5px solid ${C.green}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              ✅ Done
            </button>
            <button onClick={() => onSkip(token)}
              style={{ padding: "8px 14px", background: C.gray100, color: C.gray600, border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              ⏭ Skip
            </button>
          </>
        )}
        {token.tokenStatus === "completed" && (
          <div style={{ fontSize: 24, textAlign: "center" }}>✅</div>
        )}
        {token.tokenStatus === "skipped" && (
          <button onClick={() => onCall(token)}
            style={{ padding: "8px 14px", background: C.gray100, color: C.gray600, border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🔄 Re-call
          </button>
        )}
        {/* Print + Recall always available */}
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onPrint(token)}
            style={{ flex: 1, padding: "6px 10px", background: C.gray50, color: C.navy, border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🖨️
          </button>
          {token.tokenStatus !== "waiting" && (
            <button onClick={() => announceToken(token.tokenNumber, token.patientName)}
              style={{ flex: 1, padding: "6px 10px", background: "#fffbeb", color: "#92400e", border: "1.5px solid #fde68a", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              🔊
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TokenSystem({ doctorId, appointments = [], doctor = {} }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInReason, setWalkInReason] = useState("");
  const [currentToken, setCurrentToken] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // Load today's tokens from appointments
  useEffect(() => {
    const todayStr = today();
    const todayAppts = appointments.filter(a => a.date === todayStr && a.status !== "cancelled");

    // Build tokens from appointments (auto-assigned numbers by slot time)
    const sorted = [...todayAppts].sort((a, b) => (a.slot || "").localeCompare(b.slot || ""));
    const built = sorted.map((a, i) => ({
      id: a.id,
      tokenNumber: i + 1,
      patientName: a.patientName || a.patientEmail?.split("@")[0] || "Patient",
      patientPhone: a.patientPhone || "",
      slot: a.slot,
      reason: a.reason,
      tokenStatus: a.tokenStatus || "waiting",
      isWalkIn: false,
      appointmentId: a.id,
    }));

    // Add any stored walk-in tokens from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem(`tokens_${doctorId}_${todayStr}`) || "[]");
      const walkIns = stored.map((w, i) => ({
        ...w,
        tokenNumber: built.length + i + 1,
      }));
      setTokens([...built, ...walkIns]);
    } catch {
      setTokens(built);
    }
    setLoading(false);

    // Set current called token
    const called = built.find(t => t.tokenStatus === "called");
    if (called) setCurrentToken(called);
  }, [appointments, doctorId]);

  const updateTokenStatus = async (token, newStatus) => {
    const updated = tokens.map(t => t.id === token.id ? { ...t, tokenStatus: newStatus } : t);
    setTokens(updated);

    // Save to Firestore if it's an appointment token
    if (token.appointmentId) {
      try {
        await updateDoc(doc(db, "appointments", token.appointmentId), { tokenStatus: newStatus });
      } catch(e) { console.error(e); }
    }

    // Save walk-in tokens to localStorage
    const todayStr = today();
    const walkIns = updated.filter(t => t.isWalkIn);
    localStorage.setItem(`tokens_${doctorId}_${todayStr}`, JSON.stringify(walkIns));

    if (newStatus === "called") {
      setCurrentToken(token);
      announceToken(token.tokenNumber, token.patientName);
      showToast(`📢 Now calling Token #${token.tokenNumber} — ${token.patientName}`);
    } else if (newStatus === "completed") {
      if (currentToken?.id === token.id) setCurrentToken(null);
      showToast(`✅ Token #${token.tokenNumber} completed`);
    } else if (newStatus === "skipped") {
      if (currentToken?.id === token.id) setCurrentToken(null);
      showToast(`⏭ Token #${token.tokenNumber} skipped`);
    }
  };

  const addWalkIn = () => {
    if (!walkInName.trim()) return;
    const todayStr = today();
    const newToken = {
      id: `walkin-${Date.now()}`,
      tokenNumber: tokens.length + 1,
      patientName: walkInName.trim(),
      patientPhone: walkInPhone.trim(),
      reason: walkInReason.trim(),
      slot: null,
      tokenStatus: "waiting",
      isWalkIn: true,
      appointmentId: null,
    };
    const updated = [...tokens, newToken];
    setTokens(updated);

    // Save walk-ins to localStorage
    const walkIns = updated.filter(t => t.isWalkIn);
    localStorage.setItem(`tokens_${doctorId}_${todayStr}`, JSON.stringify(walkIns));

    setWalkInName(""); setWalkInPhone(""); setWalkInReason("");
    setShowWalkIn(false);
    showToast(`🎫 Token #${newToken.tokenNumber} issued for ${newToken.patientName}`);
    // Auto print the token
    setTimeout(() => printToken(newToken, doctor), 300);
  };

  const callNext = () => {
    const next = tokens.find(t => t.tokenStatus === "waiting");
    if (next) updateTokenStatus(next, "called");
    else showToast("No more patients waiting");
  };

  const stats = {
    waiting: tokens.filter(t => t.tokenStatus === "waiting").length,
    called: tokens.filter(t => t.tokenStatus === "called").length,
    completed: tokens.filter(t => t.tokenStatus === "completed").length,
    total: tokens.length,
  };

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>Loading tokens…</div>;

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 70, right: 24, background: C.navy, color: "#fff", padding: "12px 20px", borderRadius: 10, zIndex: 999, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", animation: "fadeUp 0.3s ease-out" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${C.navy},#2d5a8e)`, borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>🎫 Token Queue</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
              {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={callNext}
              style={{ padding: "10px 20px", background: C.teal, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(42,191,191,0.4)" }}>
              📢 Call Next
            </button>
            <button onClick={() => setShowWalkIn(true)}
              style={{ padding: "10px 20px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              🚶 Walk-in
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 16 }}>
          {[["Total", stats.total, "📋", "rgba(255,255,255,0.1)"],["Waiting", stats.waiting, "⏳", "rgba(42,191,191,0.2)"],["Called", stats.called, "📢", "rgba(245,158,11,0.2)"],["Done", stats.completed, "✅", "rgba(16,185,129,0.2)"]].map(([l,v,icon,bg])=>(
            <div key={l} style={{ padding: "12px", borderRadius: 12, background: bg, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{v}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Currently Calling */}
      {currentToken && (
        <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "2px solid #f59e0b", borderRadius: 16, padding: "18px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, animation: "pulse 2s ease-in-out infinite", boxShadow: "0 4px 20px rgba(245,158,11,0.2)" }}>
          <div style={{ fontSize: 40 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>Now Calling</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#92400e" }}>Token #{currentToken.tokenNumber}</div>
            <div style={{ fontSize: 14, color: "#78350f" }}>{currentToken.patientName} — Please proceed to the doctor</div>
          </div>
          <button onClick={() => announceToken(currentToken.tokenNumber, currentToken.patientName)}
            style={{ padding: "10px 18px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, boxShadow: "0 4px 12px rgba(245,158,11,0.4)" }}>
            🔊 Repeat
          </button>
        </div>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <div style={{ background: C.white, borderRadius: 16, padding: "48px 24px", textAlign: "center", border: `1px solid ${C.gray200}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 8 }}>No tokens today</div>
          <div style={{ color: C.gray400, fontSize: 13, marginBottom: 20 }}>Tokens are auto-generated from today's appointments</div>
          <button onClick={() => setShowWalkIn(true)}
            style={{ padding: "11px 24px", background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            + Add Walk-in Patient
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Group by status */}
          {["called", "waiting", "completed", "skipped"].map(status => {
            const group = tokens.filter(t => t.tokenStatus === status);
            if (group.length === 0) return null;
            const labels = { called: "📢 Currently Called", waiting: "⏳ Waiting", completed: "✅ Completed", skipped: "⏭ Skipped" };
            return (
              <div key={status}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 4 }}>
                  {labels[status]} ({group.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {group.map(token => (
                    <TokenCard key={token.id} token={token}
                      onCall={t => updateTokenStatus(t, "called")}
                      onComplete={t => updateTokenStatus(t, "completed")}
                      onSkip={t => updateTokenStatus(t, "skipped")}
                      onPrint={t => printToken(t, doctor)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Walk-in Modal */}
      {showWalkIn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.white, borderRadius: 18, padding: 32, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", animation: "fadeUp 0.3s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>🚶 Walk-in Patient</div>
                <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>Issue Token #{tokens.length + 1}</div>
              </div>
              <button onClick={() => setShowWalkIn(false)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: C.gray400 }}>×</button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.gray600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Patient Name *</label>
              <input value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="e.g. Muhammad Ali"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `2px solid ${C.gray200}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = C.teal} onBlur={e => e.target.style.borderColor = C.gray200} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.gray600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone <span style={{ color: C.gray400, fontWeight: 400 }}>(optional)</span></label>
              <input value={walkInPhone} onChange={e => setWalkInPhone(e.target.value)} placeholder="+92 300 1234567"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `2px solid ${C.gray200}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = C.teal} onBlur={e => e.target.style.borderColor = C.gray200} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.gray600, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reason <span style={{ color: C.gray400, fontWeight: 400 }}>(optional)</span></label>
              <input value={walkInReason} onChange={e => setWalkInReason(e.target.value)} placeholder="e.g. Fever, checkup, follow-up"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", border: `2px solid ${C.gray200}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = C.teal} onBlur={e => e.target.style.borderColor = C.gray200} />
            </div>

            {/* Preview token */}
            <div style={{ background: C.navy, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 12, background: C.teal, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>TOKEN</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>#{tokens.length + 1}</div>
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{walkInName || "Patient Name"}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>🚶 Walk-in · {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowWalkIn(false)}
                style={{ flex: 1, padding: "12px", background: C.gray100, color: C.gray600, border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
              <button onClick={addWalkIn} disabled={!walkInName.trim()}
                style={{ flex: 2, padding: "12px", background: walkInName.trim() ? `linear-gradient(135deg,${C.teal},${C.tealDark})` : C.gray200, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: walkInName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                🎫 Issue Token #{tokens.length + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

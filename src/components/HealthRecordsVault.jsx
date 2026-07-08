// src/components/HealthRecordsVault.jsx
import { useState, useEffect } from "react";
import { T, Card, Spinner } from "./UI";
import { getPrescriptionsForPatient } from "../firebase/services";

const trendArrow = (current, previous) => {
  if (current == null || previous == null || current === "" || previous === "") return null;
  const c = parseFloat(current), p = parseFloat(previous);
  if (isNaN(c) || isNaN(p)) return null;
  if (c > p) return { symbol: "↑", color: "#ef4444" };
  if (c < p) return { symbol: "↓", color: "#16a34a" };
  return { symbol: "→", color: T.muted };
};

function VitalCard({ label, unit, current, previous, icon }) {
  if (!current) return null;
  const trend = trendArrow(current, previous);
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: `1px solid ${T.border}`, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{current}</span>
        <span style={{ fontSize: 12, color: T.muted }}>{unit}</span>
        {trend && <span style={{ fontSize: 16, fontWeight: 900, color: trend.color, marginLeft: "auto" }}>{trend.symbol}</span>}
      </div>
      {previous && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Previous: {previous} {unit}</div>}
    </div>
  );
}

export default function HealthRecordsVault({ user, profile }) {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await getPrescriptionsForPatient(profile, user);
      setRecords(data);
    })();
  }, [user, profile]);

  if (records === null) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: T.muted }}>
        <Spinner /> <div style={{ marginTop: 12 }}>Loading your health records…</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div>
        <h2 style={{ margin: "0 0 18px", fontSize: 20, fontWeight: 800, color: T.text }}>🗂️ Health Records</h2>
        <Card style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 8 }}>No health records yet</div>
          <div style={{ color: T.muted, fontSize: 13 }}>Once a doctor writes you a prescription, your visit history, vitals, and diagnoses will appear here automatically.</div>
        </Card>
      </div>
    );
  }

  // Records are sorted ascending (oldest first) by the service function —
  // that's what makes "latest vs previous" trend comparisons below correct.
  const latest = records[records.length - 1];
  const previous = records.length > 1 ? records[records.length - 2] : null;

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingFollowUps = records.filter(r => r.followUp && r.followUp >= todayStr);

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: T.text }}>🗂️ Health Records</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: T.muted }}>Your full clinical history in one place — vitals, diagnoses, and prescriptions across every visit.</p>

      {upcomingFollowUps.length > 0 && (
        <div style={{ background: "linear-gradient(135deg,#1B3A5C,#2d5a8e)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 24 }}>📅</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Upcoming Follow-up{upcomingFollowUps.length > 1 ? "s" : ""}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
              {upcomingFollowUps.map(r => `${r.followUp} with ${r.doctorName || r.doctor?.name || "your doctor"}`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Vitals trend — only shown when the latest visit actually recorded any */}
      {(latest.weight || latest.height || latest.bp) && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Latest Vitals</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <VitalCard label="Weight" unit="kg" icon="⚖️" current={latest.weight} previous={previous?.weight} />
            <VitalCard label="Height" unit="cm" icon="📏" current={latest.height} previous={previous?.height} />
            <VitalCard label="Blood Pressure" unit="" icon="❤️" current={latest.bp} previous={previous?.bp} />
          </div>
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 800, color: T.primary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Visit History</div>
      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: T.border }} />
        {[...records].reverse().map((rx, i) => {
          const meds = (rx.medicines || []).filter(m => m.name);
          const labs = (rx.labTests || []).filter(t => t.name);
          return (
            <div key={rx.firestoreId || i} style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: T.primary, border: "2px solid #fff", boxShadow: "0 0 0 2px " + T.primary }} />
              <Card style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{rx.doctorName || rx.doctor?.name || "Doctor"}</div>
                    <div style={{ fontSize: 12, color: T.primary, fontWeight: 600 }}>{rx.doctorSpecialty || rx.doctor?.specialty || ""}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{rx.date}</div>
                </div>

                {rx.diagnosis && (
                  <div style={{ marginBottom: 10, padding: "10px 12px", background: T.bg, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 3 }}>Diagnosis / Plan</div>
                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{rx.diagnosis}</div>
                  </div>
                )}

                {meds.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.primary, textTransform: "uppercase", marginBottom: 5 }}>💊 Medicines</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {meds.map((m, mi) => (
                        <span key={mi} style={{ background: T.primaryLight, color: T.text, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>
                          {m.name}{m.strength ? ` ${m.strength}` : ""} · {m.frequency}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {labs.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", marginBottom: 5 }}>🔬 Lab Tests</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {labs.map((t, ti) => (
                        <span key={ti} style={{ background: "#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20 }}>{t.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {rx.followUp && (
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>📅 Follow-up: <strong style={{ color: T.text }}>{rx.followUp}</strong></div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

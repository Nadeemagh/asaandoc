// src/components/AdminBackupRestore.jsx
// Drop into src/components/, then add as a tab in AdminPanel.js (see
// integration notes at the bottom of this file).
import { useState } from "react";
import { getAllDocsRaw, restoreCollectionDocs } from "../firebase/services";

const T = {
  primary: "#2ABFBF", primaryDark: "#1a9999", primaryLight: "#e8f9f9",
  navy: "#1B3A5C", navyLight: "#2d5a8e", white: "#fff", bg: "#f8fafc",
  border: "#e2e8f0", text: "#1e293b", muted: "#94a3b8",
  accent: "#10b981", red: "#ef4444", amber: "#f59e0b",
};

// Which collections this tool knows how to back up / restore.
// Add more entries here any time you want another collection included.
const COLLECTIONS = [
  { key: "doctors", label: "Doctors" },
  { key: "users", label: "Users" },
  { key: "appointments", label: "Appointments" },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "promotions", label: "Promotions" },
  { key: "membershipPlans", label: "Membership Plans" },
];

export default function AdminBackupRestore() {
  const [counts, setCounts] = useState({});     // { doctors: 12, users: 340, ... }
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [checked, setChecked] = useState(false);

  const [backingUp, setBackingUp] = useState(false);
  const [backupError, setBackupError] = useState("");

  const [file, setFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    setCheckError("");
    setChecked(false);
    try {
      const newCounts = {};
      for (const c of COLLECTIONS) {
        const docs = await getAllDocsRaw(c.key);
        newCounts[c.key] = docs.length;
      }
      setCounts(newCounts);
      setChecked(true);
    } catch (e) {
      console.error("Connection check failed:", e);
      setCheckError(e.message || "Connection failed. Check Firestore security rules for this account.");
    }
    setChecking(false);
  };

  const downloadBackup = async () => {
    setBackingUp(true);
    setBackupError("");
    try {
      const backup = {
        exportedAt: new Date().toISOString(),
        project: "asaandoc-e0581",
        collections: {},
      };
      for (const c of COLLECTIONS) {
        backup.collections[c.key] = await getAllDocsRaw(c.key);
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.href = url;
      a.download = `asaandoc-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup failed:", e);
      setBackupError(e.message || "Backup failed.");
    }
    setBackingUp(false);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setRestoreResults(null);
    setRestoreError("");
  };

  const runRestore = async () => {
    if (!file) return;
    setShowConfirm(false);
    setRestoring(true);
    setRestoreError("");
    setRestoreResults(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const collectionsData = parsed.collections || {};
      const results = [];
      for (const key of Object.keys(collectionsData)) {
        const docsArray = collectionsData[key];
        if (!Array.isArray(docsArray)) continue;
        const r = await restoreCollectionDocs(key, docsArray);
        results.push(r);
      }
      setRestoreResults(results);
      setConfirmText("");
    } catch (e) {
      console.error("Restore failed:", e);
      setRestoreError(e.message || "Restore failed. Make sure this is a valid AsaanDoc backup file.");
    }
    setRestoring(false);
  };

  const totalDocsInFile = restoreResults
    ? restoreResults.reduce((s, r) => s + r.success + r.failed, 0)
    : null;

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,${T.primary},${T.navy})`, borderRadius: 18,
        padding: "28px 32px", color: "#fff", marginBottom: 20, textAlign: "center",
      }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>🔐 AsaanDoc Backup & Restore</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>Backup and restore your doctors and users data safely</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>asaandoc-e0581 · Firestore</div>
      </div>

      {/* Connection check */}
      <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 14 }}>🔌 Firebase Connection</div>

        {checkError && (
          <div style={{ background: "#fef2f2", border: `1.5px solid ${T.red}`, color: T.red, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            ✗ Connection failed: {checkError}
          </div>
        )}
        {checked && !checkError && (
          <div style={{ background: "#f0fdf4", border: `1.5px solid ${T.accent}`, color: T.accent, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            ✓ Connected successfully
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(COLLECTIONS.length, 3)},1fr)`, gap: 12, marginBottom: 16 }}>
          {COLLECTIONS.map(c => (
            <div key={c.key} style={{ background: T.bg, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: checked ? T.primary : T.muted }}>
                {checked ? (counts[c.key] ?? "—") : "—"}
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <button onClick={checkConnection} disabled={checking}
          style={{ width: "100%", padding: "13px", background: `linear-gradient(135deg,${T.primary},${T.navy})`, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: checking ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {checking ? "Checking…" : "🔄 Check Connection"}
        </button>
      </div>

      {/* Backup */}
      <div style={{ background: T.white, borderRadius: 16, border: `1px solid ${T.border}`, padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 6 }}>📤 Backup Data</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
          Download all doctors, users, appointments, prescriptions, promotions and membership plans as a single JSON file to your computer.
        </div>
        {backupError && (
          <div style={{ background: "#fef2f2", border: `1.5px solid ${T.red}`, color: T.red, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            ✗ {backupError}
          </div>
        )}
        <button onClick={downloadBackup} disabled={backingUp}
          style={{ width: "100%", padding: "13px", background: backingUp ? T.muted : `linear-gradient(135deg,${T.accent},#059669)`, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: backingUp ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {backingUp ? "Preparing backup…" : "💾 Download Backup (JSON)"}
        </button>
      </div>

      {/* Restore */}
      <div style={{ background: T.white, borderRadius: 16, border: `1.5px solid ${T.amber}`, padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.text, marginBottom: 6 }}>📥 Restore Data</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>
          Upload a previously downloaded backup JSON file to restore data.
        </div>
        <div style={{ fontSize: 12, color: T.amber, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          ⚠️ This overwrites existing documents with matching IDs. It cannot be undone.
        </div>

        <input type="file" accept="application/json" onChange={handleFileChange}
          style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 13, marginBottom: 14, fontFamily: "inherit" }} />

        {restoreError && (
          <div style={{ background: "#fef2f2", border: `1.5px solid ${T.red}`, color: T.red, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            ✗ {restoreError}
          </div>
        )}

        {restoreResults && (
          <div style={{ background: "#f0fdf4", border: `1.5px solid ${T.accent}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: T.accent, marginBottom: 6 }}>✓ Restore complete — {totalDocsInFile} document(s) processed</div>
            {restoreResults.map(r => (
              <div key={r.collection} style={{ fontSize: 12, color: T.text, marginTop: 2 }}>
                {r.collection}: {r.success} restored{r.failed > 0 ? `, ${r.failed} failed` : ""}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setShowConfirm(true)} disabled={!file || restoring}
          style={{ width: "100%", padding: "13px", background: (!file || restoring) ? T.muted : `linear-gradient(135deg,${T.red},#b91c1c)`, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: (!file || restoring) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {restoring ? "Restoring…" : "♻️ Restore from Backup"}
        </button>
      </div>

      {/* Confirmation modal — restore is destructive, so require typing to confirm */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: T.text, textAlign: "center", marginBottom: 8 }}>Confirm Restore</div>
            <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginBottom: 16, lineHeight: 1.5 }}>
              This will overwrite any existing documents that share an ID with items in this backup file. This cannot be undone. Type <strong>RESTORE</strong> below to confirm.
            </div>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Type RESTORE"
              style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, marginBottom: 16, fontFamily: "inherit", boxSizing: "border-box", textAlign: "center" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                style={{ flex: 1, padding: "11px", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: T.muted }}>
                Cancel
              </button>
              <button onClick={runRestore} disabled={confirmText !== "RESTORE"}
                style={{ flex: 1, padding: "11px", background: confirmText === "RESTORE" ? T.red : T.muted, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: confirmText === "RESTORE" ? "pointer" : "not-allowed" }}>
                Restore Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
INTEGRATION NOTES — add to src/pages/AdminPanel.js:

1. Import at the top:
   import AdminBackupRestore from "../components/AdminBackupRestore";

2. Add to the nav array:
   ["backup","💾","Backup"],

3. Render it in the matching view block:
   {view==="backup" && <AdminBackupRestore/>}

WHY THE OLD TOOL SHOWED "Missing or insufficient permissions":
That version likely ran as a separate/standalone page with its own
Firebase initialization (possibly signed out, or pointed at a
different project/config). Because this version lives *inside*
AdminPanel.js, it reuses the exact same authenticated Firestore
connection your dashboard already uses successfully — so as long as
your existing Admin Panel works today, this will too.
───────────────────────────────────────────────────────────── */

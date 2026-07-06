// src/App.js
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import PatientPortal from "./pages/PatientPortal";
import DoctorDashboard from "./pages/DoctorDashboard";
import InstallPrompt from "./components/InstallPrompt";
import DoctorProfilePage from "./pages/DoctorProfilePage";
const ADMIN_EMAILS = ["admin@asaandoc.com"];
function AdminPanelLoader() {
  try {
    const AdminPanel = require("./pages/AdminPanel").default;
    return <AdminPanel />;
  } catch(e) {
    return (
      <div style={{ padding:40, textAlign:"center", fontFamily:"Inter,sans-serif" }}>
        <h2>Admin Panel Error</h2>
        <p style={{ color:"red" }}>{e.message}</p>
        <button onClick={() => window.location.reload()} style={{ padding:"10px 20px", marginTop:16, cursor:"pointer" }}>Reload</button>
      </div>
    );
  }
}
// ── Full screen loading spinner ───────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* AsaanDoc logo */}
      <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 24, color: "#1B3A5C" }}>
        asaan<span style={{ color: "#2ABFBF" }}>doc</span>
      </div>
      {/* Spinner */}
      <div style={{
        width: 40, height: 40,
        border: "4px solid #e2e8f0",
        borderTop: "4px solid #2ABFBF",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginTop: 16, fontSize: 13, color: "#94a3b8" }}>Loading...</div>
    </div>
  );
}
export default function App() {
  const { user, profile, loading } = useAuth();

  // ── PUBLIC DOCTOR PROFILE (no login required) ──────────────
  // Matches /doctor/dr-name-specialty-abcd — checked before any auth
  // logic so it works whether or not anyone is signed in.
  const path = window.location.pathname;
  const doctorMatch = path.match(/^\/doctor\/([^/]+)\/?$/);
  if (doctorMatch) {
    return <DoctorProfilePage slug={doctorMatch[1]} />;
  }

  // ── Show loading screen until role is fully resolved ──────
  // This prevents ANY flash of wrong portal
  if (loading) return <LoadingScreen />;
  // ── Not logged in ─────────────────────────────────────────
  if (!user) return (
    <>
      <AuthPage />
      <InstallPrompt />
    </>
  );
  // ── Admin ─────────────────────────────────────────────────
  if (ADMIN_EMAILS.includes(user.email?.toLowerCase().trim())) {
    return <AdminPanelLoader />;
  }
  // ── Doctor ────────────────────────────────────────────────
  if (profile?.role === "doctor") return (
    <>
      <DoctorDashboard />
      <InstallPrompt />
    </>
  );
  // ── Patient (default) ─────────────────────────────────────
  return (
    <>
      <PatientPortal />
      <InstallPrompt />
    </>
  );
}

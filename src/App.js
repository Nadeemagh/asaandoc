// src/App.js
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import PatientPortal from "./pages/PatientPortal";
import DoctorDashboard from "./pages/DoctorDashboard";
import { Spinner } from "./components/UI";

const ADMIN_EMAILS = ["admin@asaandoc.com"];

// Lazy load AdminPanel to avoid blank screen on error
function AdminPanelLoader() {
  try {
    const AdminPanel = require("./pages/AdminPanel").default;
    return <AdminPanel />;
  } catch(e) {
    console.error("AdminPanel error:", e);
    return (
      <div style={{ padding:40, textAlign:"center", fontFamily:"Inter,sans-serif" }}>
        <h2>Admin Panel Error</h2>
        <p style={{ color:"red" }}>{e.message}</p>
        <button onClick={() => window.location.reload()} style={{ padding:"10px 20px", marginTop:16, cursor:"pointer" }}>
          Reload
        </button>
      </div>
    );
  }
}

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner />
    </div>
  );

  if (!user) return <AuthPage />;

  if (ADMIN_EMAILS.includes(user.email?.toLowerCase().trim())) {
    return <AdminPanelLoader />;
  }

  if (profile?.role === "doctor") return <DoctorDashboard />;
  return <PatientPortal />;
}

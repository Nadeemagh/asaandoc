// src/App.js
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import PatientPortal from "./pages/PatientPortal";
import DoctorDashboard from "./pages/DoctorDashboard";
import InstallPrompt from "./components/InstallPrompt";
import { Spinner } from "./components/UI";

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

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner />
    </div>
  );

  if (!user) return (
    <>
      <AuthPage />
      <InstallPrompt />
    </>
  );

  if (ADMIN_EMAILS.includes(user.email?.toLowerCase().trim())) {
    return <AdminPanelLoader />;
  }

  if (profile?.role === "doctor") return (
    <>
      <DoctorDashboard />
      <InstallPrompt />
    </>
  );

  return (
    <>
      <PatientPortal />
      <InstallPrompt />
    </>
  );
}

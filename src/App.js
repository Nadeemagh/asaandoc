// src/App.js
import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import PatientPortal from "./pages/PatientPortal";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminPanel from "./pages/AdminPanel";
import { Spinner } from "./components/UI";

const ADMIN_EMAILS = ["admin@asaandoc.com"];

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner />
    </div>
  );

  if (!user) return <AuthPage />;

  if (ADMIN_EMAILS.includes(user.email?.toLowerCase().trim())) {
    return <AdminPanel />;
  }

  if (profile?.role === "doctor") return <DoctorDashboard />;
  return <PatientPortal />;
}

// src/App.js
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage       from "./pages/AuthPage";
import PatientPortal  from "./pages/PatientPortal";
import DoctorDashboard from "./pages/DoctorDashboard";

function AppInner() {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"#f4f8fa", fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🏥</div>
        <div style={{ fontWeight:700, color:"#218EB6", fontSize:16 }}>Loading AsaanDoc...</div>
      </div>
    </div>
  );

  if (!user) return <AuthPage />;

  if (profile?.role === "doctor") return <DoctorDashboard />;

  return <PatientPortal />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

// src/pages/AdminPanel.js
import { useState, useEffect } from "react";
import { logoutUser } from "../firebase/services";
import { getDoctors, getAllUsers, getAllAppointments } from "../firebase/services";

export default function AdminPanel() {
  const [data, setData] = useState({ doctors: [], users: [], appointments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getDoctors(), getAllUsers(), getAllAppointments()])
      .then(([doctors, users, appointments]) => {
        setData({ doctors, users, appointments });
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ padding:40, textAlign:"center", fontFamily:"Inter,sans-serif" }}>
      <div style={{ fontSize:24 }}>⏳</div>
      <div>Loading admin data...</div>
    </div>
  );

  if (error) return (
    <div style={{ padding:40, fontFamily:"Inter,sans-serif" }}>
      <h2 style={{ color:"red" }}>Error: {error}</h2>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  );

  return (
    <div style={{ padding:40, fontFamily:"Inter,sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
        <h1 style={{ margin:0 }}>🔐 Admin Panel</h1>
        <button onClick={logoutUser} style={{ padding:"8px 16px", cursor:"pointer" }}>Sign Out</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:32 }}>
        <div style={{ padding:20, background:"#e0f2fe", borderRadius:12, textAlign:"center" }}>
          <div style={{ fontSize:32, fontWeight:800 }}>{data.doctors.length}</div>
          <div>Doctors</div>
        </div>
        <div style={{ padding:20, background:"#e6faf5", borderRadius:12, textAlign:"center" }}>
          <div style={{ fontSize:32, fontWeight:800 }}>{data.users.filter(u=>u.role==="patient").length}</div>
          <div>Patients</div>
        </div>
        <div style={{ padding:20, background:"#f5f3ff", borderRadius:12, textAlign:"center" }}>
          <div style={{ fontSize:32, fontWeight:800 }}>{data.appointments.length}</div>
          <div>Appointments</div>
        </div>
      </div>
      <h2>Doctors</h2>
      {data.doctors.map(d => (
        <div key={d.id} style={{ padding:16, border:"1px solid #ddd", borderRadius:8, marginBottom:8 }}>
          <b>{d.name}</b> — {d.specialty}
        </div>
      ))}
    </div>
  );
}

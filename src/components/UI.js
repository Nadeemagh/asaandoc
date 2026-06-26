// src/components/UI.js
export const T = {
  primary: "#218EB6", primaryDark: "#155f7a", primaryLight: "#e8f5fb",
  accent: "#00C897", accentLight: "#e6faf5",
  warn: "#F59E0B", warnLight: "#fffbeb",
  danger: "#EF4444", dangerLight: "#fef2f2",
  text: "#0f2b38", muted: "#6a8a9a", border: "#dde8ed",
  bg: "#f4f8fa", white: "#ffffff",
};

export const Badge = ({ status }) => {
  const map = {
    confirmed: { bg: "#e6faf5", color: "#00C897", label: "Confirmed" },
    pending:   { bg: "#fffbeb", color: "#F59E0B", label: "Pending"   },
    completed: { bg: "#f0f0f0", color: "#666",    label: "Completed" },
    cancelled: { bg: "#fef2f2", color: "#EF4444", label: "Cancelled" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, letterSpacing: "0.3px", textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
};

export const Avatar = ({ initials, color, size = 38 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color || T.primary,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 800, fontSize: size * 0.35, flexShrink: 0 }}>
    {initials}
  </div>
);

export const Card = ({ children, style = {} }) => (
  <div style={{ background: T.white, borderRadius: 16, padding: "20px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)", ...style }}>
    {children}
  </div>
);

export const StatCard = ({ label, value, icon, color, sub }) => (
  <div style={{ background: T.white, borderRadius: 14, padding: "18px 20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderLeft: `4px solid ${color}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 26 }}>{icon}</div>
    </div>
  </div>
);

export const Toast = ({ msg, type = "success", onClose }) => (
  <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999,
    background: type === "error" ? T.danger : T.text,
    color: "#fff", padding: "14px 20px", borderRadius: 12,
    boxShadow: "0 8px 30px rgba(0,0,0,0.2)", fontSize: 14, fontWeight: 500,
    display: "flex", alignItems: "center", gap: 10 }}>
    <span>{type === "error" ? "❌" : "✅"}</span>
    {msg}
    <button onClick={onClose} style={{ background: "none", border: "none",
      color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
  </div>
);

export const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 36, height: 36, border: `3px solid ${T.border}`,
      borderTop: `3px solid ${T.primary}`, borderRadius: "50%",
      animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 9,
  border: `1.5px solid ${T.border}`, fontSize: 14, color: T.text,
  background: T.white, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

export const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 700, color: T.muted,
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px",
};

export const btnPrimary = {
  padding: "12px 24px", background: `linear-gradient(135deg,#218EB6,#155f7a)`,
  color: "#fff", border: "none", borderRadius: 10, fontWeight: 700,
  fontSize: 14, cursor: "pointer", width: "100%",
  boxShadow: "0 4px 14px rgba(33,142,182,0.3)",
};

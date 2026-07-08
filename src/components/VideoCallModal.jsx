// src/components/VideoCallModal.jsx
// Fullscreen video consultation using Jitsi Meet (free, no API key needed).
// Each appointment gets its own private room name tied to its Firestore
// document ID (see videoRoomId generated in services.js bookAppointment),
// so the URL isn't guessable by anyone who wasn't given the link.
export default function VideoCallModal({ roomId, displayName, onClose }) {
  if (!roomId) return null;

  const jitsiUrl = `https://meet.jit.si/${roomId}#userInfo.displayName="${encodeURIComponent(displayName || "AsaanDoc User")}"&config.prejoinPageEnabled=true`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 3000, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "#1B3A5C", flexShrink: 0 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
          🎥 AsaanDoc Video Consultation
        </div>
        <button onClick={onClose}
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          ✕ Leave Call
        </button>
      </div>
      <iframe
        title="AsaanDoc Video Consultation"
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style={{ flex: 1, border: "none", width: "100%" }}
      />
    </div>
  );
}

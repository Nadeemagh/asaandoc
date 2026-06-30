// src/components/InstallPrompt.js
import { useState, useEffect } from "react";
import { T } from "./UI";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
      setInstalled(true);
    }
  };

  if (installed || !show) return null;

  return (
    <div style={{
      position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
      zIndex:9999, width:"calc(100% - 40px)", maxWidth:420,
      background:"#fff", borderRadius:16, padding:"16px 20px",
      boxShadow:"0 8px 32px rgba(0,0,0,0.2)", border:`1.5px solid ${T.border}`,
      display:"flex", alignItems:"center", gap:14, fontFamily:"Inter,sans-serif"
    }}>
      <img src="/logo.png" alt="AsaanDoc" style={{ width:44, height:44, borderRadius:10, flexShrink:0 }}
        onError={e=>{e.target.style.display="none";}} />
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:800, fontSize:14, color:T.text }}>Install AsaanDoc</div>
        <div style={{ fontSize:12, color:T.muted }}>Add to home screen for quick access</div>
      </div>
      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <button onClick={()=>setShow(false)}
          style={{ padding:"8px 14px", background:T.bg, border:`1px solid ${T.border}`,
            borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", color:T.muted }}>
          Later
        </button>
        <button onClick={handleInstall}
          style={{ padding:"8px 14px", background:`linear-gradient(135deg,${T.primary},${T.primaryDark})`,
            border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", color:"#fff" }}>
          Install
        </button>
      </div>
    </div>
  );
}


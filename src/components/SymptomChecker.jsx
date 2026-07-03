// src/components/SymptomChecker.jsx
// AI-powered symptom checker using Claude API
// Analyzes symptoms, suggests specialist, shows matching AsaanDoc doctors

import { useState } from "react";

const C = {
  teal: "#2ABFBF", tealDark: "#1a9999", tealLight: "#e8f9f9",
  navy: "#1B3A5C", navyLight: "#2d5a8e",
  white: "#ffffff", gray50: "#f8fafc", gray100: "#f1f5f9",
  gray200: "#e2e8f0", gray400: "#94a3b8", gray600: "#475569",
  gray800: "#1e293b", red: "#ef4444", green: "#10b981",
  purple: "#7c3aed", amber: "#f59e0b",
};

const QUICK_SYMPTOMS = [
  "Fever & headache", "Chest pain", "Stomach ache",
  "Cough & cold", "Back pain", "Skin rash",
  "Eye problem", "Diabetes concern", "Blood pressure",
  "Anxiety & stress", "Knee pain", "Breathing difficulty",
];

const SPECIALIST_ICONS = {
  "General Physician": "👨‍⚕️",
  "Cardiologist": "❤️",
  "Gastroenterologist": "🫁",
  "Pulmonologist": "🫀",
  "Neurologist": "🧠",
  "Dermatologist": "🩹",
  "Orthopedic": "🦴",
  "ENT Specialist": "👂",
  "Ophthalmologist": "👁",
  "Endocrinologist": "⚗️",
  "Psychiatrist": "🧘",
  "Diabetologist": "🩸",
  "Nutritionist": "🥗",
  "Gynecologist": "👩‍⚕️",
  "Urologist": "🏥",
};

const URGENCY_CONFIG = {
  emergency: { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", label: "🚨 Emergency", text: "Seek immediate medical attention!" },
  urgent:    { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", label: "⚠️ Urgent",    text: "See a doctor within 24 hours." },
  moderate:  { color: "#2ABFBF", bg: "#e8f9f9", border: "#99e6e6", label: "📅 Moderate",  text: "Book an appointment soon." },
  routine:   { color: "#10b981", bg: "#f0fdf4", border: "#86efac", label: "✅ Routine",   text: "Schedule at your convenience." },
};

export default function SymptomChecker({ doctors = [], onBookDoctor }) {
  const [symptoms,   setSymptoms]   = useState("");
  const [age,        setAge]        = useState("");
  const [gender,     setGender]     = useState("Male");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");
  const [step,       setStep]       = useState(1); // 1=input, 2=result
  const [msgHistory, setMsgHistory] = useState([]);
  const [followUp,   setFollowUp]   = useState("");
  const [chatLoading,setChatLoading]= useState(false);

  const addQuickSymptom = (s) => {
    setSymptoms(prev => prev ? `${prev}, ${s}` : s);
  };

  const analyze = async () => {
    if (!symptoms.trim()) { setError("Please describe your symptoms."); return; }
    setError(""); setLoading(true);

    const prompt = `You are AsaanDoc's AI medical assistant for Pakistan. A patient needs help identifying which doctor to see.

Patient Details:
- Age: ${age || "Not specified"}
- Gender: ${gender}
- Symptoms: ${symptoms}

Respond in JSON format only, no extra text:
{
  "assessment": "2-3 sentence plain English summary of likely condition",
  "urdu_assessment": "Same summary in Urdu script",
  "urgency": "emergency|urgent|moderate|routine",
  "specialist": "Most appropriate specialist type",
  "specialist2": "Second option if applicable (or null)",
  "possible_conditions": ["condition1", "condition2", "condition3"],
  "home_care": ["tip1", "tip2", "tip3"],
  "warning_signs": ["sign1", "sign2"],
  "lab_tests": ["test1", "test2"] or [],
  "advice": "One sentence personalized advice"
}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Find matching doctors from AsaanDoc database
      const matched = doctors.filter(d =>
        d.specialty?.toLowerCase().includes(parsed.specialist?.split(" ")[0]?.toLowerCase() || "") ||
        (parsed.specialist2 && d.specialty?.toLowerCase().includes(parsed.specialist2?.split(" ")[0]?.toLowerCase() || ""))
      ).slice(0, 3);

      setResult({ ...parsed, matchedDoctors: matched });
      setMsgHistory([{ role:"user", content: symptoms }, { role:"assistant", content: text }]);
      setStep(2);
    } catch(e) {
      console.error(e);
      setError("Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const askFollowUp = async () => {
    if (!followUp.trim()) return;
    setChatLoading(true);
    const newHistory = [...msgHistory, { role:"user", content: followUp }];

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: "You are AsaanDoc's AI medical assistant for Pakistan. Give concise, helpful medical guidance. Always recommend consulting a real doctor for diagnosis.",
          messages: newHistory,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || "";
      setMsgHistory([...newHistory, { role:"assistant", content: reply }]);
      setFollowUp("");
    } catch(e) {
      console.error(e);
    }
    setChatLoading(false);
  };

  const reset = () => {
    setStep(1); setResult(null); setSymptoms("");
    setAge(""); setGender("Male"); setMsgHistory([]);
  };

  const urgency = result ? URGENCY_CONFIG[result.urgency] || URGENCY_CONFIG.routine : null;
  const icon1 = result ? (SPECIALIST_ICONS[result.specialist] || "👨‍⚕️") : "";
  const icon2 = result?.specialist2 ? (SPECIALIST_ICONS[result.specialist2] || "🏥") : "";

  // ── STEP 1: INPUT ──────────────────────────────────────────
  if (step === 1) return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.navy},${C.navyLight})`, borderRadius:16, padding:"24px 28px", marginBottom:20, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, fontSize:80, opacity:0.08 }}>🤖</div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"rgba(42,191,191,0.2)", border:"2px solid rgba(42,191,191,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>🤖</div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:C.white }}>AI Symptom Checker</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:2 }}>Describe your symptoms — get instant specialist recommendation</div>
          </div>
        </div>
        <div style={{ marginTop:14, padding:"10px 14px", background:"rgba(255,255,255,0.07)", borderRadius:10, fontSize:12, color:"rgba(255,255,255,0.55)", display:"flex", alignItems:"center", gap:8 }}>
          <span>⚕️</span> This is for guidance only. Always consult a qualified doctor for diagnosis and treatment.
        </div>
      </div>

      {/* Quick symptoms */}
      <div style={{ background:C.white, borderRadius:14, padding:"18px 20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:12 }}>⚡ Quick Select Symptoms</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {QUICK_SYMPTOMS.map(s=>(
            <button key={s} onClick={()=>addQuickSymptom(s)}
              style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${symptoms.includes(s)?C.teal:C.gray200}`, background:symptoms.includes(s)?C.tealLight:C.white, color:symptoms.includes(s)?C.teal:C.gray600, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.gray600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Describe Your Symptoms *</label>
          <textarea value={symptoms} onChange={e=>setSymptoms(e.target.value)} rows={4}
            placeholder="e.g. I have had a fever of 101°F for 2 days, along with a sore throat, headache and body aches. I also feel very tired..."
            style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", border:`2px solid ${C.gray200}`, borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", resize:"vertical", lineHeight:1.6, color:C.gray800, transition:"border-color 0.2s" }}
            onFocus={e=>e.target.style.borderColor=C.teal}
            onBlur={e=>e.target.style.borderColor=C.gray200} />
          <div style={{ fontSize:11, color:C.gray400, marginTop:4 }}>{symptoms.length} characters · More detail = better analysis</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.gray600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Age</label>
            <input type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 35" min="1" max="120"
              style={{ width:"100%", boxSizing:"border-box", padding:"10px 14px", border:`2px solid ${C.gray200}`, borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", transition:"border-color 0.2s" }}
              onFocus={e=>e.target.style.borderColor=C.teal}
              onBlur={e=>e.target.style.borderColor=C.gray200} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:C.gray600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.05em" }}>Gender</label>
            <select value={gender} onChange={e=>setGender(e.target.value)}
              style={{ width:"100%", padding:"10px 14px", border:`2px solid ${C.gray200}`, borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none", background:C.white, cursor:"pointer" }}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom:16, padding:"12px 16px", background:"#fef2f2", border:"2px solid #fecaca", borderRadius:10, fontSize:13, color:C.red, fontWeight:600 }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={analyze} disabled={loading || !symptoms.trim()}
        style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", fontWeight:800, fontSize:15, fontFamily:"inherit", cursor:loading||!symptoms.trim()?"not-allowed":"pointer", transition:"all 0.2s",
          background:loading||!symptoms.trim()?"#94a3b8":`linear-gradient(135deg,${C.teal},${C.tealDark} 50%,${C.navy})`,
          color:C.white, boxShadow:loading||!symptoms.trim()?"none":"0 4px 20px rgba(42,191,191,0.4)",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
        {loading ? (
          <><div style={{ width:20, height:20, border:"3px solid rgba(255,255,255,0.3)", borderTop:"3px solid #fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/> Analyzing your symptoms…</>
        ) : "🔍 Analyze Symptoms →"}
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── STEP 2: RESULTS ────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* Back button */}
      <button onClick={reset} style={{ background:"none", border:"none", color:C.teal, fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:16, padding:0, display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
        ← Check Different Symptoms
      </button>

      {/* Urgency banner */}
      {urgency && (
        <div style={{ marginBottom:16, padding:"14px 18px", background:urgency.bg, border:`2px solid ${urgency.border}`, borderRadius:14, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:24 }}>{urgency.label.split(" ")[0]}</div>
          <div>
            <div style={{ fontWeight:800, color:urgency.color, fontSize:15 }}>{urgency.label.split(" ").slice(1).join(" ")}</div>
            <div style={{ fontSize:13, color:urgency.color, opacity:0.8, marginTop:2 }}>{urgency.text}</div>
          </div>
        </div>
      )}

      {/* Assessment */}
      <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>🤖</span> AI Assessment
        </div>
        <p style={{ margin:"0 0 12px", fontSize:14, color:C.gray800, lineHeight:1.7 }}>{result.assessment}</p>
        {result.urdu_assessment && (
          <p style={{ margin:0, fontSize:14, color:C.gray600, lineHeight:1.8, direction:"rtl", fontFamily:"serif", borderTop:`1px solid ${C.gray100}`, paddingTop:10 }}>
            {result.urdu_assessment}
          </p>
        )}
      </div>

      {/* Recommended Specialists */}
      <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>👨‍⚕️ Recommended Specialist</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:160, padding:"14px 16px", borderRadius:12, background:C.tealLight, border:`2px solid ${C.teal}` }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{icon1}</div>
            <div style={{ fontWeight:800, color:C.navy, fontSize:14 }}>{result.specialist}</div>
            <div style={{ fontSize:11, color:C.teal, fontWeight:600, marginTop:2 }}>Primary Recommendation</div>
          </div>
          {result.specialist2 && (
            <div style={{ flex:1, minWidth:160, padding:"14px 16px", borderRadius:12, background:C.gray50, border:`2px solid ${C.gray200}` }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{icon2}</div>
              <div style={{ fontWeight:800, color:C.navy, fontSize:14 }}>{result.specialist2}</div>
              <div style={{ fontSize:11, color:C.gray600, fontWeight:600, marginTop:2 }}>Alternative Option</div>
            </div>
          )}
        </div>
      </div>

      {/* Possible conditions */}
      {result.possible_conditions?.length > 0 && (
        <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:12 }}>🔍 Possible Conditions</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {result.possible_conditions.map((c,i)=>(
              <span key={i} style={{ padding:"6px 14px", borderRadius:20, background:"#f5f3ff", color:C.purple, fontSize:12, fontWeight:600, border:"1.5px solid #ddd6fe" }}>{c}</span>
            ))}
          </div>
          <div style={{ fontSize:11, color:C.gray400, marginTop:10 }}>⚠️ These are possibilities only — not a diagnosis. Consult a doctor to confirm.</div>
        </div>
      )}

      {/* Matching doctors from AsaanDoc */}
      {result.matchedDoctors?.length > 0 && (
        <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`2px solid ${C.teal}`, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>🏥 Available on AsaanDoc</div>
          <div style={{ fontSize:12, color:C.gray400, marginBottom:14 }}>Book directly with these specialists</div>
          {result.matchedDoctors.map((doc,i)=>{
            const fees = (doc.clinics||[]).map(c=>Number(c.fee||0)).filter(f=>f>0);
            const minFee = fees.length>0?Math.min(...fees):0;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px", borderRadius:12, background:C.gray50, border:`1px solid ${C.gray200}`, marginBottom:10 }}>
                {doc.photo
                  ?<img src={doc.photo} alt={doc.name} style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} onError={e=>{e.target.style.display="none";}}/>
                  :<div style={{ width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg,${C.teal},${C.navy})`, display:"flex", alignItems:"center", justifyContent:"center", color:C.white, fontWeight:800, fontSize:18, flexShrink:0 }}>{doc.name?.charAt(0)||"D"}</div>
                }
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:C.navy }}>{doc.name}</div>
                  <div style={{ fontSize:12, color:C.teal, fontWeight:600 }}>{doc.specialty}</div>
                  <div style={{ fontSize:11, color:C.gray400 }}>⏳ {doc.exp} years experience</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  {minFee>0 && <div style={{ fontSize:13, fontWeight:800, color:C.teal, marginBottom:6 }}>PKR {minFee.toLocaleString()}</div>}
                  <button onClick={()=>onBookDoctor&&onBookDoctor(doc)}
                    style={{ padding:"8px 16px", background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, color:C.white, border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Book Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {result.matchedDoctors?.length === 0 && (
        <div style={{ background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:14, padding:"16px 20px", marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#92400e", marginBottom:4 }}>
            No {result.specialist} available on AsaanDoc yet
          </div>
          <div style={{ fontSize:12, color:"#78350f" }}>We're adding more specialists soon. Try searching all doctors in the Doctors tab.</div>
        </div>
      )}

      {/* Two columns: home care + warning signs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {result.home_care?.length > 0 && (
          <div style={{ background:C.white, borderRadius:14, padding:"16px", border:`1px solid ${C.gray200}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:10 }}>🏠 Home Care Tips</div>
            {result.home_care.map((tip,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
                <span style={{ color:C.green, fontWeight:700, fontSize:14, flexShrink:0 }}>✓</span>
                <span style={{ fontSize:12, color:C.gray800, lineHeight:1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        )}
        {result.warning_signs?.length > 0 && (
          <div style={{ background:"#fef2f2", borderRadius:14, padding:"16px", border:"1px solid #fecaca" }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.red, marginBottom:10 }}>🚨 Seek Emergency If</div>
            {result.warning_signs.map((sign,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
                <span style={{ color:C.red, fontWeight:700, fontSize:14, flexShrink:0 }}>!</span>
                <span style={{ fontSize:12, color:"#991b1b", lineHeight:1.5 }}>{sign}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lab tests */}
      {result.lab_tests?.length > 0 && (
        <div style={{ background:C.white, borderRadius:14, padding:"16px 20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>🧪 Suggested Lab Tests</div>
            <span style={{ fontSize:11, color:C.red, fontWeight:700, background:"#fef2f2", padding:"2px 8px", borderRadius:20 }}>20% OFF on AsaanDoc</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {result.lab_tests.map((t,i)=>(
              <span key={i} style={{ padding:"5px 12px", borderRadius:20, background:"#f5f3ff", color:C.purple, fontSize:12, fontWeight:600, border:"1.5px solid #ddd6fe" }}>🧪 {t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up chat */}
      <div style={{ background:C.white, borderRadius:14, padding:"20px", border:`1px solid ${C.gray200}`, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:14 }}>💬 Ask Follow-up Questions</div>

        {/* Chat history */}
        {msgHistory.slice(2).map((msg,i)=>(
          <div key={i} style={{ marginBottom:10, display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start" }}>
            <div style={{
              maxWidth:"80%", padding:"10px 14px", borderRadius:12, fontSize:13, lineHeight:1.6,
              background:msg.role==="user"?C.teal:C.gray100,
              color:msg.role==="user"?C.white:C.gray800,
              borderBottomRightRadius:msg.role==="user"?4:12,
              borderBottomLeftRadius:msg.role==="assistant"?4:12,
            }}>{msg.content}</div>
          </div>
        ))}

        <div style={{ display:"flex", gap:10, marginTop:8 }}>
          <input value={followUp} onChange={e=>setFollowUp(e.target.value)}
            placeholder="e.g. Can I take paracetamol? How long will this last?"
            onKeyDown={e=>e.key==="Enter"&&!chatLoading&&askFollowUp()}
            style={{ flex:1, padding:"10px 14px", border:`2px solid ${C.gray200}`, borderRadius:10, fontSize:13, fontFamily:"inherit", outline:"none" }}
            onFocus={e=>e.target.style.borderColor=C.teal}
            onBlur={e=>e.target.style.borderColor=C.gray200} />
          <button onClick={askFollowUp} disabled={chatLoading||!followUp.trim()}
            style={{ padding:"10px 18px", background:C.teal, color:C.white, border:"none", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}>
            {chatLoading?"…":"Send"}
          </button>
        </div>
        <div style={{ fontSize:11, color:C.gray400, marginTop:8 }}>Press Enter to send · This is AI guidance, not medical advice</div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding:"14px 16px", background:C.gray50, borderRadius:12, border:`1px solid ${C.gray200}`, fontSize:12, color:C.gray600, lineHeight:1.6 }}>
        ⚕️ <strong>Medical Disclaimer:</strong> This AI tool provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns.
      </div>
    </div>
  );
}

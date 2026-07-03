// src/components/SymptomChecker.jsx
import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase/config";

const C = {
  teal:"#2ABFBF", tealDark:"#1a9999", tealLight:"#e8f9f9",
  navy:"#1B3A5C", navyLight:"#2d5a8e",
  white:"#ffffff", gray50:"#f8fafc", gray100:"#f1f5f9",
  gray200:"#e2e8f0", gray400:"#94a3b8", gray600:"#475569",
  gray800:"#1e293b", red:"#ef4444", green:"#10b981", purple:"#7c3aed",
};

// ── Symptom Categories ────────────────────────────────────────
const CATEGORIES = [
  {
    id:"general", label:"General", icon:"🤒", color:"#2ABFBF", bg:"#e8f9f9",
    symptoms:["Fever & headache","Cough & cold","Body aches","Fatigue","Nausea","Vomiting"],
  },
  {
    id:"heart", label:"Heart & BP", icon:"❤️", color:"#ef4444", bg:"#fef2f2",
    symptoms:["Chest pain","High blood pressure","Palpitations","Shortness of breath","Dizziness"],
  },
  {
    id:"stomach", label:"Stomach", icon:"🫁", color:"#f59e0b", bg:"#fffbeb",
    symptoms:["Stomach ache","Acidity","Constipation","Diarrhea","Bloating","Loss of appetite"],
  },
  {
    id:"weight", label:"Weight & Diet", icon:"⚖️", color:"#10b981", bg:"#f0fdf4",
    symptoms:["Weight loss","Weight gain","Obesity","Overeating","Poor diet","Slow metabolism"],
  },
  {
    id:"children", label:"Children", icon:"👶", color:"#8b5cf6", bg:"#f5f3ff",
    symptoms:["Autistic child","ADHD child","Child not speaking","Hyperactivity","Learning difficulty","Behavioral issues","Delayed development"],
  },
  {
    id:"mental", label:"Mental Health", icon:"🧠", color:"#7c3aed", bg:"#f5f3ff",
    symptoms:["Anxiety & stress","Depression","Insomnia","Panic attacks","ADHD adult","Mood swings"],
  },
  {
    id:"bones", label:"Bones & Joints", icon:"🦴", color:"#64748b", bg:"#f1f5f9",
    symptoms:["Back pain","Knee pain","Joint pain","Arthritis","Neck pain","Shoulder pain"],
  },
  {
    id:"skin", label:"Skin", icon:"🩹", color:"#ec4899", bg:"#fdf2f8",
    symptoms:["Skin rash","Acne","Eczema","Allergy","Hair loss","Itching"],
  },
  {
    id:"diabetes", label:"Diabetes", icon:"🩸", color:"#dc2626", bg:"#fef2f2",
    symptoms:["Diabetes concern","High blood sugar","Frequent urination","Excessive thirst","Blurred vision","Slow healing wounds"],
  },
  {
    id:"eyes", label:"Eyes & ENT", icon:"👁️", color:"#0ea5e9", bg:"#f0f9ff",
    symptoms:["Eye problem","Ear pain","Sore throat","Nose bleeding","Hearing loss","Sinusitis"],
  },
  {
    id:"women", label:"Women", icon:"👩", color:"#ec4899", bg:"#fdf2f8",
    symptoms:["Period problems","Pregnancy concern","PCOS","Hormonal imbalance","Breast pain","Fertility concern"],
  },
  {
    id:"breathing", label:"Breathing", icon:"🫀", color:"#0891b2", bg:"#ecfeff",
    symptoms:["Breathing difficulty","Asthma","Wheezing","Chest tightness","Chronic cough"],
  },
];

const SPECIALIST_ICONS = {
  "General Physician":"👨‍⚕️","Cardiologist":"❤️","Gastroenterologist":"🫁",
  "Pulmonologist":"🫀","Neurologist":"🧠","Dermatologist":"🩹","Orthopedic":"🦴",
  "ENT Specialist":"👂","Ophthalmologist":"👁","Endocrinologist":"⚗️",
  "Psychiatrist":"🧘","Diabetologist":"🩸","Nutritionist":"🥗",
  "Gynecologist":"👩‍⚕️","Urologist":"🏥","Pediatric Neurologist":"👶",
  "Child Psychologist":"🧒","Pediatrician":"🍼","Obesity Specialist":"⚖️",
};

const URGENCY_CONFIG = {
  emergency:{ color:"#ef4444", bg:"#fef2f2", border:"#fecaca", label:"🚨 Emergency", text:"Seek immediate medical attention!" },
  urgent:   { color:"#f59e0b", bg:"#fffbeb", border:"#fde68a", label:"⚠️ Urgent",    text:"See a doctor within 24 hours." },
  moderate: { color:"#2ABFBF", bg:"#e8f9f9", border:"#99e6e6", label:"📅 Moderate",  text:"Book an appointment soon." },
  routine:  { color:"#10b981", bg:"#f0fdf4", border:"#86efac", label:"✅ Routine",   text:"Schedule at your convenience." },
};

export default function SymptomChecker({ doctors=[], onBookDoctor }) {
  const [symptoms,    setSymptoms]    = useState("");
  const [age,         setAge]         = useState("");
  const [gender,      setGender]      = useState("Male");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const [step,        setStep]        = useState(1);
  const [activeCategory, setActiveCategory] = useState("general");
  const [msgHistory,  setMsgHistory]  = useState([]);
  const [followUp,    setFollowUp]    = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [focused,     setFocused]     = useState(false);

  const activeCat = CATEGORIES.find(c=>c.id===activeCategory);

  const addSymptom = (s) => {
    setSymptoms(prev => {
      if (prev.includes(s)) return prev;
      return prev ? `${prev}, ${s}` : s;
    });
  };

  const removeSymptom = (s) => {
    setSymptoms(prev => prev.split(", ").filter(x=>x!==s).join(", "));
  };

  const selectedSymptoms = symptoms ? symptoms.split(", ").filter(Boolean) : [];

  const analyze = async () => {
    if (!symptoms.trim()) { setError("Please select or describe your symptoms."); return; }
    setError(""); setLoading(true);
    try {
      const functions = getFunctions(app);
      const fn = httpsCallable(functions, "analyzeSymptoms");
      const res = await fn({ symptoms, age, gender, isFollowUp:false });
      const text = res.data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const matched = doctors.filter(d=>
        d.specialty?.toLowerCase().includes(parsed.specialist?.split(" ")[0]?.toLowerCase()||"") ||
        (parsed.specialist2&&d.specialty?.toLowerCase().includes(parsed.specialist2?.split(" ")[0]?.toLowerCase()||""))
      ).slice(0,3);
      setResult({...parsed, matchedDoctors:matched});
      setMsgHistory([{role:"user",content:symptoms},{role:"assistant",content:text}]);
      setStep(2);
    } catch(e) {
      console.error(e);
      setError(`Analysis failed: ${e.message||"Please try again."}`);
    }
    setLoading(false);
  };

  const askFollowUp = async () => {
    if (!followUp.trim()) return;
    setChatLoading(true);
    const newHistory = [...msgHistory,{role:"user",content:followUp}];
    try {
      const functions = getFunctions(app);
      const fn = httpsCallable(functions,"analyzeSymptoms");
      const res = await fn({messages:newHistory,isFollowUp:true});
      const reply = res.data.content?.[0]?.text||"";
      setMsgHistory([...newHistory,{role:"assistant",content:reply}]);
      setFollowUp("");
    } catch(e){ console.error(e); }
    setChatLoading(false);
  };

  const reset = () => {
    setStep(1); setResult(null); setSymptoms("");
    setAge(""); setGender("Male"); setMsgHistory([]);
  };

  const urgency = result ? URGENCY_CONFIG[result.urgency]||URGENCY_CONFIG.routine : null;

  // ── STEP 1 ─────────────────────────────────────────────────
  if (step===1) return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:800,margin:"0 auto"}}>
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .cat-btn:hover{transform:translateY(-3px)!important;box-shadow:0 8px 20px rgba(0,0,0,0.12)!important}
        .sym-tag:hover{opacity:0.85}
        .analyze-btn:hover:not(:disabled){transform:translateY(-2px)!important;box-shadow:0 8px 28px rgba(42,191,191,0.5)!important}
      `}</style>

      {/* Hero Header */}
      <div style={{
        background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 50%,#0d4a5a 100%)`,
        borderRadius:20, padding:"28px 32px", marginBottom:20, position:"relative", overflow:"hidden",
        animation:"fadeUp 0.5s ease-out",
      }}>
        <div style={{position:"absolute",top:-30,right:-30,fontSize:120,opacity:0.06}}>🤖</div>
        <div style={{position:"absolute",bottom:-20,left:200,fontSize:80,opacity:0.04}}>💊</div>

        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
          <div style={{
            width:60,height:60,borderRadius:18,
            background:"linear-gradient(135deg,#2ABFBF,#1a9999)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:30,flexShrink:0,
            boxShadow:"0 4px 16px rgba(42,191,191,0.4)",
          }}>🤖</div>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:C.white,letterSpacing:"-0.3px"}}>AI Symptom Checker</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.6)",marginTop:2}}>
              Describe symptoms → Get instant specialist recommendation
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["1. Select Category","2. Pick Symptoms","3. Get AI Analysis"].map((s,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:i===0?"#2ABFBF":"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{i+1}</div>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontWeight:600}}>{s.slice(3)}</span>
            </div>
          ))}
        </div>

        <div style={{marginTop:14,padding:"10px 14px",background:"rgba(255,255,255,0.07)",borderRadius:10,fontSize:12,color:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",gap:8}}>
          ⚕️ For guidance only — always consult a qualified doctor for diagnosis and treatment.
        </div>
      </div>

      {/* Category Pills */}
      <div style={{background:C.white,borderRadius:16,padding:"20px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.5s ease-out 0.1s both"}}>
        <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <span>🗂️</span> Select Health Category
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8}}>
          {CATEGORIES.map(cat=>(
            <button key={cat.id} className="cat-btn" onClick={()=>setActiveCategory(cat.id)}
              style={{
                padding:"12px 8px",borderRadius:14,border:`2px solid ${activeCategory===cat.id?cat.color:C.gray200}`,
                background:activeCategory===cat.id?cat.bg:C.white,
                cursor:"pointer",textAlign:"center",transition:"all 0.2s",
                boxShadow:activeCategory===cat.id?`0 4px 16px ${cat.color}30`:"0 1px 4px rgba(0,0,0,0.05)",
              }}>
              <div style={{fontSize:24,marginBottom:4}}>{cat.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:activeCategory===cat.id?cat.color:C.gray600,lineHeight:1.2}}>{cat.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Symptom Tags for active category */}
      {activeCat && (
        <div style={{background:C.white,borderRadius:16,padding:"20px",border:`2px solid ${activeCat.color}40`,marginBottom:16,animation:"fadeUp 0.4s ease-out"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:36,height:36,borderRadius:10,background:activeCat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{activeCat.icon}</div>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.navy}}>{activeCat.label} Symptoms</div>
              <div style={{fontSize:12,color:C.gray400}}>Tap to select — multiple allowed</div>
            </div>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {activeCat.symptoms.map(s=>{
              const selected = selectedSymptoms.includes(s);
              return (
                <button key={s} className="sym-tag" onClick={()=>selected?removeSymptom(s):addSymptom(s)}
                  style={{
                    padding:"8px 16px",borderRadius:25,border:`2px solid ${selected?activeCat.color:C.gray200}`,
                    background:selected?activeCat.bg:C.white,
                    color:selected?activeCat.color:C.gray600,
                    fontSize:13,fontWeight:selected?700:500,cursor:"pointer",
                    transition:"all 0.15s",display:"flex",alignItems:"center",gap:6,
                    boxShadow:selected?`0 2px 8px ${activeCat.color}30`:"none",
                  }}>
                  {selected && <span style={{fontSize:12}}>✓</span>}
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected symptoms chips */}
      {selectedSymptoms.length>0 && (
        <div style={{background:"linear-gradient(135deg,#f0fdf4,#e8f9f9)",borderRadius:14,padding:"14px 18px",border:`1.5px solid ${C.teal}`,marginBottom:16,animation:"fadeUp 0.3s ease-out"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.teal,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            ✓ Selected Symptoms ({selectedSymptoms.length})
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {selectedSymptoms.map(s=>(
              <span key={s} style={{padding:"5px 12px",borderRadius:20,background:C.teal,color:"#fff",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
                {s}
                <button onClick={()=>removeSymptom(s)} style={{background:"rgba(255,255,255,0.3)",border:"none",color:"#fff",borderRadius:"50%",width:16,height:16,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Manual description */}
      <div style={{background:C.white,borderRadius:16,padding:"20px",border:`2px solid ${focused?C.teal:C.gray200}`,marginBottom:16,transition:"border-color 0.2s",boxShadow:focused?`0 0 0 4px rgba(42,191,191,0.1)`:"none",animation:"fadeUp 0.5s ease-out 0.2s both"}}>
        <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
          <span>✍️</span> Add More Details <span style={{fontSize:12,color:C.gray400,fontWeight:400}}>(optional)</span>
        </div>
        <textarea value={symptoms} onChange={e=>setSymptoms(e.target.value)} rows={3}
          placeholder="Describe anything else — duration, severity, when it started..."
          style={{width:"100%",boxSizing:"border-box",padding:"12px 14px",border:"none",outline:"none",fontSize:14,fontFamily:"inherit",resize:"vertical",lineHeight:1.6,color:C.gray800,background:"transparent"}}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} />
        <div style={{fontSize:11,color:C.gray400,marginTop:4,borderTop:`1px solid ${C.gray100}`,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
          <span>{symptoms.length} characters</span>
          <span>More detail = better AI analysis</span>
        </div>
      </div>

      {/* Age & Gender */}
      <div style={{background:C.white,borderRadius:16,padding:"20px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.5s ease-out 0.3s both"}}>
        <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:14,display:"flex",alignItems:"center",gap:8}}><span>👤</span> Patient Info</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Age</label>
            <input type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="e.g. 35" min="1" max="120"
              style={{width:"100%",boxSizing:"border-box",padding:"11px 14px",border:`2px solid ${C.gray200}`,borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none",transition:"border-color 0.2s"}}
              onFocus={e=>e.target.style.borderColor=C.teal} onBlur={e=>e.target.style.borderColor=C.gray200} />
          </div>
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:C.gray600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Gender</label>
            <select value={gender} onChange={e=>setGender(e.target.value)}
              style={{width:"100%",padding:"11px 14px",border:`2px solid ${C.gray200}`,borderRadius:10,fontSize:14,fontFamily:"inherit",outline:"none",background:C.white,cursor:"pointer"}}>
              <option>Male</option>
              <option>Female</option>
              <option>Child (Under 12)</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{marginBottom:16,padding:"12px 16px",background:"#fef2f2",border:"2px solid #fecaca",borderRadius:12,fontSize:13,color:C.red,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
          ⚠️ {error}
        </div>
      )}

      {/* Analyze button */}
      <button className="analyze-btn" onClick={analyze} disabled={loading||!symptoms.trim()}
        style={{
          width:"100%",padding:"18px",borderRadius:14,border:"none",
          fontWeight:900,fontSize:16,fontFamily:"inherit",
          cursor:loading||!symptoms.trim()?"not-allowed":"pointer",
          transition:"all 0.25s",
          background:loading||!symptoms.trim()?"#94a3b8":`linear-gradient(135deg,${C.teal},${C.tealDark} 50%,${C.navy})`,
          color:C.white,
          boxShadow:loading||!symptoms.trim()?"none":"0 4px 20px rgba(42,191,191,0.4)",
          display:"flex",alignItems:"center",justifyContent:"center",gap:12,
        }}>
        {loading ? (
          <><div style={{width:22,height:22,border:"3px solid rgba(255,255,255,0.3)",borderTop:"3px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          Analyzing your symptoms…</>
        ) : (
          <>{symptoms.trim()?"🔍 Analyze My Symptoms →":"Select symptoms above to continue"}</>
        )}
      </button>

      {symptoms.trim() && !loading && (
        <div style={{textAlign:"center",marginTop:12,fontSize:12,color:C.gray400}}>
          🤖 Powered by AI · Results in ~5 seconds · Free to use
        </div>
      )}
    </div>
  );

  // ── STEP 2: RESULTS ────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:800,margin:"0 auto"}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes successPop{0%{transform:scale(0)}60%{transform:scale(1.1)}100%{transform:scale(1)}}`}</style>

      <button onClick={reset} style={{background:"none",border:"none",color:C.teal,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
        ← Check Different Symptoms
      </button>

      {/* Urgency */}
      {urgency && (
        <div style={{marginBottom:16,padding:"16px 20px",background:urgency.bg,border:`2px solid ${urgency.border}`,borderRadius:16,display:"flex",alignItems:"center",gap:14,animation:"fadeUp 0.4s ease-out"}}>
          <div style={{fontSize:32}}>{urgency.label.split(" ")[0]}</div>
          <div>
            <div style={{fontWeight:900,color:urgency.color,fontSize:16}}>{urgency.label.split(" ").slice(1).join(" ")}</div>
            <div style={{fontSize:13,color:urgency.color,opacity:0.8,marginTop:2}}>{urgency.text}</div>
          </div>
        </div>
      )}

      {/* Assessment */}
      <div style={{background:C.white,borderRadius:16,padding:"22px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.4s ease-out 0.1s both"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#2ABFBF,#1B3A5C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🤖</div>
          <div style={{fontSize:15,fontWeight:800,color:C.navy}}>AI Assessment</div>
        </div>
        <p style={{margin:"0 0 14px",fontSize:14,color:C.gray800,lineHeight:1.8,padding:"14px",background:C.gray50,borderRadius:10,borderLeft:`4px solid ${C.teal}`}}>{result.assessment}</p>
        {result.urdu_assessment && (
          <p style={{margin:0,fontSize:14,color:C.gray600,lineHeight:1.9,direction:"rtl",fontFamily:"serif",padding:"14px",background:"#fafaf9",borderRadius:10,borderRight:"4px solid #2ABFBF"}}>
            {result.urdu_assessment}
          </p>
        )}
      </div>

      {/* Specialists */}
      <div style={{background:C.white,borderRadius:16,padding:"22px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.4s ease-out 0.15s both"}}>
        <div style={{fontSize:15,fontWeight:800,color:C.navy,marginBottom:14,display:"flex",alignItems:"center",gap:8}}>👨‍⚕️ Recommended Specialist</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:160,padding:"18px",borderRadius:14,background:`linear-gradient(135deg,${C.tealLight},#fff)`,border:`2px solid ${C.teal}`,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>{SPECIALIST_ICONS[result.specialist]||"👨‍⚕️"}</div>
            <div style={{fontWeight:800,color:C.navy,fontSize:15}}>{result.specialist}</div>
            <div style={{fontSize:11,color:C.teal,fontWeight:700,marginTop:4,padding:"3px 10px",background:C.tealLight,borderRadius:20,display:"inline-block"}}>Primary Recommendation</div>
          </div>
          {result.specialist2 && (
            <div style={{flex:1,minWidth:160,padding:"18px",borderRadius:14,background:C.gray50,border:`2px solid ${C.gray200}`,textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:8}}>{SPECIALIST_ICONS[result.specialist2]||"🏥"}</div>
              <div style={{fontWeight:800,color:C.navy,fontSize:15}}>{result.specialist2}</div>
              <div style={{fontSize:11,color:C.gray600,fontWeight:700,marginTop:4,padding:"3px 10px",background:C.gray100,borderRadius:20,display:"inline-block"}}>Alternative Option</div>
            </div>
          )}
        </div>
      </div>

      {/* Conditions */}
      {result.possible_conditions?.length>0 && (
        <div style={{background:C.white,borderRadius:16,padding:"20px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.4s ease-out 0.2s both"}}>
          <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>🔍 Possible Conditions</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
            {result.possible_conditions.map((c,i)=>(
              <span key={i} style={{padding:"7px 16px",borderRadius:25,background:"#f5f3ff",color:C.purple,fontSize:13,fontWeight:600,border:"1.5px solid #ddd6fe"}}>{c}</span>
            ))}
          </div>
          <div style={{fontSize:11,color:C.gray400,display:"flex",alignItems:"center",gap:6}}>
            <span>⚠️</span> These are possibilities only — not a diagnosis. Always consult a doctor.
          </div>
        </div>
      )}

      {/* Matched Doctors */}
      {result.matchedDoctors?.length>0 && (
        <div style={{background:C.white,borderRadius:16,padding:"22px",border:`2px solid ${C.teal}`,marginBottom:16,animation:"fadeUp 0.4s ease-out 0.25s both"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:C.navy}}>🏥 Available on AsaanDoc</div>
              <div style={{fontSize:12,color:C.gray400,marginTop:2}}>Book directly with these specialists</div>
            </div>
            <span style={{fontSize:11,color:C.teal,fontWeight:700,background:C.tealLight,padding:"4px 12px",borderRadius:20}}>{result.matchedDoctors.length} doctor{result.matchedDoctors.length>1?"s":""} found</span>
          </div>
          {result.matchedDoctors.map((doc,i)=>{
            const fees=(doc.clinics||[]).map(c=>Number(c.fee||0)).filter(f=>f>0);
            const minFee=fees.length>0?Math.min(...fees):0;
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"16px",borderRadius:14,background:i%2===0?C.gray50:C.white,border:`1px solid ${C.gray200}`,marginBottom:10}}>
                {doc.photo
                  ?<img src={doc.photo} alt={doc.name} style={{width:52,height:52,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:`2px solid ${C.teal}`}} onError={e=>{e.target.style.display="none";}}/>
                  :<div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.navy})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20,flexShrink:0}}>{doc.name?.charAt(0)||"D"}</div>
                }
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15,color:C.navy}}>{doc.name}</div>
                  <div style={{fontSize:12,color:C.teal,fontWeight:600}}>{doc.specialty}</div>
                  <div style={{fontSize:11,color:C.gray400}}>⏳ {doc.exp} yrs experience</div>
                </div>
                <div style={{textAlign:"right"}}>
                  {minFee>0&&<div style={{fontSize:14,fontWeight:900,color:C.teal,marginBottom:8}}>PKR {minFee.toLocaleString()}</div>}
                  <button onClick={()=>onBookDoctor&&onBookDoctor(doc)}
                    style={{padding:"9px 18px",background:`linear-gradient(135deg,${C.teal},${C.tealDark})`,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 12px rgba(42,191,191,0.3)`}}>
                    Book Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Home care + Warning signs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
        {result.home_care?.length>0&&(
          <div style={{background:C.white,borderRadius:16,padding:"18px",border:`1px solid ${C.gray200}`,animation:"fadeUp 0.4s ease-out 0.3s both"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.navy,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>🏠 Home Care Tips</div>
            {result.home_care.map((tip,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-start"}}>
                <span style={{width:20,height:20,borderRadius:"50%",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:C.green,fontWeight:800}}>✓</span>
                <span style={{fontSize:12,color:C.gray800,lineHeight:1.6}}>{tip}</span>
              </div>
            ))}
          </div>
        )}
        {result.warning_signs?.length>0&&(
          <div style={{background:"#fef2f2",borderRadius:16,padding:"18px",border:"1.5px solid #fecaca",animation:"fadeUp 0.4s ease-out 0.35s both"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.red,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>🚨 Seek Emergency If</div>
            {result.warning_signs.map((sign,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-start"}}>
                <span style={{width:20,height:20,borderRadius:"50%",background:"#fef2f2",border:"1.5px solid #fecaca",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:C.red,fontWeight:800}}>!</span>
                <span style={{fontSize:12,color:"#991b1b",lineHeight:1.6}}>{sign}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lab Tests */}
      {result.lab_tests?.length>0&&(
        <div style={{background:C.white,borderRadius:16,padding:"18px 22px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.4s ease-out 0.4s both"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:800,color:C.navy,display:"flex",alignItems:"center",gap:8}}>🧪 Suggested Lab Tests</div>
            <span style={{fontSize:11,color:C.red,fontWeight:800,background:"#fef2f2",padding:"4px 12px",borderRadius:20,border:"1px solid #fecaca"}}>20% OFF on AsaanDoc</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {result.lab_tests.map((t,i)=>(
              <span key={i} style={{padding:"7px 14px",borderRadius:25,background:"#f5f3ff",color:C.purple,fontSize:12,fontWeight:600,border:"1.5px solid #ddd6fe",display:"flex",alignItems:"center",gap:6}}>
                🧪 {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Chat */}
      <div style={{background:C.white,borderRadius:16,padding:"22px",border:`1px solid ${C.gray200}`,marginBottom:16,animation:"fadeUp 0.4s ease-out 0.45s both"}}>
        <div style={{fontSize:14,fontWeight:800,color:C.navy,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          💬 Ask Follow-up Questions
          <span style={{fontSize:11,color:C.teal,fontWeight:600,background:C.tealLight,padding:"2px 10px",borderRadius:20}}>AI Powered</span>
        </div>
        {msgHistory.slice(2).map((msg,i)=>(
          <div key={i} style={{marginBottom:10,display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"80%",padding:"11px 15px",borderRadius:14,fontSize:13,lineHeight:1.7,
              background:msg.role==="user"?`linear-gradient(135deg,${C.teal},${C.tealDark})`:C.gray100,
              color:msg.role==="user"?C.white:C.gray800,
              borderBottomRightRadius:msg.role==="user"?4:14,
              borderBottomLeftRadius:msg.role==="assistant"?4:14,
              boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
            }}>{msg.content}</div>
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:12}}>
          <input value={followUp} onChange={e=>setFollowUp(e.target.value)}
            placeholder="e.g. Can I take paracetamol? How long will this last?"
            onKeyDown={e=>e.key==="Enter"&&!chatLoading&&askFollowUp()}
            style={{flex:1,padding:"12px 16px",border:`2px solid ${C.gray200}`,borderRadius:12,fontSize:13,fontFamily:"inherit",outline:"none",transition:"border-color 0.2s"}}
            onFocus={e=>e.target.style.borderColor=C.teal}
            onBlur={e=>e.target.style.borderColor=C.gray200} />
          <button onClick={askFollowUp} disabled={chatLoading||!followUp.trim()}
            style={{padding:"12px 20px",background:C.teal,color:"#fff",border:"none",borderRadius:12,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",flexShrink:0,boxShadow:`0 4px 12px rgba(42,191,191,0.3)`}}>
            {chatLoading?"…":"Send →"}
          </button>
        </div>
        <div style={{fontSize:11,color:C.gray400,marginTop:8}}>Press Enter to send · AI guidance, not medical advice</div>
      </div>

      {/* Disclaimer */}
      <div style={{padding:"16px 20px",background:`linear-gradient(135deg,${C.gray50},#fff)`,borderRadius:14,border:`1px solid ${C.gray200}`,fontSize:12,color:C.gray600,lineHeight:1.7,animation:"fadeUp 0.4s ease-out 0.5s both"}}>
        ⚕️ <strong>Medical Disclaimer:</strong> This AI tool provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns.
      </div>
    </div>
  );
}

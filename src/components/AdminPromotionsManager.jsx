// src/components/AdminPromotionsManager.jsx
// Drop this into src/components/, then add it as a tab/section inside AdminPanel.js
// (see integration notes at the bottom of this file).
import { useState, useEffect } from "react";
import {
  getAllPromotionsAdmin, savePromotion, deletePromotion,
  getAllMembershipPlansAdmin, saveMembershipPlan, deleteMembershipPlan,
} from "../firebase/services";

const T = {
  primary: "#2ABFBF", primaryDark: "#1a9999", text: "#1e293b",
  muted: "#94a3b8", border: "#e2e8f0", bg: "#f8fafc",
};

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`,
  fontSize: 13, fontFamily: "inherit", outline: "none", color: T.text, boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, marginTop: 10 };

const EMPTY_PROMO = {
  icon: "🏥", tag: "NEW", tagColor: "#2ABFBF", title: "", desc: "",
  bg: "linear-gradient(135deg,#1B3A5C,#0d4a5a)", accent: "#2ABFBF",
  cta: "Learn More", ctaAction: "browse", order: 0, active: true,
};

const EMPTY_PLAN = {
  name: "", price: 0, period: "per month", color: "#2ABFBF",
  badge: "", features: [""], order: 0, active: true,
};

export default function AdminPromotionsManager() {
  const [tab, setTab] = useState("promos");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["promos", "📣 Promotions"], ["plans", "👑 Membership Plans"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${tab === id ? T.primary : T.border}`,
              background: tab === id ? T.primary : "#fff", color: tab === id ? "#fff" : T.muted,
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
            {label}
          </button>
        ))}
      </div>
      {tab === "promos" ? <PromosManager /> : <PlansManager />}
    </div>
  );
}

// ═══════════════ PROMOTIONS MANAGER ═══════════════
function PromosManager() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // promo object being edited, or null
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPromos(await getAllPromotionsAdmin()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing.title.trim()) { alert("Title is required."); return; }
    setSaving(true);
    try {
      await savePromotion(editing);
      setEditing(null);
      await load();
    } catch (e) { console.error(e); alert("Failed to save promotion."); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this promotion?")) return;
    try { await deletePromotion(id); await load(); }
    catch (e) { console.error(e); alert("Failed to delete."); }
  };

  const toggleActive = async (promo) => {
    try { await savePromotion({ ...promo, active: !promo.active }); await load(); }
    catch (e) { console.error(e); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.muted }}>Loading promotions…</div>;

  return (
    <div>
      {!editing && (
        <button onClick={() => setEditing({ ...EMPTY_PROMO, order: promos.length })}
          style={{ marginBottom: 16, padding: "10px 18px", background: T.primary, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          + Add Promotion
        </button>
      )}

      {editing && (
        <div style={{ background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, color: T.text }}>{editing.id ? "Edit Promotion" : "New Promotion"}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Icon (emoji)</label>
              <input style={inputStyle} value={editing.icon} onChange={e => setEditing({ ...editing, icon: e.target.value })} placeholder="🧪" />
            </div>
            <div>
              <label style={labelStyle}>Tag Label</label>
              <input style={inputStyle} value={editing.tag} onChange={e => setEditing({ ...editing, tag: e.target.value })} placeholder="LIMITED TIME" />
            </div>
          </div>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="20% OFF All Lab Tests" />

          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, height: 60, resize: "vertical" }} value={editing.desc} onChange={e => setEditing({ ...editing, desc: e.target.value })} placeholder="Book any lab test and save instantly." />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Tag Color</label>
              <input type="color" style={{ ...inputStyle, height: 38, padding: 4 }} value={editing.tagColor} onChange={e => setEditing({ ...editing, tagColor: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Button/Accent Color</label>
              <input type="color" style={{ ...inputStyle, height: 38, padding: 4 }} value={editing.accent} onChange={e => setEditing({ ...editing, accent: e.target.value })} />
            </div>
          </div>

          <label style={labelStyle}>Background (CSS gradient or color)</label>
          <input style={inputStyle} value={editing.bg} onChange={e => setEditing({ ...editing, bg: e.target.value })} placeholder="linear-gradient(135deg,#1B3A5C,#0d4a5a)" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Button Text</label>
              <input style={inputStyle} value={editing.cta} onChange={e => setEditing({ ...editing, cta: e.target.value })} placeholder="Book a Lab Test" />
            </div>
            <div>
              <label style={labelStyle}>Button Action</label>
              <select style={inputStyle} value={editing.ctaAction} onChange={e => setEditing({ ...editing, ctaAction: e.target.value })}>
                <option value="browse">Go to Find a Doctor</option>
                <option value="membership">Go to Membership Plans</option>
                <option value="symptoms">Go to Symptom Checker</option>
                <option value="myappts">Go to My Appointments</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Display Order</label>
              <input type="number" style={inputStyle} value={editing.order} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer" }}>
                <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                Active (visible to patients)
              </label>
            </div>
          </div>

          {/* Live preview */}
          <label style={labelStyle}>Preview</label>
          <div style={{ background: editing.bg, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{editing.icon}</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: editing.tagColor, padding: "2px 8px", borderRadius: 20 }}>{editing.tag}</span>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, marginTop: 4 }}>{editing.title || "Title preview"}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{editing.desc || "Description preview"}</div>
            </div>
            <button style={{ background: editing.accent, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700 }}>{editing.cta}</button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "11px", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: T.muted }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "11px", background: T.primary, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save Promotion"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {promos.length === 0 && !editing && <div style={{ padding: 30, textAlign: "center", color: T.muted }}>No promotions yet. Add one above.</div>}
        {promos.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 12, opacity: p.active === false ? 0.5 : 1 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{p.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{p.title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{p.tag} · order {p.order} · {p.active === false ? "Inactive" : "Active"}</div>
            </div>
            <button onClick={() => toggleActive(p)} style={{ fontSize: 11, fontWeight: 600, color: T.primary, background: "none", border: `1.5px solid ${T.primary}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>
              {p.active === false ? "Activate" : "Deactivate"}
            </button>
            <button onClick={() => setEditing(p)} style={{ fontSize: 11, fontWeight: 600, color: T.text, background: "none", border: `1.5px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Edit</button>
            <button onClick={() => handleDelete(p.id)} style={{ fontSize: 11, fontWeight: 600, color: "#EF4444", background: "none", border: "1.5px solid #EF4444", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════ MEMBERSHIP PLANS MANAGER ═══════════════
function PlansManager() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPlans(await getAllMembershipPlansAdmin()); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing.name.trim()) { alert("Plan name is required."); return; }
    setSaving(true);
    try {
      await saveMembershipPlan({ ...editing, features: editing.features.filter(f => f.trim()) });
      setEditing(null);
      await load();
    } catch (e) { console.error(e); alert("Failed to save plan."); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    try { await deleteMembershipPlan(id); await load(); }
    catch (e) { console.error(e); alert("Failed to delete."); }
  };

  const updateFeature = (i, val) => {
    const f = [...editing.features]; f[i] = val;
    setEditing({ ...editing, features: f });
  };
  const addFeature = () => setEditing({ ...editing, features: [...editing.features, ""] });
  const removeFeature = (i) => setEditing({ ...editing, features: editing.features.filter((_, idx) => idx !== i) });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.muted }}>Loading plans…</div>;

  return (
    <div>
      {!editing && (
        <button onClick={() => setEditing({ ...EMPTY_PLAN, order: plans.length })}
          style={{ marginBottom: 16, padding: "10px 18px", background: T.primary, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          + Add Plan
        </button>
      )}

      {editing && (
        <div style={{ background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, color: T.text }}>{editing.id ? "Edit Plan" : "New Plan"}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Plan Name</label>
              <input style={inputStyle} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="AsaanDoc Silver" />
            </div>
            <div>
              <label style={labelStyle}>Price (PKR, 0 = free)</label>
              <input type="number" style={inputStyle} value={editing.price} onChange={e => setEditing({ ...editing, price: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>Billing Period</label>
              <input style={inputStyle} value={editing.period} onChange={e => setEditing({ ...editing, period: e.target.value })} placeholder="per month" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Accent Color</label>
              <input type="color" style={{ ...inputStyle, height: 38, padding: 4 }} value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Badge (optional, e.g. "MOST POPULAR")</label>
              <input style={inputStyle} value={editing.badge || ""} onChange={e => setEditing({ ...editing, badge: e.target.value })} placeholder="Leave blank for no badge" />
            </div>
          </div>

          <label style={labelStyle}>Features</label>
          {editing.features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input style={inputStyle} value={f} onChange={e => updateFeature(i, e.target.value)} placeholder="Priority queue position" />
              <button onClick={() => removeFeature(i)} style={{ background: "none", border: "1.5px solid #EF4444", color: "#EF4444", borderRadius: 7, padding: "0 12px", cursor: "pointer", fontWeight: 700 }}>×</button>
            </div>
          ))}
          <button onClick={addFeature} style={{ fontSize: 12, color: T.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: "4px 0" }}>+ Add feature</button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            <div>
              <label style={labelStyle}>Display Order</label>
              <input type="number" style={inputStyle} value={editing.order} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer" }}>
                <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                Active (visible to patients)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => setEditing(null)} style={{ flex: 1, padding: "11px", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: T.muted }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "11px", background: T.primary, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save Plan"}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {plans.length === 0 && !editing && <div style={{ padding: 30, textAlign: "center", color: T.muted }}>No plans yet. Add one above.</div>}
        {plans.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 12, opacity: p.active === false ? 0.5 : 1 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{p.name} — {p.price === 0 ? "Free" : `PKR ${p.price}`}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{(p.features || []).length} features · order {p.order} · {p.active === false ? "Inactive" : "Active"}</div>
            </div>
            <button onClick={() => setEditing(p)} style={{ fontSize: 11, fontWeight: 600, color: T.text, background: "none", border: `1.5px solid ${T.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Edit</button>
            <button onClick={() => handleDelete(p.id)} style={{ fontSize: 11, fontWeight: 600, color: "#EF4444", background: "none", border: "1.5px solid #EF4444", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
INTEGRATION NOTES — add to src/pages/AdminPanel.js:

1. Import at the top:
   import AdminPromotionsManager from "../components/AdminPromotionsManager";

2. Add a nav item to whatever tab/view switcher AdminPanel already uses,
   e.g. if it uses a `view` state like PatientPortal does:
   <button onClick={()=>setView("promotions")}>📣 Promotions</button>

3. Render it in the matching view block:
   {view==="promotions" && <AdminPromotionsManager />}
───────────────────────────────────────────────────────────── */


// src/components/PromotionsSection.jsx
import { useState, useEffect, useRef } from "react";
import { T } from "./UI";

// ─── PROMO DATA ─────────────────────────────────────────────
// Edit this array to change/add promotional slides. No backend needed —
// just update this list and redeploy.
const PROMOS = [
  {
    id: "labtest20",
    icon: "🧪",
    tag: "LIMITED TIME",
    tagColor: "#ef4444",
    title: "20% OFF All Lab Tests",
    desc: "Book any lab test through AsaanDoc and save instantly. No coupon needed.",
    bg: "linear-gradient(135deg,#1B3A5C,#0d4a5a)",
    accent: "#ef4444",
    cta: "Book a Lab Test",
  },
  {
    id: "referral",
    icon: "🎁",
    tag: "REFERRAL BONUS",
    tagColor: "#2ABFBF",
    title: "Refer a Friend, Get PKR 200",
    desc: "Share AsaanDoc with friends & family. You both get credit on your next visit.",
    bg: "linear-gradient(135deg,#0a3d3d,#1B3A5C)",
    accent: "#2ABFBF",
    cta: "Share Now",
  },
  {
    id: "membership",
    icon: "👑",
    tag: "NEW",
    tagColor: "#f59e0b",
    title: "Go Premium with AsaanDoc+",
    desc: "Priority booking, free follow-ups & discounted consultations. See plans below.",
    bg: "linear-gradient(135deg,#3b2b0d,#1B3A5C)",
    accent: "#f59e0b",
    cta: "View Plans",
  },
  {
    id: "video",
    icon: "💻",
    tag: "CONVENIENT",
    tagColor: "#16a34a",
    title: "Online Consultations Available",
    desc: "Skip the commute — talk to a specialist from home via secure video call.",
    bg: "linear-gradient(135deg,#0d2818,#1B3A5C)",
    accent: "#16a34a",
    cta: "Find a Doctor",
  },
];

// ─── PROMO BANNER (auto-rotating carousel) ─────────────────
export function PromoBanner({ onCta }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % PROMOS.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const promo = PROMOS[index];
  const goTo = (i) => setIndex(((i % PROMOS.length) + PROMOS.length) % PROMOS.length);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 24,
        boxShadow: "0 8px 24px rgba(27,58,92,0.18)",
      }}
    >
      <div
        key={promo.id}
        style={{
          background: promo.bg,
          padding: "26px 28px",
          minHeight: 132,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          position: "relative",
          overflow: "hidden",
          animation: "promoFadeIn 0.4s ease-out",
        }}
      >
        <style>{`
          @keyframes promoFadeIn { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)} }
        `}</style>

        {/* decorative giant icon */}
        <div style={{ position: "absolute", right: -6, bottom: -20, fontSize: 130, opacity: 0.07, pointerEvents: "none" }}>
          {promo.icon}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "rgba(255,255,255,0.12)", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 26,
            }}
          >
            {promo.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                color: "#fff", background: promo.tagColor, padding: "2px 9px", borderRadius: 20, marginBottom: 6,
              }}
            >
              {promo.tag}
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.25 }}>{promo.title}</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", marginTop: 4, maxWidth: 420 }}>{promo.desc}</div>
          </div>
        </div>

        <button
          onClick={() => onCta && onCta(promo.id)}
          style={{
            flexShrink: 0, padding: "10px 20px", borderRadius: 10, border: "none",
            background: promo.accent, color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            boxShadow: `0 4px 14px ${promo.accent}55`, position: "relative", zIndex: 1,
          }}
        >
          {promo.cta} →
        </button>
      </div>

      {/* dots + arrows */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "10px 0", background: "rgba(27,58,92,0.04)",
        }}
      >
        <button
          onClick={() => goTo(index - 1)}
          aria-label="Previous"
          style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, padding: 4 }}
        >
          ‹
        </button>
        {PROMOS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === index ? 20 : 7, height: 7, borderRadius: 6, border: "none", cursor: "pointer",
              background: i === index ? T.primary : "#cbd5e1", transition: "all 0.25s", padding: 0,
            }}
          />
        ))}
        <button
          onClick={() => goTo(index + 1)}
          aria-label="Next"
          style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, padding: 4 }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ─── SIDEBAR PROMO (vertical ad box for right rail) ─────────
export function SidebarPromo({ onCta }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % PROMOS.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const promo = PROMOS[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(27,58,92,0.15)",
      }}
    >
      <div
        key={promo.id}
        style={{
          background: promo.bg,
          padding: "28px 22px",
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <style>{`@keyframes promoFadeIn2{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ position: "absolute", right: -20, bottom: -20, fontSize: 140, opacity: 0.06, pointerEvents: "none" }}>
          {promo.icon}
        </div>

        <span
          style={{
            display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
            color: "#fff", background: promo.tagColor, padding: "3px 10px", borderRadius: 20, marginBottom: 16,
            position: "relative", zIndex: 1,
          }}
        >
          {promo.tag}
        </span>

        <div
          style={{
            width: 64, height: 64, borderRadius: 16, marginBottom: 16,
            background: "rgba(255,255,255,0.12)", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 32,
            position: "relative", zIndex: 1,
          }}
        >
          {promo.icon}
        </div>

        <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1.3, marginBottom: 8, position: "relative", zIndex: 1 }}>
          {promo.title}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", marginBottom: 20, position: "relative", zIndex: 1 }}>
          {promo.desc}
        </div>

        <button
          onClick={() => onCta && onCta(promo.id)}
          style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            background: promo.accent, color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            boxShadow: `0 4px 14px ${promo.accent}55`, position: "relative", zIndex: 1,
          }}
        >
          {promo.cta} →
        </button>
      </div>

      {/* dots */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", background: "rgba(27,58,92,0.04)" }}>
        {PROMOS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === index ? 18 : 7, height: 7, borderRadius: 6, border: "none", cursor: "pointer",
              background: i === index ? T.primary : "#cbd5e1", transition: "all 0.25s", padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MEMBERSHIP PLANS ───────────────────────────────────────
// Static plan definitions. Wire up `onSelectPlan` to your booking/payment flow later.
const PLANS = [
  {
    id: "free",
    name: "Basic",
    price: 0,
    period: "Free forever",
    color: "#64748b",
    badge: null,
    features: [
      "Book unlimited appointments",
      "Digital prescriptions",
      "WhatsApp reminders",
      "AI symptom checker",
    ],
  },
  {
    id: "silver",
    name: "AsaanDoc Silver",
    price: 499,
    period: "per month",
    color: "#2ABFBF",
    badge: "MOST POPULAR",
    features: [
      "Everything in Basic",
      "Priority queue position",
      "1 free follow-up per month",
      "10% off lab tests",
      "Priority WhatsApp support",
    ],
  },
  {
    id: "gold",
    name: "AsaanDoc Gold",
    price: 999,
    period: "per month",
    color: "#f59e0b",
    badge: "BEST VALUE",
    features: [
      "Everything in Silver",
      "Unlimited free follow-ups",
      "20% off lab tests",
      "Free online consultations",
      "Dedicated care coordinator",
    ],
  },
];

export function MembershipPlans({ currentPlan = "free", onSelectPlan }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: T.primary, letterSpacing: "0.08em", marginBottom: 6 }}>
          👑 MEMBERSHIP
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text }}>Choose Your AsaanDoc Plan</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: T.muted }}>Upgrade anytime. Cancel anytime.</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
          gap: 16,
        }}
      >
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                background: "#fff",
                borderRadius: 16,
                padding: "24px 20px",
                border: `2px solid ${plan.badge ? plan.color : T.border}`,
                boxShadow: plan.badge ? `0 8px 24px ${plan.color}22` : "0 2px 10px rgba(0,0,0,0.05)",
                display: "flex",
                flexDirection: "column",
                transform: plan.badge ? "translateY(-6px)" : "none",
              }}
            >
              {plan.badge && (
                <div
                  style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: plan.color, color: "#fff", fontSize: 10, fontWeight: 800,
                    letterSpacing: "0.05em", padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap",
                  }}
                >
                  {plan.badge}
                </div>
              )}

              <div style={{ textAlign: "center", marginBottom: 16, marginTop: plan.badge ? 6 : 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: T.text, marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>
                    {plan.price === 0 ? "Free" : `PKR ${plan.price}`}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{plan.period}</div>
              </div>

              <div style={{ flex: 1, marginBottom: 18 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <span style={{ color: plan.color, fontWeight: 800, fontSize: 13, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                disabled={isCurrent}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: isCurrent ? "#e2e8f0" : plan.color,
                  color: isCurrent ? T.muted : "#fff",
                  fontWeight: 700, fontSize: 13, cursor: isCurrent ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isCurrent ? "✓ Current Plan" : plan.price === 0 ? "Get Started" : "Upgrade →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

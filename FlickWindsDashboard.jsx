import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend
} from "recharts";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — Intelligence-briefing aesthetic
   Dark slate + warm gold + teal buy-signal accents
   ═══════════════════════════════════════════════════════════ */
const T = {
  bg: "#0f1117", surface: "rgba(24,28,38,0.88)", surface2: "rgba(36,42,56,0.6)",
  border: "rgba(148,163,184,0.09)", borderStrong: "rgba(148,163,184,0.18)",
  accent: "#d4a53c", accentSoft: "#d4a53c22", accentGlow: "#d4a53c38",
  teal: "#5DCAA5", tealDark: "#085041", tealMid: "#0F6E56",
  green: "#4ade80", red: "#f87171", blue: "#60a5fa", violet: "#a78bfa",
  amber: "#fbbf24", amberDark: "#633806", cyan: "#22d3ee",
  text: "#ededeb", muted: "#9a9a93", dim: "#64748b",
  pass: "#3a3a37", passFg: "#B4B2A9",
  font: "'Instrument Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

/* ═══════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════ */
function useCounter(target, dur = 2000, pre = "", suf = "") {
  const [v, setV] = useState(0);
  const r = useRef(null);
  useEffect(() => {
    const step = (t) => {
      if (!r.current) r.current = t;
      const p = Math.min((t - r.current) / dur, 1);
      setV(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    r.current = null;
    requestAnimationFrame(step);
  }, [target, dur]);
  return `${pre}${v.toLocaleString()}${suf}`;
}

const Dot = ({ color, size = 9 }) => (
  <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%",
    background: color, boxShadow: `0 0 7px ${color}55`, flexShrink: 0 }} />
);

/* Buy-signal colour logic from the HCI dashboard */
function signalColor(v) {
  if (v >= 80) return { bg: T.tealDark, fg: "#9FE1CB", label: "Strong buy" };
  if (v >= 70) return { bg: T.tealMid, fg: "#E1F5EE", label: "Buy" };
  if (v >= 55) return { bg: T.amberDark, fg: "#FAC775", label: "Watch" };
  return { bg: T.pass, fg: T.passFg, label: "Pass" };
}

/* Deterministic pseudo-random delta for refresh scoring */
function seededDelta(seed) {
  return Math.round((Math.abs(Math.sin(seed * 9301 + 49297) * 233280) % 1) * 14 - 7);
}

const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "24px 26px", backdropFilter: "blur(10px)" };
const glowCard = { ...card, border: `1px solid ${T.accentGlow}`, boxShadow: `0 0 36px ${T.accent}08, inset 0 1px 0 rgba(255,255,255,0.04)` };
const tealGlow = { ...card, border: `1px solid ${T.teal}25`, boxShadow: `0 0 30px ${T.teal}06` };
const secTitle = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2.5, color: T.accent, marginBottom: 18, fontFamily: T.font };
const bigNum = { fontSize: 44, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, fontFamily: T.fontDisplay };
const tipStyle = { background: "#1a2030", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 8, fontSize: 12 };

/* ═══════════════════════════════════════════════════════════
   HCI DATA — from the buy-signal dashboard
   10 Industries × 8 Fault Lines
   ═══════════════════════════════════════════════════════════ */
const INDUSTRIES = [
  { name: "Manufacturing", ctx: "aging workforce, IP in heads", icon: "🏭" },
  { name: "Financial services", ctx: "AI pilots stalling at adoption", icon: "🏦" },
  { name: "Healthcare", ctx: "burnout + protocol overload", icon: "🏥" },
  { name: "Energy / utilities", ctx: "asset experts retiring", icon: "⚡" },
  { name: "Insurance", ctx: "underwriter judgment at risk", icon: "🛡️" },
  { name: "Tech / SaaS", ctx: "eng-product-GTM drift", icon: "💻" },
  { name: "Retail / DTC", ctx: "frontline turnover", icon: "🛒" },
  { name: "Pharma / life sci", ctx: "compliance cognitive load", icon: "💊" },
  { name: "Logistics", ctx: "manager approval gridlock", icon: "🚛" },
  { name: "Telco", ctx: "service issue novelty rising", icon: "📡" },
];

const FAULT_LINES = [
  { key: "tacit", short: "Tacit\nknowledge", label: "Tacit knowledge decay" },
  { key: "aihuman", short: "AI-human\nfriction", label: "AI-human workflow friction" },
  { key: "decision", short: "Decision\nbottleneck", label: "Decision authority bottleneck" },
  { key: "frontline", short: "Frontline\ncapability", label: "Frontline capability gap" },
  { key: "crossfn", short: "Cross-fn\ntranslation", label: "Cross-functional translation loss" },
  { key: "compliance", short: "Compliance\nload", label: "Compliance cognitive load" },
  { key: "tribal", short: "Tribal\nprocess", label: "Tribal process knowledge" },
  { key: "empathy", short: "Empathy\ndrift", label: "Customer empathy drift" },
];

const BASE_SCORES = {
  "Manufacturing":      { tacit: 88, aihuman: 62, decision: 55, frontline: 70, crossfn: 48, compliance: 50, tribal: 84, empathy: 35 },
  "Financial services": { tacit: 55, aihuman: 86, decision: 72, frontline: 58, crossfn: 65, compliance: 78, tribal: 60, empathy: 50 },
  "Healthcare":         { tacit: 72, aihuman: 64, decision: 68, frontline: 80, crossfn: 58, compliance: 82, tribal: 66, empathy: 74 },
  "Energy / utilities": { tacit: 90, aihuman: 55, decision: 60, frontline: 72, crossfn: 50, compliance: 64, tribal: 80, empathy: 32 },
  "Insurance":          { tacit: 78, aihuman: 74, decision: 70, frontline: 60, crossfn: 55, compliance: 72, tribal: 68, empathy: 48 },
  "Tech / SaaS":        { tacit: 42, aihuman: 70, decision: 58, frontline: 50, crossfn: 84, compliance: 40, tribal: 55, empathy: 66 },
  "Retail / DTC":       { tacit: 38, aihuman: 55, decision: 62, frontline: 82, crossfn: 48, compliance: 42, tribal: 50, empathy: 78 },
  "Pharma / life sci":  { tacit: 75, aihuman: 60, decision: 65, frontline: 55, crossfn: 60, compliance: 88, tribal: 70, empathy: 40 },
  "Logistics":          { tacit: 60, aihuman: 64, decision: 85, frontline: 68, crossfn: 58, compliance: 55, tribal: 74, empathy: 42 },
  "Telco":              { tacit: 50, aihuman: 62, decision: 60, frontline: 84, crossfn: 55, compliance: 58, tribal: 60, empathy: 70 },
};

/* Service plays and value levers for each fault line */
const PLAYS = {
  tacit:      { play: "Expert knowledge graph + apprenticeship loops",         lever: "protect 8-12% margin tied to retiring experts" },
  aihuman:    { play: "Workflow redesign before tooling — capability-led AI",  lever: "unlock stalled AI pilot ROI (avg 3-5×)" },
  decision:   { play: "Decision rights map + delegated authority playbook",    lever: "cut approval lag 40-60%, free senior bandwidth" },
  frontline:  { play: "Frontline capability academy + JIT enablement",         lever: "lift first-contact resolution 15-25pp" },
  crossfn:    { play: "Boundary-spanner roles + shared capability lexicon",    lever: "compress release cycle 20-30%" },
  compliance: { play: "Cognitive load audit + policy simplification",          lever: "reduce error cost + retention risk" },
  tribal:     { play: "Process intelligence capture + role-redundancy design", lever: "de-risk key-person dependency before exit" },
  empathy:    { play: "Customer-signal feedback loops into capability model",  lever: "lift NPS 10-15pts, lower churn" },
};

/* ═══════════════════════════════════════════════════════════
   FINANCIAL / STRATEGIC DATA
   ═══════════════════════════════════════════════════════════ */
const revenueData = [
  { year: "Y1", revenue: 230, ebitda: 180 },
  { year: "Y2", revenue: 550, ebitda: 420 },
  { year: "Y3", revenue: 955, ebitda: 700 },
  { year: "Y4", revenue: 1800, ebitda: 1300 },
  { year: "Y5", revenue: 3050, ebitda: 2000 },
];
const subData = [
  { year: "Y1", subs: 20, arr: 72 }, { year: "Y2", subs: 55, arr: 240 },
  { year: "Y3", subs: 100, arr: 479 }, { year: "Y4", subs: 190, arr: 1050 },
  { year: "Y5", subs: 300, arr: 1800 },
];

/* ═══════════════════════════════════════════════════════════
   NAVIGATION — restructured with HCI intelligence layer
   ═══════════════════════════════════════════════════════════ */
const NAV = [
  { id: "command", label: "Command Centre", icon: "◆" },
  { id: "heatmap", label: "Buy Signals", icon: "⚡" },
  { id: "faultlines", label: "Fault Line Intel", icon: "◈" },
  { id: "sectors", label: "Industry Verticals", icon: "▣" },
  { id: "value", label: "Value Engine", icon: "◎" },
  { id: "agents", label: "AI Agents", icon: "⬡" },
  { id: "growth", label: "Growth & Financials", icon: "△" },
  { id: "assets", label: "Assets & Valuation", icon: "✦" },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function FlickWindsDashboard() {
  const [active, setActive] = useState("command");
  const [pass, setPass] = useState(0);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedSector, setSelectedSector] = useState("retail");
  const leakStr = useCounter(327000, 2400, "£");
  const recStr = useCounter(182000, 2400, "£");

  /* ── Compute heatmap cells on every pass (refresh) ── */
  const cells = useMemo(() => {
    const out = [];
    INDUSTRIES.forEach((ind, i) => {
      FAULT_LINES.forEach((f, j) => {
        const seed = i * 13 + j * 7 + pass * 101;
        const val = Math.max(20, Math.min(98, BASE_SCORES[ind.name][f.key] + seededDelta(seed)));
        out.push({ ind: ind.name, indCtx: ind.ctx, indIcon: ind.icon, fault: f.key, faultLabel: f.label, val, i, j });
      });
    });
    return out;
  }, [pass]);

  const strongBuys = cells.filter(c => c.val >= 80);
  const signalIndex = Math.round(cells.reduce((s, c) => s + c.val, 0) / cells.length);
  const topBuys = [...cells].sort((a, b) => b.val - a.val).slice(0, 6);

  const doRefresh = () => { setPass(p => p + 1); setSelectedCell(null); };

  /* ══════════════════════════════════════
     1. COMMAND CENTRE
     ══════════════════════════════════════ */
  const renderCommand = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Hero leakage metric */}
      <div style={{ ...glowCard, textAlign: "center", padding: "42px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: `radial-gradient(circle at 25% 50%, ${T.accent}, transparent 60%), radial-gradient(circle at 75% 50%, ${T.red}, transparent 60%)` }} />
        <div style={{ position: "relative" }}>
          <div style={secTitle}>Estimated Annual Value Leakage</div>
          <div style={{ ...bigNum, color: T.red, fontSize: 56 }}>{leakStr}</div>
          <div style={{ color: T.muted, fontSize: 13, marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
            Operational value lost through people-process fault lines — capability breakdowns in workforce, knowledge, culture, and decision-making
          </div>
          <div style={{ marginTop: 28, display: "inline-block", background: `${T.teal}12`, border: `1px solid ${T.teal}30`, borderRadius: 12, padding: "18px 38px" }}>
            <div style={{ fontSize: 10, color: T.teal, textTransform: "uppercase", letterSpacing: 2.5 }}>Recoverable Value</div>
            <div style={{ ...bigNum, color: T.teal, fontSize: 38, marginTop: 6 }}>{recStr}</div>
          </div>
        </div>
      </div>

      {/* Four signal metrics — bridging HCI into the command view */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Signal Index", val: signalIndex, sub: "avg across 80 cells", color: T.accent },
          { label: "Strong Buys", val: strongBuys.length, sub: "of 80 industry × fault line cells", color: T.teal },
          { label: "Avg Deal (£k)", val: 220 + Math.round(strongBuys.length * 22), sub: "12-week engagement", color: T.blue },
          { label: "Win-Rate Proxy", val: `${Math.min(48, 18 + strongBuys.length * 2)}%`, sub: "when signal ≥ 80", color: T.green },
        ].map((m, i) => (
          <div key={i} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: m.color, fontFamily: T.fontDisplay }}>{m.val}</div>
            <div style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Positioning */}
      <div style={{ ...card, borderLeft: `3px solid ${T.accent}`, padding: "18px 26px" }}>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.8, fontStyle: "italic" }}>
          FlickWinds detects <span style={{ color: T.accent, fontWeight: 600 }}>people-process fault lines</span> — where tacit knowledge decay, AI-human friction, decision bottlenecks, and capability gaps create urgent buyer demand — then quantifies the value leakage and builds recovery roadmaps through <span style={{ color: T.teal, fontWeight: 600 }}>Human Capability Intelligence</span>.
        </div>
      </div>

      {/* Priority sectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { label: "Priority Sector", value: "Retail & E-Commerce", sub: "Frontline turnover · empathy drift · tribal process", color: T.blue, icon: "🛒" },
          { label: "Priority Sector", value: "Financial Services & Insurance", sub: "AI pilots stalling · underwriter judgment at risk", color: T.violet, icon: "🏦" },
        ].map((s, i) => (
          <div key={i} style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "18px 22px" }}>
            <div style={{ fontSize: 30 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 10, color: s.color, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginTop: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Executive KPI table */}
      <div style={card}>
        <div style={secTitle}>Executive KPIs — 5-Year View</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["KPI", "", "Year 1", "Year 3", "Year 5"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: T.dim, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Revenue", T.green, "£230k", "£955k", "£3.05M"],
              ["Recurring Revenue %", T.amber, "30%", "50%", "75%"],
              ["Gross Margin", T.green, "85%", "88%", "90%"],
              ["Founder Hours/Week", T.green, "6 hrs", "6 hrs", "6 hrs"],
              ["EBITDA Potential", T.green, "£180k", "£700k+", "£2M+"],
              ["Exit Readiness", T.red, "20%", "60%", "90%"],
            ].map(([kpi, c, y1, y3, y5], i) => (
              <tr key={i} style={{ borderBottom: "1px solid rgba(148,163,184,0.04)" }}>
                <td style={{ padding: "11px 12px", fontWeight: 600 }}>{kpi}</td>
                <td style={{ padding: "11px 12px" }}><Dot color={c} size={7} /></td>
                <td style={{ padding: "11px 12px", color: T.muted }}>{y1}</td>
                <td style={{ padding: "11px 12px", color: T.muted }}>{y3}</td>
                <td style={{ padding: "11px 12px", fontWeight: 700 }}>{y5}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     2. BUY SIGNALS — the HCI heatmap
     ══════════════════════════════════════ */
  const renderHeatmap = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header row with refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: T.fontDisplay }}>Industry × Capability Fault Line</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Where people-process fault lines create urgent buyer demand. Click any cell for engagement scope.</div>
        </div>
        <button onClick={doRefresh} style={{
          fontFamily: T.font, fontSize: 12, padding: "8px 16px", borderRadius: 8,
          border: `1px solid ${T.borderStrong}`, background: T.surface, color: T.text,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>↻ Re-score</button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: T.muted, flexWrap: "wrap" }}>
        {[
          { label: "Strong buy (80+)", bg: T.tealDark },
          { label: "Buy (70-79)", bg: T.tealMid },
          { label: "Watch (55-69)", bg: T.amberDark },
          { label: "Pass (<55)", bg: T.pass },
        ].map((l, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: l.bg, display: "inline-block" }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* The heatmap */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 3, tableLayout: "fixed", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: 150, padding: "6px 8px", color: T.muted, fontSize: 10, fontWeight: 400 }}></th>
              {FAULT_LINES.map(f => (
                <th key={f.key} style={{ color: T.muted, fontSize: 10, fontWeight: 400, padding: "4px 2px", verticalAlign: "bottom", textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.3 }}>
                  {f.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INDUSTRIES.map((ind, i) => (
              <tr key={ind.name}>
                <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, fontSize: 12.5, color: T.text }}>
                  <span style={{ marginRight: 6 }}>{ind.icon}</span>{ind.name}
                  <div style={{ fontSize: 10, color: T.muted, fontWeight: 400, marginTop: 1 }}>{ind.ctx}</div>
                </th>
                {FAULT_LINES.map((f, j) => {
                  const cell = cells.find(c => c.i === i && c.j === j);
                  if (!cell) return <td key={f.key} />;
                  const sc = signalColor(cell.val);
                  const isSelected = selectedCell && selectedCell.i === i && selectedCell.j === j;
                  return (
                    <td key={f.key}
                      onClick={() => setSelectedCell(isSelected ? null : cell)}
                      style={{
                        textAlign: "center", padding: "8px 2px", borderRadius: 7,
                        background: sc.bg, color: sc.fg, fontWeight: 600, cursor: "pointer",
                        transition: "transform 0.12s", fontSize: 13,
                        outline: isSelected ? `2px solid ${T.accent}` : "none",
                        outlineOffset: -1,
                        transform: isSelected ? "scale(1.08)" : "none",
                      }}
                      title={`${ind.name} — ${f.label}: ${cell.val}`}
                    >{cell.val}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected cell detail panel */}
      {selectedCell && (() => {
        const sc = signalColor(selectedCell.val);
        const p = PLAYS[selectedCell.fault];
        return (
          <div style={{ ...tealGlow, padding: "22px 26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: T.teal, fontWeight: 700, marginBottom: 6 }}>Engagement Scope</div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedCell.ind} — {selectedCell.faultLabel}</div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Trigger context: {selectedCell.indCtx}</div>
              </div>
              <div style={{ textAlign: "center", padding: "10px 18px", borderRadius: 10, background: sc.bg }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: sc.fg, fontFamily: T.fontDisplay }}>{selectedCell.val}</div>
                <div style={{ fontSize: 10, color: sc.fg, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>{sc.label}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ ...card, padding: "14px 18px", borderTop: `3px solid ${T.teal}` }}>
                <div style={{ fontSize: 10, color: T.teal, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>Service Play</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{p.play}</div>
              </div>
              <div style={{ ...card, padding: "14px 18px", borderTop: `3px solid ${T.green}` }}>
                <div style={{ fontSize: 10, color: T.green, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>Value Lever</div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{p.lever}</div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: T.muted }}>
              Estimated engagement: <span style={{ color: T.accent, fontWeight: 700 }}>£{Math.round(selectedCell.val * 4)}k</span> · 12-week scope
            </div>
          </div>
        );
      })()}

      {/* Top strong buys */}
      <div style={card}>
        <div style={secTitle}>Top Strong Buys — Service Play & Value Lever</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topBuys.map((c, i) => {
            const sc = signalColor(c.val);
            const p = PLAYS[c.fault];
            return (
              <div key={i} onClick={() => setSelectedCell(c)} style={{
                display: "grid", gridTemplateColumns: "46px 1fr", gap: 14, alignItems: "center",
                padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                background: T.surface2, border: `1px solid ${T.border}`,
                transition: "background 0.15s",
              }}>
                <div style={{ textAlign: "center", padding: "8px 0", borderRadius: 8, background: sc.bg, color: sc.fg, fontWeight: 600, fontSize: 14 }}>
                  {c.val}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.ind} — {c.faultLabel}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{p.play}</div>
                  <div style={{ fontSize: 12, color: T.teal, marginTop: 2 }}>Value lever: {p.lever}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons (use sendPrompt) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "Discovery + Roadmap", prompt: "Deep-dive the #1 strong buy. Discovery questions, 4-week diagnostic offer, 12-week transformation roadmap, pricing." },
          { label: "One-page Proposal", prompt: "Draft a one-page proposal for the top fault line, anchored on human capability intelligence (not AI tooling), with 3 pricing tiers." },
          { label: "Defensible Plays", prompt: "Show the 3 fault lines most resistant to pure-tech vendors — where human-centric framing wins the buyer and why." },
          { label: "Buyer Map", prompt: "Map the buyer persona, trigger events, and economic case for each strong-buy cell currently on the dashboard." },
        ].map((a, i) => (
          <button key={i} onClick={() => typeof sendPrompt === "function" && sendPrompt(a.prompt)} style={{
            fontFamily: T.font, fontSize: 11, padding: "8px 14px", borderRadius: 8,
            border: `1px solid ${T.borderStrong}`, background: T.surface, color: T.text,
            cursor: "pointer", transition: "background 0.15s",
          }}>{a.label}</button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: T.dim, lineHeight: 1.6 }}>
        Scores combine industry context, public trigger events (leadership change, retention strain, AI pilot announcements, regulator action, attrition spikes, M&A integration), and buyer-economic urgency. Re-score re-rolls within calibrated bands.
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     3. FAULT LINE INTELLIGENCE
     ══════════════════════════════════════ */
  const renderFaultLines = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={card}>
        <div style={secTitle}>The Eight People-Process Fault Lines</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, marginBottom: 22 }}>
          FlickWinds scans organisations for eight distinct fault lines — the places where human capability breaks down and creates measurable value leakage. Each fault line has a specific service play (how FlickWinds intervenes) and a value lever (the measurable outcome the buyer gets).
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {FAULT_LINES.map((f, i) => {
            const p = PLAYS[f.key];
            const colors = [T.blue, T.violet, T.amber, T.green, T.cyan, T.red, T.teal, T.accent];
            const c = colors[i];
            /* Count how many strong-buy cells this fault line has across all industries */
            const fbCells = cells.filter(cell => cell.fault === f.key);
            const fbStrong = fbCells.filter(cell => cell.val >= 80).length;
            const fbAvg = Math.round(fbCells.reduce((s, cell) => s + cell.val, 0) / fbCells.length);
            return (
              <div key={f.key} style={{
                ...card, padding: "20px 22px", border: `1px solid ${c}18`,
                background: `linear-gradient(145deg, ${c}05, transparent)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: c }}>{f.label}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 10, color: T.teal, background: `${T.teal}15`, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{fbStrong} strong</span>
                    <span style={{ fontSize: 10, color: T.muted, background: `${T.pass}`, padding: "2px 8px", borderRadius: 4 }}>avg {fbAvg}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 10 }}>
                  <span style={{ color: T.accent, fontWeight: 600 }}>Play: </span>{p.play}
                </div>
                <div style={{ fontSize: 12, color: T.teal, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>Lever: </span>{p.lever}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Measure → Reveal → Improve → Deliver value chain */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { title: "We Measure", items: ["Tacit knowledge decay", "AI-human friction", "Decision bottlenecks", "Frontline capability gaps", "Compliance cognitive load", "Value leakage"], color: T.blue },
          { title: "We Reveal", items: ["Where money is lost", "Why performance varies", "Which capabilities matter", "Where knowledge is vulnerable", "Where AI can create value"], color: T.accent },
          { title: "We Improve", items: ["Operational consistency", "Workforce effectiveness", "Knowledge resilience", "AI adoption pathways", "Process performance"], color: T.green },
          { title: "We Deliver", items: ["Fault Line Diagnostics", "Value Recovery Insights", "Benchmark Intelligence", "Continuous Monitoring", "Agentic Intelligence"], color: T.violet },
        ].map((col, i) => (
          <div key={i} style={{ ...card, padding: "18px", borderTop: `3px solid ${col.color}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: col.color, marginBottom: 14 }}>{col.title}</div>
            {col.items.map((item, j) => (
              <div key={j} style={{ fontSize: 12, color: T.muted, padding: "5px 0", borderBottom: j < col.items.length - 1 ? "1px solid rgba(148,163,184,0.05)" : "none" }}>{item}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     4. INDUSTRY VERTICALS
     ══════════════════════════════════════ */
  const retailProcs = [
    { name: "Merchandising", desc: "Selecting product lines, negotiating with brands, pricing items", risk: 82, color: T.blue },
    { name: "Order Fulfillment", desc: "Picking, packing, and shipping online or in-store orders", risk: 74, color: T.cyan },
    { name: "Customer Returns", desc: "Inspecting returned merchandise, restocking, issuing refunds", risk: 68, color: T.amber },
    { name: "Loyalty & Retention", desc: "Managing reward programs and targeted campaigns", risk: 55, color: T.violet },
  ];
  const fsoProcs = [
    { name: "Underwriting", desc: "Assessing lending risk or issuing insurance policies", risk: 88, color: T.violet },
    { name: "Claims Processing", desc: "Investigating insurance claims and disbursing payouts", risk: 79, color: T.blue },
    { name: "Fraud & Compliance", desc: "Monitoring transactions for KYC/AML regulatory adherence", risk: 91, color: T.red },
    { name: "Portfolio Management", desc: "Buying and selling assets to maximise client returns", risk: 65, color: T.cyan },
  ];
  const procs = selectedSector === "retail" ? retailProcs : fsoProcs;

  const renderSectors = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { id: "retail", label: "Retail & E-Commerce", icon: "🛒", sub: "Fashion · Grocery · Marketplaces" },
          { id: "fso", label: "Financial Services", icon: "🏦", sub: "Banking · Investment · Insurance" },
        ].map(s => (
          <button key={s.id} onClick={() => setSelectedSector(s.id)} style={{
            flex: 1, ...card, cursor: "pointer", textAlign: "left", fontFamily: T.font,
            border: selectedSector === s.id ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
            background: selectedSector === s.id ? `${T.accent}08` : T.surface,
            transition: "all 0.2s ease", padding: "18px 22px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 26 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selectedSector === s.id ? T.accent : T.text }}>{s.label}</div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={card}>
        <div style={secTitle}>{selectedSector === "retail" ? "Retail" : "FSO"} Process Fault Lines</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {procs.map((p, i) => (
            <div key={i} style={{ ...card, padding: "18px 20px", border: `1px solid ${p.color}18`, background: `linear-gradient(135deg, ${p.color}06, transparent)` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: p.color }}>{p.name}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: p.risk > 80 ? T.red : p.risk > 65 ? T.amber : T.green, fontFamily: T.fontDisplay }}>
                  {p.risk}<span style={{ fontSize: 10, color: T.dim }}>/100</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 8, lineHeight: 1.6 }}>{p.desc}</div>
              <div style={{ marginTop: 12, height: 5, background: "rgba(148,163,184,0.07)", borderRadius: 3 }}>
                <div style={{ height: 5, borderRadius: 3, width: `${p.risk}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}80)` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expansion sectors */}
      <div style={card}>
        <div style={secTitle}>Expansion Roadmap</div>
        {[
          { phase: "YEAR 2–3", sectors: ["Professional Services — Consulting, Legal, IT Services", "Manufacturing — Automotive, Electronics, Consumer Goods"], color: T.amber },
          { phase: "YEAR 3–5", sectors: ["Healthcare — Hospitals, Pharmaceuticals, Biotech", "Energy & Utilities — Oil & Gas, Renewables, Water"], color: T.blue },
        ].map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 70, fontSize: 10, fontWeight: 800, color: p.color, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "right", paddingTop: 4, flexShrink: 0 }}>{p.phase}</div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {p.sectors.map((s, j) => (
                <div key={j} style={{ fontSize: 13, color: T.text, padding: "10px 14px", borderRadius: 8, background: `${p.color}06`, border: `1px solid ${p.color}15` }}>{s}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     5. VALUE ENGINE
     ══════════════════════════════════════ */
  const renderValue = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {[
          { title: "Retail Client", icon: "🛒", rev: "£25M", leak: "£125k", recover: "£50k", cost: "£6k/yr", roi: "8.3x", color: T.blue },
          { title: "Insurance Client", icon: "🛡️", rev: "£50M Claims", leak: "£125k", recover: "£62.5k", cost: "£12k/yr", roi: "5.2x", color: T.violet },
        ].map((c, i) => (
          <div key={i} style={glowCard}>
            <div style={{ ...secTitle, display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>{c.icon}</span>{c.title}</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ width: 90, height: 90, borderRadius: "50%", background: `conic-gradient(${T.teal} 0deg, ${T.teal} ${parseFloat(c.roi) / 10 * 360}deg, rgba(148,163,184,0.07) ${parseFloat(c.roi) / 10 * 360}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#161b26", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: T.teal, fontFamily: T.fontDisplay }}>{c.roi}</div>
              </div>
            </div>
            {[["Revenue Base", c.rev], ["Estimated Leakage", c.leak], ["Recoverable", c.recover], ["FlickWinds Cost", c.cost]].map(([l, v], j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: 13, borderBottom: j < 3 ? "1px solid rgba(148,163,184,0.05)" : "none" }}>
                <span style={{ color: T.muted }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={secTitle}>Product Revenue Ladder</div>
        {[
          { stage: "Entry", prod: "Capability Health Check", price: "Free", margin: "Lead Gen", mC: T.blue },
          { stage: "Qualify", prod: "Capability Snapshot", price: "£99", margin: "95%", mC: T.green },
          { stage: "Diagnose", prod: "Leakage Diagnostic", price: "£495 – £5,000", margin: "90%", mC: T.green },
          { stage: "Recover", prod: "Recovery Roadmap", price: "£5k – £15k", margin: "80%", mC: T.amber },
          { stage: "Retain", prod: "Monitoring Subscription", price: "£149 – £999/mo", margin: "95%", mC: T.green },
        ].map((p, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 1fr 130px 72px", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: i < 4 ? "1px solid rgba(148,163,184,0.05)" : "none" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "center", background: `${T.accent}10`, padding: "4px 6px", borderRadius: 4 }}>{p.stage}</span>
            <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.prod}</span>
            <span style={{ color: T.muted, fontSize: 13, textAlign: "right" }}>{p.price}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.mC, textAlign: "center", background: `${p.mC}15`, padding: "3px 6px", borderRadius: 5 }}>{p.margin}</span>
          </div>
        ))}
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     6. AI AGENTS
     ══════════════════════════════════════ */
  const renderAgents = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={card}>
        <div style={secTitle}>AI Agent Portfolio — Mapped to Fault Lines</div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 18 }}>
          Each agent continuously scans for specific fault lines across all industries, translating people-process breakdowns into quantified value recovery opportunities.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { name: "Process Intelligence Agent", icon: "⚙️", color: T.blue, purpose: "Detect decision bottlenecks, tribal process risks, and cross-functional translation failures", faults: "Decision bottleneck · Tribal process · Cross-fn translation", value: "Operational Efficiency" },
            { name: "Capability Risk Agent", icon: "🛡️", color: T.red, purpose: "Identify frontline capability gaps and workforce vulnerabilities before they create leakage", faults: "Frontline capability · Tacit knowledge", value: "Workforce Stability" },
            { name: "Knowledge Leakage Agent", icon: "🧠", color: T.violet, purpose: "Detect tacit knowledge decay and tribal process risks from attrition, retirement, restructuring", faults: "Tacit knowledge · Tribal process", value: "Retention & Continuity" },
            { name: "AI Adoption Agent", icon: "🤖", color: T.green, purpose: "Measure AI-human workflow friction and readiness — capability-led AI, not tool-led", faults: "AI-human friction · Compliance load", value: "Transformation Success" },
            { name: "Value Recovery Agent", icon: "💎", color: T.accent, purpose: "Quantify the financial impact of every detected fault line to drive board-level decisions", faults: "All 8 fault lines → £ impact", value: "Executive Decision Making" },
            { name: "Empathy & Experience Agent", icon: "💬", color: T.cyan, purpose: "Track customer empathy drift and its impact on NPS, churn, and frontline resolution quality", faults: "Empathy drift · Frontline capability", value: "Customer Experience" },
          ].map((a, i) => (
            <div key={i} style={{ ...card, padding: "20px", border: `1px solid ${a.color}18`, background: `linear-gradient(145deg, ${a.color}05, transparent)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 24 }}>{a.icon}</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: a.color }}>{a.name}</div>
              </div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6, marginBottom: 10 }}>{a.purpose}</div>
              <div style={{ fontSize: 10, color: T.dim, padding: "6px 10px", background: "rgba(148,163,184,0.04)", borderRadius: 6, lineHeight: 1.5, marginBottom: 8 }}>
                <span style={{ color: T.accent, fontWeight: 600 }}>Fault lines: </span>{a.faults}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: a.color, background: `${a.color}14`, padding: "3px 10px", borderRadius: 5, textTransform: "uppercase", letterSpacing: 1 }}>{a.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     7. GROWTH & FINANCIALS
     ══════════════════════════════════════ */
  const renderGrowth = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[["Gross Margin Y5", "90%", T.green], ["EBITDA Y5", "£2M+", T.accent], ["Founder Hours", "6/wk", T.blue], ["CAPEX Y1", "£5.7k", T.violet]].map(([l, v, c], i) => (
          <div key={i} style={{ textAlign: "center", padding: 20, borderRadius: 12, background: `${c}06`, border: `1px solid ${c}16` }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c, fontFamily: T.fontDisplay }}>{v}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 6, textTransform: "uppercase", letterSpacing: 1.5 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={secTitle}>Revenue & EBITDA Trajectory (£k)</div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="gR2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={0.35} /><stop offset="100%" stopColor={T.accent} stopOpacity={0} /></linearGradient>
              <linearGradient id="gE2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.teal} stopOpacity={0.3} /><stop offset="100%" stopColor={T.teal} stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
            <XAxis dataKey="year" stroke={T.dim} fontSize={11} /><YAxis stroke={T.dim} fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Area type="monotone" dataKey="revenue" stroke={T.accent} fill="url(#gR2)" strokeWidth={2.5} name="Revenue" />
            <Area type="monotone" dataKey="ebitda" stroke={T.teal} fill="url(#gE2)" strokeWidth={2.5} name="EBITDA" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={card}>
          <div style={secTitle}>Subscriber Growth</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={subData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
              <XAxis dataKey="year" stroke={T.dim} fontSize={11} /><YAxis stroke={T.dim} fontSize={11} />
              <Tooltip contentStyle={tipStyle} />
              <Bar dataKey="subs" fill={T.accent} radius={[5, 5, 0, 0]} name="Subscribers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={secTitle}>ARR Trajectory (£k)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={subData}>
              <defs><linearGradient id="gA3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.teal} stopOpacity={0.3} /><stop offset="100%" stopColor={T.teal} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
              <XAxis dataKey="year" stroke={T.dim} fontSize={11} /><YAxis stroke={T.dim} fontSize={11} />
              <Tooltip contentStyle={tipStyle} />
              <Area type="monotone" dataKey="arr" stroke={T.teal} fill="url(#gA3)" strokeWidth={2.5} name="ARR (£k)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════
     8. ASSETS & VALUATION
     ══════════════════════════════════════ */
  const renderAssets = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={card}>
        <div style={secTitle}>Proprietary Strategic Assets</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
            {["Asset", "Year 1", "Year 3", "Year 5"].map(h => (
              <th key={h} style={{ textAlign: h === "Asset" ? "left" : "center", padding: "10px 12px", color: T.dim, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {[
              ["Capability Fault Line Index™", "✅", "✅", "✅"],
              ["Industry Benchmark Database™", "🟡", "✅", "✅"],
              ["Value Recovery Models™", "🟡", "✅", "✅"],
              ["Organisational Capability Graph™", "🔴", "🟡", "✅"],
              ["Agentic Intelligence Platform™", "🔴", "🟡", "✅"],
              ["HCI Buy-Signal Heatmap™", "✅", "✅", "✅"],
            ].map(([a, y1, y3, y5], i) => {
              const sc = (s) => s === "✅" ? T.green : s === "🟡" ? T.amber : T.red;
              const si = (s) => s === "✅" ? "✓" : s === "🟡" ? "◐" : "○";
              return (
                <tr key={i} style={{ borderBottom: "1px solid rgba(148,163,184,0.04)" }}>
                  <td style={{ padding: "13px 12px", fontWeight: 600 }}>{a}</td>
                  {[y1, y3, y5].map((s, j) => (
                    <td key={j} style={{ padding: "13px 12px", textAlign: "center" }}>
                      <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: "50%", background: `${sc(s)}18`, color: sc(s), alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{si(s)}</span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={card}>
        <div style={secTitle}>Enterprise Value Progression</div>
        {[
          { stage: "Consultancy Only", val: "£0.5M – £1M", pct: 8, c: T.dim },
          { stage: "Framework + Diagnostics", val: "£2M – £5M", pct: 25, c: T.blue },
          { stage: "SaaS + Benchmark Database", val: "£8M – £20M", pct: 60, c: T.violet },
          { stage: "Agentic Intelligence Platform", val: "£15M – £50M+", pct: 100, c: T.teal },
        ].map((s, i) => (
          <div key={i} style={{ position: "relative", paddingLeft: 32, paddingBottom: 22, marginLeft: 10, borderLeft: i < 3 ? `2px solid ${s.c}35` : "2px solid transparent" }}>
            <div style={{ position: "absolute", left: -7, top: 2, width: 14, height: 14, borderRadius: "50%", background: s.c, border: "3px solid #0f1117", boxShadow: `0 0 10px ${s.c}50` }} />
            <div style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{s.stage}</div>
            <div style={{ fontSize: 13, color: T.text, marginTop: 3, fontFamily: T.fontDisplay, fontWeight: 600 }}>{s.val}</div>
            <div style={{ height: 5, background: "rgba(148,163,184,0.06)", borderRadius: 3, marginTop: 8 }}>
              <div style={{ height: 5, borderRadius: 3, width: `${s.pct}%`, background: s.c }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ ...tealGlow, textAlign: "center", padding: 26 }}>
          <div style={secTitle}>Business Resilience</div>
          <div style={{ ...bigNum, color: T.teal }}>82<span style={{ fontSize: 20, color: T.dim }}> / 100</span></div>
        </div>
        <div style={card}>
          <div style={secTitle}>Risk Exposure</div>
          {[["Economic Downturn", "Low", T.green], ["AI Hype Cycle", "Medium", T.amber], ["Consulting Competition", "Medium", T.amber], ["Capital Requirements", "Very Low", T.green], ["Founder Burnout", "Medium", T.amber]].map(([r, e, c], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid rgba(148,163,184,0.04)" : "none" }}>
              <span style={{ fontSize: 12, color: T.muted }}>{r}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: c, background: `${c}15`, padding: "2px 8px", borderRadius: 4 }}>{e}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card, textAlign: "center", padding: "24px 30px", borderImage: `linear-gradient(90deg, ${T.accent}, ${T.teal}, ${T.blue}) 1`, borderWidth: 1, borderStyle: "solid", borderRadius: 14, background: "linear-gradient(135deg, rgba(24,28,38,0.7), rgba(15,17,23,0.9))" }}>
        <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic", lineHeight: 1.8, maxWidth: 700, margin: "0 auto" }}>
          FlickWinds is a Human Capability Intelligence platform that detects people-process fault lines — where tacit knowledge decay, AI-human friction, decision bottlenecks, and capability gaps create measurable value leakage — and builds recovery roadmaps through an agentic organisational intelligence framework.
        </div>
      </div>
    </div>
  );

  const sections = { command: renderCommand, heatmap: renderHeatmap, faultlines: renderFaultLines, sectors: renderSectors, value: renderValue, agents: renderAgents, growth: renderGrowth, assets: renderAssets };

  /* ══════════════════════════════════════
     LAYOUT
     ══════════════════════════════════════ */
  return (
    <div style={{ fontFamily: T.font, background: T.bg, color: T.text, minHeight: "100vh", fontSize: 14 }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "22px 28px 16px", borderBottom: `1px solid ${T.border}`, background: "rgba(15,17,23,0.88)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, background: `linear-gradient(135deg, ${T.accent}, ${T.amber})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: T.fontDisplay }}>FlickWinds™</span>
              <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: `${T.teal}18`, color: T.teal, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Human Capability Intelligence</span>
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 3 }}>People-process fault lines · Buy-signal intelligence · Value recovery</div>
          </div>
          <div style={{ fontSize: 10, padding: "5px 12px", borderRadius: 5, background: `${T.accent}10`, color: T.accent, fontWeight: 600, border: `1px solid ${T.accent}22` }}>
            10 Industries · 8 Fault Lines · {strongBuys.length} Strong Buys
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: "0 28px", borderBottom: `1px solid ${T.border}`, background: "rgba(15,17,23,0.7)", overflowX: "auto", whiteSpace: "nowrap", position: "sticky", top: 62, zIndex: 99 }}>
        <div style={{ display: "flex", gap: 0 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setActive(n.id); setSelectedCell(null); }} style={{
              padding: "12px 15px", border: "none", background: "none",
              color: active === n.id ? T.accent : T.dim,
              fontSize: 11, fontWeight: active === n.id ? 700 : 500,
              cursor: "pointer", fontFamily: T.font,
              borderBottom: active === n.id ? `2px solid ${T.accent}` : "2px solid transparent",
              transition: "all 0.2s ease", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 10, opacity: active === n.id ? 1 : 0.4 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "26px 28px 60px", maxWidth: 1120, margin: "0 auto" }}>
        {sections[active]?.()}
      </div>
    </div>
  );
}

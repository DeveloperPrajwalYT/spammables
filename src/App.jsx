import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, MessageSquare, DollarSign, ShieldAlert, Clock, Activity, Gauge,
  UserPlus, Settings, Palette, Volume2, VolumeX, Mic, MicOff, Link2,
  CheckCircle2, XCircle, Loader2, ChevronRight, Crown, Star, ShieldCheck,
  Ban, Trash2, TimerReset, Wifi, WifiOff, Sparkles, Volume1, X,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart,
} from "recharts";

/* ============================================================================
   THEME SYSTEM
   Four fully distinct visual identities. Every visual value (color, glow,
   font) is derived from this table — nothing else in the app hardcodes color.
============================================================================ */

const THEMES = {
  cyberpunk: {
    name: "Cyberpunk",
    bg: "#05070d",
    bgGrid: "rgba(255,42,175,0.05)",
    panel: "#0c1018",
    panelAlt: "#10141f",
    border: "rgba(255,42,175,0.25)",
    text: "#e7f6ff",
    muted: "#7c8aa8",
    accent: "#ff2aaf",
    accent2: "#28f5e0",
    warn: "#ffb020",
    danger: "#ff3b5c",
    good: "#28f5e0",
    glow: "0 0 20px rgba(255,42,175,0.45)",
    glow2: "0 0 20px rgba(40,245,224,0.4)",
    display: "'Chakra Petch', 'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    radius: "10px",
  },
  synthwave: {
    name: "Synthwave",
    bg: "#170a2e",
    bgGrid: "rgba(255,110,199,0.06)",
    panel: "#20124a",
    panelAlt: "#291658",
    border: "rgba(255,110,199,0.28)",
    text: "#fbeaff",
    muted: "#a48ed6",
    accent: "#ff6ec7",
    accent2: "#5ad6ff",
    warn: "#ffd166",
    danger: "#ff5277",
    good: "#5ad6ff",
    glow: "0 0 24px rgba(255,110,199,0.5)",
    glow2: "0 0 24px rgba(90,214,255,0.45)",
    display: "'Chakra Petch', 'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    radius: "14px",
  },
  deepspace: {
    name: "Deep Space",
    bg: "#0b0e13",
    bgGrid: "rgba(255,255,255,0.02)",
    panel: "#12161d",
    panelAlt: "#161b23",
    border: "rgba(148,163,184,0.14)",
    text: "#dbe2ea",
    muted: "#647087",
    accent: "#5b8def",
    accent2: "#8a9cc2",
    warn: "#e0a83f",
    danger: "#e0566a",
    good: "#5bc2a8",
    glow: "0 0 0 rgba(0,0,0,0)",
    glow2: "0 0 0 rgba(0,0,0,0)",
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    radius: "6px",
  },
  light: {
    name: "Light",
    bg: "#f6f7f9",
    bgGrid: "rgba(79,70,229,0.04)",
    panel: "#ffffff",
    panelAlt: "#f1f2f6",
    border: "rgba(17,24,39,0.09)",
    text: "#141824",
    muted: "#6b7280",
    accent: "#4f46e5",
    accent2: "#0891b2",
    warn: "#b45309",
    danger: "#dc2626",
    good: "#0f9d58",
    glow: "0 0 0 rgba(0,0,0,0)",
    glow2: "0 0 0 rgba(0,0,0,0)",
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    radius: "8px",
  },
};

const ThemeCtx = createContext(THEMES.cyberpunk);
const useTheme = () => useContext(ThemeCtx);

/* ============================================================================
   PERSISTENCE (Standard Browser LocalStorage)
============================================================================ */

const STORAGE_KEY = "yt-dash:config";

async function loadConfig() {
  try {
    const res = localStorage.getItem(STORAGE_KEY);
    if (res) return JSON.parse(res);
  } catch (e) {
    console.error("Failed to load config", e);
  }
  return null;
}

async function saveConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error("Failed to persist config", e);
  }
}

/* ============================================================================
   SYNTHESIZED AUDIO — no external assets, pure Web Audio API oscillators
============================================================================ */

let audioCtx = null;
function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

function tone(ctx, freq, start, dur, type = "sine", gainPeak = 0.22) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

const SOUND_PROFILES = {
  chime: { label: "Crystal Chime", play: (ctx, t0, vol) => {
    [880, 1174.7, 1567.98].forEach((f, i) => tone(ctx, f, t0 + i * 0.09, 0.5, "sine", 0.25 * vol));
  }},
  coin: { label: "Arcade Coin", play: (ctx, t0, vol) => {
    tone(ctx, 988, t0, 0.09, "square", 0.18 * vol);
    tone(ctx, 1568, t0 + 0.09, 0.28, "square", 0.18 * vol);
  }},
  bell: { label: "Bell Toll", play: (ctx, t0, vol) => {
    tone(ctx, 660, t0, 0.9, "triangle", 0.28 * vol);
    tone(ctx, 1320, t0, 0.7, "sine", 0.12 * vol);
  }},
  blip: { label: "Digi Blip", play: (ctx, t0, vol) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, f, t0 + i * 0.05, 0.16, "sawtooth", 0.14 * vol));
  }},
};

function playSuperchatSound(profileKey, volume) {
  if (volume <= 0) return;
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const profile = SOUND_PROFILES[profileKey] || SOUND_PROFILES.chime;
    profile.play(ctx, ctx.currentTime, volume);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
}

function speakSuperchat(name, text, enabled) {
  if (!enabled || !("speechSynthesis" in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(`${name} says: ${text}`);
    utter.rate = 1.02;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.error("TTS failed", e);
  }
}

/* ============================================================================
   MOCK DATA GENERATORS
============================================================================ */

const FIRST = ["Nova", "Kestrel", "Vex", "Marlowe", "Juno", "Talon", "Sable", "Orin", "Wren", "Zephyr", "Indigo", "Rune", "Astra", "Cove", "Fable", "Halcyon", "Onyx", "Piper", "Quill", "Sage"];
const LAST = ["Byte", "Static", "Pulse", "Drift", "Ember", "Frost", "Circuit", "Nimbus", "Vortex", "Glow", "Echo", "Wisp", "Flux", "Comet", "Reef"];
const randomName = () => `${FIRST[Math.floor(Math.random() * FIRST.length)]}${LAST[Math.floor(Math.random() * LAST.length)]}${Math.floor(Math.random() * 99)}`;

const CHAT_LINES = [
  "let's gooo 🔥", "this build is insane", "clip that immediately", "W stream honestly",
  "how long has this run been going", "chat please calm down 😭", "first time here, loving it",
  "the audio synced perfectly", "can we get a replay of that", "mods are cooking today",
  "no shot that just happened", "subscribing right now", "the latency is actually so clean",
  "who else came from the short", "this deserves more viewers fr",
];

const BADGE_POOL = ["none", "none", "none", "member", "moderator", "none", "member", "none", "owner", "none"];

const MOD_ACTION_TYPES = [
  { type: "timeout", verb: "timed out", icon: TimerReset, dur: () => `${[30, 60, 300, 600][Math.floor(Math.random() * 4)]}s` },
  { type: "delete", verb: "deleted a message from", icon: Trash2 },
  { type: "ban", verb: "banned", icon: Ban },
];

const TIERS = [
  { min: 1, max: 4.99, color: "#5b8def", label: "Blue" },
  { min: 5, max: 9.99, color: "#66c2ff", label: "Light Blue" },
  { min: 10, max: 19.99, color: "#2bd97b", label: "Green" },
  { min: 20, max: 49.99, color: "#ffd23f", label: "Yellow" },
  { min: 50, max: 99.99, color: "#ff9f43", label: "Orange" },
  { min: 100, max: 500, color: "#ff4d5e", label: "Red" },
];

const SUPERCHAT_MESSAGES = [
  "Been watching since day one, keep it up!", "Take a break and drink some water lol",
  "This stream lowkey changed my week", "For the editing team, you deserve this",
  "Can you say hi to my dog Biscuit", "Worth every penny for this content",
  "Hope the new setup keeps holding up", "Just got paid, had to share it with you",
];

function randomTier() {
  const roll = Math.random();
  const idx = roll < 0.45 ? 0 : roll < 0.7 ? 1 : roll < 0.85 ? 2 : roll < 0.94 ? 3 : roll < 0.985 ? 4 : 5;
  return TIERS[idx];
}

function randomAmount(tier) {
  return (Math.random() * (tier.max - tier.min) + tier.min).toFixed(2);
}

/* ============================================================================
   SMALL UI PRIMITIVES
============================================================================ */

function Panel({ children, style, className = "" }) {
  const t = useTheme();
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{ background: t.panel, borderColor: t.border, borderRadius: t.radius, ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  const t = useTheme();
  return (
    <div
      className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-3"
      style={{ color: t.muted, fontFamily: t.display }}
    >
      {children}
    </div>
  );
}

function IconButton({ icon: Icon, active, onClick, label, size = 18 }) {
  const t = useTheme();
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      title={label}
      className="flex items-center justify-center rounded-xl p-2.5 border transition-colors"
      style={{
        background: active ? t.accent : "transparent",
        borderColor: active ? t.accent : t.border,
        color: active ? (t.name === "Light" ? "#fff" : t.bg) : t.muted,
        boxShadow: active ? t.glow : "none",
      }}
    >
      <Icon size={size} strokeWidth={2.2} />
    </motion.button>
  );
}

function Badge({ kind }) {
  const t = useTheme();
  const map = {
    owner: { icon: Crown, color: t.warn, label: "Owner" },
    moderator: { icon: ShieldCheck, color: t.accent2, label: "Mod" },
    member: { icon: Star, color: t.accent, label: "Member" },
  };
  if (!map[kind]) return null;
  const M = map[kind];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: `${M.color}22`, color: M.color }}
    >
      <M.icon size={11} /> {M.label}
    </span>
  );
}

/* ============================================================================
   SPLASH SCREEN
============================================================================ */

function SplashScreen({ onDone }) {
  const t = useTheme();
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: t.bg }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="rounded-3xl p-6 mb-6"
        style={{ background: t.panel, border: `1px solid ${t.border}`, boxShadow: t.glow }}
      >
        <Radio size={52} style={{ color: t.accent }} strokeWidth={1.8} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="text-2xl font-bold tracking-tight"
        style={{ color: t.text, fontFamily: t.display }}
      >
        STREAM TRACER
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm mt-2"
        style={{ color: t.muted }}
      >
        Booting live telemetry engine…
      </motion.p>
      <motion.div
        className="mt-8 h-[3px] w-56 rounded-full overflow-hidden"
        style={{ background: t.border }}
      >
        <motion.div
          className="h-full"
          style={{ background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.9, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ============================================================================
   CHANNEL LINK MODAL
============================================================================ */

function ChannelModal({ initial, onSubmit, onClose, dismissible }) {
  const t = useTheme();
  const [val, setVal] = useState(initial || "");

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={dismissible ? onClose : undefined}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-7 relative"
        style={{ background: t.panel, border: `1px solid ${t.border}`, boxShadow: t.glow, borderRadius: t.radius }}
      >
        {dismissible && (
          <button onClick={onClose} className="absolute top-4 right-4" style={{ color: t.muted }}>
            <X size={18} />
          </button>
        )}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl" style={{ background: `${t.accent}22` }}>
            <Link2 size={20} style={{ color: t.accent }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: t.text, fontFamily: t.display }}>
            {dismissible ? "Update channel link" : "Connect your channel"}
          </h2>
        </div>
        <p className="text-sm mb-5" style={{ color: t.muted }}>
          Paste your YouTube channel or live stream URL to start tracking chat, superchats, and moderation in real time.
        </p>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="https://youtube.com/@yourchannel/live"
          className="w-full px-4 py-3 rounded-xl outline-none text-sm mb-5 transition-shadow"
          style={{
            background: t.panelAlt,
            border: `1px solid ${t.border}`,
            color: t.text,
          }}
          onKeyDown={(e) => e.key === "Enter" && val.trim() && onSubmit(val.trim())}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          disabled={!val.trim()}
          onClick={() => val.trim() && onSubmit(val.trim())}
          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          style={{
            background: t.accent,
            color: t.name === "Light" ? "#fff" : t.bg,
            boxShadow: t.glow,
          }}
        >
          Start tracking <ChevronRight size={16} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================================
   STATUS BADGE
============================================================================ */

function StreamStatusBadge({ status }) {
  const t = useTheme();
  const config = {
    checking: { label: "CHECKING…", color: t.warn, Icon: Loader2, spin: true },
    online: { label: "STREAM ONLINE", color: t.good, Icon: Wifi, spin: false },
    offline: { label: "STREAM OFFLINE", color: t.danger, Icon: WifiOff, spin: false },
  }[status];

  return (
    <motion.div
      layout
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide"
      style={{
        background: `${config.color}1c`,
        color: config.color,
        border: `1px solid ${config.color}55`,
      }}
    >
      <motion.span
        animate={status === "offline" ? { opacity: [1, 0.35, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="w-2 h-2 rounded-full"
        style={{ background: config.color, boxShadow: `0 0 8px ${config.color}` }}
      />
      <config.Icon size={13} className={config.spin ? "animate-spin" : ""} />
      {config.label}
    </motion.div>
  );
}

/* ============================================================================
   TAB: CHAT
============================================================================ */

function ChatTab({ messages }) {
  const t = useTheme();
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  return (
    <Panel className="p-5 h-[520px] flex flex-col">
      <SectionLabel>Live Chat</SectionLabel>
      <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2 text-sm leading-snug"
            >
              <span className="font-semibold whitespace-nowrap" style={{ color: t.accent2 }}>
                {m.name}
              </span>
              {m.badge !== "none" && <Badge kind={m.badge} />}
              <span style={{ color: t.text }}>{m.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </Panel>
  );
}

/* ============================================================================
   TAB: SUPERCHATS
============================================================================ */

function SuperchatsTab({ superchats }) {
  const t = useTheme();
  return (
    <Panel className="p-5 h-[520px] flex flex-col">
      <SectionLabel>Superchat Ledger</SectionLabel>
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
        <AnimatePresence initial={false}>
          {superchats.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="rounded-xl p-3.5"
              style={{ background: `${s.tier.color}18`, border: `1px solid ${s.tier.color}55` }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm" style={{ color: t.text }}>{s.name}</span>
                <span className="font-bold text-sm" style={{ color: s.tier.color }}>${s.amount}</span>
              </div>
              <p className="text-xs leading-snug" style={{ color: t.muted }}>{s.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

/* ============================================================================
   TAB: MODERATION
============================================================================ */

function ModerationTab({ actions }) {
  const t = useTheme();
  return (
    <Panel className="p-5 h-[520px] flex flex-col font-mono">
      <SectionLabel>Moderation Log</SectionLabel>
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        <AnimatePresence initial={false}>
          {actions.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2.5 text-xs py-1.5 border-b"
              style={{ borderColor: t.border }}
            >
              <a.icon size={14} style={{ color: t.danger }} />
              <span style={{ color: t.muted }}>{a.time}</span>
              <span style={{ color: t.accent2 }}>MOD_{a.mod}</span>
              <span style={{ color: t.muted }}>{a.verb}</span>
              <span style={{ color: t.text }}>{a.target}</span>
              {a.extra && <span style={{ color: t.warn }}>({a.extra})</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

/* ============================================================================
   TAB: UPTIME
============================================================================ */

function formatHMS(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function UptimeTab({ uptime, history }) {
  const t = useTheme();
  return (
    <Panel className="p-6 h-[520px] flex flex-col">
      <SectionLabel>Livestream Uptime</SectionLabel>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-5xl font-bold tabular-nums" style={{ color: t.text, fontFamily: t.display }}>
          {formatHMS(uptime)}
        </span>
        <span className="text-xs" style={{ color: t.muted }}>elapsed</span>
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 100]} tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: t.panelAlt, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text }} />
            <Area type="monotone" dataKey="stability" stroke={t.accent} fill="url(#uptimeGrad)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs mt-2" style={{ color: t.muted }}>Performance stability index over session</div>
    </Panel>
  );
}

/* ============================================================================
   TAB: PING / LATENCY
============================================================================ */

function PingTab({ pingHistory, current }) {
  const t = useTheme();
  return (
    <Panel className="p-6 h-[520px] flex flex-col">
      <SectionLabel>Network Latency</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Ping", value: `${current.ping} ms`, color: t.accent },
          { label: "Jitter", value: `${current.jitter} ms`, color: t.accent2 },
          { label: "Packet Loss", value: `${current.loss}%`, color: current.loss > 2 ? t.danger : t.good },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-3" style={{ background: t.panelAlt, border: `1px solid ${t.border}` }}>
            <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: t.muted }}>{s.label}</div>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pingHistory}>
            <CartesianGrid stroke={t.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: t.panelAlt, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text }} />
            <Line type="monotone" dataKey="ping" stroke={t.accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="jitter" stroke={t.accent2} strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/* ============================================================================
   TAB: STREAM QUALITY
============================================================================ */

function QualityTab({ quality }) {
  const t = useTheme();
  const gradeColor = { Excellent: t.good, Good: t.accent2, Degraded: t.warn, Poor: t.danger }[quality.grade];
  return (
    <Panel className="p-6 h-[520px] flex flex-col">
      <SectionLabel>Streaming Quality</SectionLabel>
      <div className="flex items-center gap-5 mb-6">
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ border: `4px solid ${gradeColor}`, color: gradeColor }}
          animate={{ boxShadow: [`0 0 0px ${gradeColor}00`, `0 0 18px ${gradeColor}55`, `0 0 0px ${gradeColor}00`] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        >
          {quality.grade}
        </motion.div>
        <div>
          <div className="text-2xl font-bold" style={{ color: t.text, fontFamily: t.display }}>{quality.score}/100</div>
          <div className="text-xs" style={{ color: t.muted }}>Composite health score</div>
        </div>
      </div>
      <div className="space-y-4">
        {[
          { label: "Resolution", value: quality.resolution, pct: quality.resPct },
          { label: "Bitrate", value: `${quality.bitrate} kbps`, pct: quality.bitratePct },
          { label: "Frame Rate", value: `${quality.fps} fps`, pct: quality.fpsPct },
        ].map((row) => (
          <div key={row.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: t.muted }}>{row.label}</span>
              <span style={{ color: t.text }}>{row.value}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: t.panelAlt }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }}
                animate={{ width: `${row.pct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ============================================================================
   TAB: SUBSCRIBERS
============================================================================ */

function SubscribersTab({ subs }) {
  const t = useTheme();
  return (
    <Panel className="p-5 h-[520px] flex flex-col">
      <SectionLabel>New Subscribers</SectionLabel>
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
        <AnimatePresence initial={false}>
          {subs.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{ background: t.panelAlt, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-center gap-2.5">
                <UserPlus size={15} style={{ color: t.accent }} />
                <span className="text-sm font-semibold" style={{ color: t.text }}>{s.name}</span>
              </div>
              <span className="text-[11px]" style={{ color: t.muted }}>{s.time}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

/* ============================================================================
   SIDEBAR / CONTROL PANEL
============================================================================ */

const TABS = [
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "superchats", label: "Superchats", icon: DollarSign },
  { key: "moderation", label: "Moderation", icon: ShieldAlert },
  { key: "uptime", label: "Uptime", icon: Clock },
  { key: "ping", label: "Latency", icon: Activity },
  { key: "quality", label: "Quality", icon: Gauge },
  { key: "subscribers", label: "Subscribers", icon: UserPlus },
];

function Sidebar({ activeTab, setActiveTab, config, setConfig, onChangeChannel }) {
  const t = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
      <Panel className="p-4">
        <SectionLabel>Navigate</SectionLabel>
        <div className="flex flex-col gap-1">
          {TABS.map((tabItem) => {
            const active = activeTab === tabItem.key;
            return (
              <motion.button
                key={tabItem.key}
                onClick={() => setActiveTab(tabItem.key)}
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium relative"
                style={{
                  color: active ? (t.name === "Light" ? "#fff" : t.bg) : t.muted,
                }}
              >
                {active && (
                  <motion.div
                    layoutId="tab-highlight"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: t.accent, boxShadow: t.glow }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <tabItem.icon size={16} className="relative z-10" />
                <span className="relative z-10">{tabItem.label}</span>
              </motion.button>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-4">
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Settings</SectionLabel>
          <Settings size={14} style={{ color: t.muted }} />
        </div>

        <div className="mb-4">
          <div className="text-xs mb-2 font-medium" style={{ color: t.muted }}>Theme</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEMES).map(([key, th]) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setConfig((c) => ({ ...c, theme: key }))}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold"
                style={{
                  background: config.theme === key ? `${t.accent}22` : t.panelAlt,
                  border: `1px solid ${config.theme === key ? t.accent : t.border}`,
                  color: config.theme === key ? t.accent : t.muted,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: th.accent }} />
                {th.name}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: t.muted }}>Superchat sound</span>
            <IconButton
              icon={config.soundVolume > 0 ? Volume2 : VolumeX}
              active={config.soundVolume > 0}
              onClick={() => setConfig((c) => ({ ...c, soundVolume: c.soundVolume > 0 ? 0 : 0.7 }))}
              size={14}
            />
          </div>
          <input
            type="range" min={0} max={1} step={0.05}
            value={config.soundVolume}
            onChange={(e) => setConfig((c) => ({ ...c, soundVolume: parseFloat(e.target.value) }))}
            className="w-full accent-current mb-2"
            style={{ color: t.accent }}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(SOUND_PROFILES).map(([key, p]) => (
              <button
                key={key}
                onClick={() => { setConfig((c) => ({ ...c, soundProfile: key })); playSuperchatSound(key, config.soundVolume || 0.5); }}
                className="text-[10px] px-2 py-1.5 rounded-lg font-medium truncate"
                style={{
                  background: config.soundProfile === key ? `${t.accent2}22` : t.panelAlt,
                  border: `1px solid ${config.soundProfile === key ? t.accent2 : t.border}`,
                  color: config.soundProfile === key ? t.accent2 : t.muted,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium" style={{ color: t.muted }}>Auto text-to-speech</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfig((c) => ({ ...c, ttsEnabled: !c.ttsEnabled }))}
            className="w-11 h-6 rounded-full p-0.5 flex"
            style={{ background: config.ttsEnabled ? t.accent : t.panelAlt, border: `1px solid ${t.border}` }}
          >
            <motion.div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: t.name === "Light" ? "#fff" : t.bg }}
              animate={{ x: config.ttsEnabled ? 20 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {config.ttsEnabled ? <Mic size={11} style={{ color: t.accent }} /> : <MicOff size={11} style={{ color: t.muted }} />}
            </motion.div>
          </motion.button>
        </div>

        <button
          onClick={onChangeChannel}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: t.panelAlt, border: `1px solid ${t.border}`, color: t.text }}
        >
          <Link2 size={13} /> Change channel link
        </button>
      </Panel>
    </div>
  );
}

/* ============================================================================
   MAIN APP
============================================================================ */

const DEFAULT_CONFIG = {
  theme: "cyberpunk",
  channelLink: "",
  soundVolume: 0.6,
  soundProfile: "chime",
  ttsEnabled: false,
};

export default function App() {
  const [phase, setPhase] = useState("splash"); // splash -> onboarding -> dashboard
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [streamStatus, setStreamStatus] = useState("checking");

  const [chatMessages, setChatMessages] = useState([]);
  const [superchats, setSuperchats] = useState([]);
  const [modActions, setModActions] = useState([]);
  const [subs, setSubs] = useState([]);
  const [uptime, setUptime] = useState(0);
  const [uptimeHistory, setUptimeHistory] = useState([]);
  const [pingHistory, setPingHistory] = useState([]);
  const [pingNow, setPingNow] = useState({ ping: 34, jitter: 4, loss: 0 });
  const [quality, setQuality] = useState({
    grade: "Excellent", score: 94, resolution: "1080p60", resPct: 100,
    bitrate: 6000, bitratePct: 92, fps: 60, fpsPct: 100,
  });

  const idRef = useRef(0);
  const nextId = () => `id-${idRef.current++}-${Date.now()}`;

  // Load persisted config on mount
  useEffect(() => {
    (async () => {
      const saved = await loadConfig();
      if (saved) {
        setConfig({ ...DEFAULT_CONFIG, ...saved });
        if (saved.channelLink) {
          setPhase("dashboard-pending");
        }
      }
      setConfigLoaded(true);
    })();
  }, []);

  // Persist config whenever it changes (after initial load)
  useEffect(() => {
    if (configLoaded) saveConfig(config);
  }, [config, configLoaded]);

  const handleSplashDone = () => {
    if (config.channelLink) {
      setPhase("dashboard");
      setStreamStatus("checking");
    } else {
      setPhase("onboarding");
      setShowChannelModal(true);
    }
  };

  // If config loaded already had a channel link, skip splash gracefully once splash timer used
  useEffect(() => {
    if (phase === "dashboard-pending") {
      setPhase("dashboard");
      setStreamStatus("checking");
    }
  }, [phase]);

  const handleChannelSubmit = (link) => {
    setConfig((c) => ({ ...c, channelLink: link }));
    setShowChannelModal(false);
    setPhase("dashboard");
    setStreamStatus("checking");
  };

  // Mock "check live status" polling
  useEffect(() => {
    if (phase !== "dashboard") return;
    setStreamStatus("checking");
    const t = setTimeout(() => setStreamStatus(Math.random() > 0.15 ? "online" : "offline"), 1800);
    return () => clearTimeout(t);
  }, [phase, config.channelLink]);

  // Uptime clock
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      setUptime((u) => u + 1);
      setUptimeHistory((h) => {
        const stability = Math.max(60, Math.min(100, 90 + (Math.random() - 0.5) * 20));
        const next = [...h, { t: h.length, stability }];
        return next.slice(-60);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, streamStatus]);

  // Ping simulation
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      const ping = Math.round(24 + Math.random() * 40);
      const jitter = Math.round(1 + Math.random() * 8);
      const loss = Math.random() < 0.08 ? +(Math.random() * 3).toFixed(1) : 0;
      setPingNow({ ping, jitter, loss });
      setPingHistory((h) => [...h, { t: h.length, ping, jitter }].slice(-40));
    }, 1500);
    return () => clearInterval(interval);
  }, [phase, streamStatus]);

  // Quality drift simulation
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      const score = Math.round(70 + Math.random() * 30);
      const grade = score > 90 ? "Excellent" : score > 78 ? "Good" : score > 60 ? "Degraded" : "Poor";
      setQuality({
        grade, score,
        resolution: score > 80 ? "1080p60" : "720p60",
        resPct: score > 80 ? 100 : 70,
        bitrate: Math.round(4000 + score * 30),
        bitratePct: Math.min(100, Math.round(score * 1.05)),
        fps: score > 75 ? 60 : 30,
        fpsPct: score > 75 ? 100 : 55,
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [phase, streamStatus]);

  // Chat simulation
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      setChatMessages((prev) => {
        const msg = {
          id: nextId(),
          name: randomName(),
          text: CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)],
          badge: BADGE_POOL[Math.floor(Math.random() * BADGE_POOL.length)],
        };
        return [...prev, msg].slice(-40);
      });
    }, 1100);
    return () => clearInterval(interval);
  }, [phase, streamStatus]);

  // Superchat simulation
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      const tier = randomTier();
      const amount = randomAmount(tier);
      const name = randomName();
      const text = SUPERCHAT_MESSAGES[Math.floor(Math.random() * SUPERCHAT_MESSAGES.length)];
      setSuperchats((prev) => [{ id: nextId(), name, amount, text, tier }, ...prev].slice(0, 30));
      playSuperchatSound(config.soundProfile, config.soundVolume);
      speakSuperchat(name, text, config.ttsEnabled);
    }, 6500 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [phase, streamStatus, config.soundProfile, config.soundVolume, config.ttsEnabled]);

  // Moderation simulation
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      const action = MOD_ACTION_TYPES[Math.floor(Math.random() * MOD_ACTION_TYPES.length)];
      setModActions((prev) => [{
        id: nextId(),
        icon: action.icon,
        verb: action.verb,
        target: randomName(),
        mod: Math.floor(Math.random() * 900 + 100),
        extra: action.dur ? action.dur() : null,
        time: new Date().toLocaleTimeString([], { hour12: false }),
      }, ...prev].slice(0, 30));
    }, 5000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [phase, streamStatus]);

  // Subscriber simulation
  useEffect(() => {
    if (phase !== "dashboard" || streamStatus !== "online") return;
    const interval = setInterval(() => {
      setSubs((prev) => [{
        id: nextId(),
        name: randomName(),
        time: new Date().toLocaleTimeString([], { hour12: false }),
      }, ...prev].slice(0, 30));
    }, 4000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, [phase, streamStatus]);

  const theme = THEMES[config.theme];

  const tabContent = {
    chat: <ChatTab messages={chatMessages} />,
    superchats: <SuperchatsTab superchats={superchats} />,
    moderation: <ModerationTab actions={modActions} />,
    uptime: <UptimeTab uptime={uptime} history={uptimeHistory} />,
    ping: <PingTab pingHistory={pingHistory} current={pingNow} />,
    quality: <QualityTab quality={quality} />,
    subscribers: <SubscribersTab subs={subs} />,
  };

  return (
    <ThemeCtx.Provider value={theme}>
      <div
        className="min-h-screen w-full transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${theme.bgGrid}, transparent 60%), ${theme.bg}`,
          fontFamily: theme.body,
          color: theme.text,
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
          * { scrollbar-width: thin; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 8px; }
        `}</style>

        <AnimatePresence>
          {phase === "splash" && <SplashScreen key="splash" onDone={handleSplashDone} />}
        </AnimatePresence>

        <AnimatePresence>
          {showChannelModal && (
            <ChannelModal
              key="modal"
              initial={config.channelLink}
              dismissible={!!config.channelLink}
              onClose={() => setShowChannelModal(false)}
              onSubmit={handleChannelSubmit}
            />
          )}
        </AnimatePresence>

        {(phase === "dashboard") && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl" style={{ background: `${theme.accent}22` }}>
                  <Radio size={22} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: theme.display }}>Stream Tracer</h1>
                  <p className="text-xs truncate max-w-[240px]" style={{ color: theme.muted }}>{config.channelLink}</p>
                </div>
              </div>
              <StreamStatusBadge status={streamStatus} />
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
              <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                config={config}
                setConfig={setConfig}
                onChangeChannel={() => setShowChannelModal(true)}
              />
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    {tabContent[activeTab]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}

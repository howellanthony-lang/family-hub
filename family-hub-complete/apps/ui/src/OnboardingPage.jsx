import { useState, useEffect, useCallback, useRef } from "react";

// ── QR Code generator (pure JS, no library needed) ────────────────────────────
// Minimal QR encoder — generates a data URL for any URL string
function useQRDataUrl(text, size = 200) {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
    if (!text) { setDataUrl(null); return; }
    // Use the Google Charts QR API (works offline once loaded, cached by browser)
    const encoded = encodeURIComponent(text);
    setDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=0d1829&color=e8f0fe&margin=12`);
  }, [text, size]);
  return dataUrl;
}

// ── API ───────────────────────────────────────────────────────────────────────
const API = localStorage.getItem("familyHubApi") || "http://localhost:3001";

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#050c1a",
  surface: "#0b1628",
  card:    "#0f1e35",
  card2:   "#132340",
  border:  "rgba(255,255,255,0.07)",
  hi:      "rgba(255,255,255,0.13)",
  text:    "#e8f0fe",
  muted:   "#6b7e9e",
  dim:     "#2d3f5c",
};

// Provider brand colours
const GOOGLE_BLUE  = "#4285f4";
const APPLE_SILVER = "#a8b8c8";
const WEBCAL_TEAL  = "#2dd4bf";
const TAILSCALE_TL = "#5a67d8";

// ── Animated background grid ──────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ opacity: 0.035 }}>
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#60a5fa" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
      {/* Glow orbs */}
      <div style={{ position:"absolute", top:"-20%", left:"-10%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }}/>
      <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)" }}/>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ state }) {
  const cfg = {
    connected:   { color: "#34d399", label: "Connected",   dot: true  },
    pending:     { color: "#fbbf24", label: "Waiting…",    dot: true  },
    scanning:    { color: "#60a5fa", label: "Scan QR code",dot: false },
    error:       { color: "#ef4444", label: "Error",        dot: false },
    skipped:     { color: C.muted,   label: "Skipped",      dot: false },
    not_started: { color: C.dim,     label: "Not set up",   dot: false },
  }[state] || { color: C.dim, label: state, dot: false };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      background: cfg.color + "18", border: `1px solid ${cfg.color}40`,
      fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: 0.5,
    }}>
      {cfg.dot && (
        <span style={{
          width: 7, height: 7, borderRadius: "50%", background: cfg.color,
          boxShadow: `0 0 8px ${cfg.color}`,
          animation: state === "pending" ? "pulse 1.5s ease-in-out infinite" : "none",
        }}/>
      )}
      {cfg.label}
    </span>
  );
}

// ── QR Panel ──────────────────────────────────────────────────────────────────
function QRPanel({ url, label, size = 180 }) {
  const qr = useQRDataUrl(url, size);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      padding: 20, background: C.card2, borderRadius: 16,
      border: `1px solid ${C.hi}`,
    }}>
      {qr ? (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${C.hi}` }}>
          <img src={qr} width={size} height={size} alt="QR Code" style={{ display: "block" }}/>
        </div>
      ) : (
        <div style={{ width: size, height: size, background: C.dim, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Loading…</span>
        </div>
      )}
      <div style={{ fontSize: 12, color: C.muted, textAlign: "center", maxWidth: size, lineHeight: 1.5 }}>{label}</div>
      <div style={{
        fontSize: 10, color: C.dim, wordBreak: "break-all", textAlign: "center",
        maxWidth: size, fontFamily: "monospace", lineHeight: 1.4,
      }}>{url}</div>
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────
function Steps({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 40 }}>
      {steps.map((s, i) => {
        const done    = i < current;
        const active  = i === current;
        const future  = i > current;
        const color   = done ? "#34d399" : active ? "#60a5fa" : C.dim;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: `2px solid ${color}`,
                background: done ? "#34d39930" : active ? "#60a5fa20" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, color,
                transition: "all 0.4s ease",
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 60, height: 2, background: i < current ? "#34d39940" : C.dim, margin: "0 8px", marginBottom: 22, transition: "background 0.4s" }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Provider card ─────────────────────────────────────────────────────────────
function ProviderCard({ icon, name, description, color, state, children, onSkip }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${state === "connected" ? color + "40" : C.border}`,
      borderRadius: 20, overflow: "hidden",
      transition: "border-color 0.4s",
      boxShadow: state === "connected" ? `0 0 30px ${color}18` : "none",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 22px",
        background: state === "connected" ? `${color}0c` : "transparent",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}20`, border: `1px solid ${color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>{icon}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{name}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{description}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge state={state}/>
          {state !== "connected" && onSkip && (
            <button onClick={onSkip} style={{ background: "none", border: `1px solid ${C.dim}`, color: C.muted, borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
              Skip
            </button>
          )}
        </div>
      </div>
      {/* Body */}
      {children && (
        <div style={{ padding: "22px 22px" }}>{children}</div>
      )}
    </div>
  );
}

// ── STEP 0: Welcome ───────────────────────────────────────────────────────────
function WelcomeStep({ onNext }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontSize: 72, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>🏡</div>
      <h1 style={{ fontSize: 40, fontWeight: 900, color: C.text, margin: "0 0 16px", letterSpacing: -1.5, lineHeight: 1.1 }}>
        Welcome to<br/>
        <span style={{ color: "#60a5fa" }}>Family Hub</span>
      </h1>
      <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.8, margin: "0 0 40px" }}>
        Your private, offline-first family organizer.<br/>
        Let's connect your calendars — takes about 2 minutes.
      </p>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginBottom: 40, flexWrap: "wrap" }}>
        {[
          { icon: "📅", label: "Calendar sync" },
          { icon: "✅", label: "Chore tracking" },
          { icon: "🍽️", label: "Meal planning" },
          { icon: "🛒", label: "Grocery list" },
          { icon: "📸", label: "Photo frame" },
        ].map(f => (
          <div key={f.label} style={{
            padding: "10px 18px", borderRadius: 12,
            background: C.card, border: `1px solid ${C.border}`,
            fontSize: 13, color: C.muted, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{f.icon}</span> {f.label}
          </div>
        ))}
      </div>
      <button onClick={onNext} style={{
        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
        border: "none", color: "#fff", borderRadius: 14,
        padding: "16px 48px", fontSize: 16, fontWeight: 800,
        cursor: "pointer", letterSpacing: 0.3,
        boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(59,130,246,0.45)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 32px rgba(59,130,246,0.35)"; }}
      >
        Get started →
      </button>
    </div>
  );
}

// ── STEP 1: Webcal (iCloud public link) ───────────────────────────────────────
function WebcalStep({ onNext, onSkip }) {
  const [url, setUrl] = useState(
    localStorage.getItem("webcalUrl") ||
    "webcal://p114-caldav.icloud.com/published/2/MTA0MzE1MTE5NTEwNDMxNdCC3yQX1th676OYQ7W7zurIfuHwYgm5WBbZqIAcpIbUoqzF66x4RAQMJb-9BonXfA4PsJNJ6K6vcnf2lD93brg"
  );
  const [extraUrls, setExtraUrls] = useState([""]);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const sync = async () => {
    setSyncing(true); setResult(null);
    const urls = [url, ...extraUrls].filter(u => u.trim()).join(",");
    localStorage.setItem("webcalUrl", url);
    // Trigger sync via API
    const r = await apiFetch("/api/integrations/webcal/sync", { method: "POST" });
    setResult(r);
    setSyncing(false);
    if (r?.synced !== undefined) setTimeout(onNext, 1200);
  };

  return (
    <ProviderCard
      icon="🍎" name="Apple iCloud Calendar" color={WEBCAL_TEAL}
      description="Public calendar link — no password needed"
      state={result ? "connected" : "scanning"}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Your webcal link</div>
          <textarea
            value={url}
            onChange={e => setUrl(e.target.value)}
            rows={4}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.hi}`,
              borderRadius: 10, padding: "10px 13px", color: WEBCAL_TEAL, fontSize: 11,
              fontFamily: "monospace", resize: "none", outline: "none", boxSizing: "border-box",
              lineHeight: 1.6,
            }}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
            In the Calendar app on iPhone: right-click your calendar → Share → <strong style={{ color: C.text }}>Copy Link</strong>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Add family members' calendars</div>
            {extraUrls.map((u, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  value={u}
                  onChange={e => { const n = [...extraUrls]; n[i] = e.target.value; setExtraUrls(n); }}
                  placeholder="webcal://..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 11px", color: C.text, fontSize: 12, outline: "none" }}
                />
                <button onClick={() => setExtraUrls(extraUrls.filter((_, j) => j !== i))} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={() => setExtraUrls([...extraUrls, ""])} style={{ background: "none", border: `1px solid ${C.dim}`, color: C.muted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", marginTop: 4 }}>
              + Add another
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={sync} disabled={syncing} style={{
              background: syncing ? C.dim : WEBCAL_TEAL, border: "none", color: syncing ? C.muted : "#0a2520",
              borderRadius: 10, padding: "11px 24px", fontSize: 13, fontWeight: 800,
              cursor: syncing ? "default" : "pointer",
            }}>
              {syncing ? "Syncing…" : result ? "✓ Synced!" : "Sync calendars"}
            </button>
            <button onClick={onSkip} style={{ background: "none", border: `1px solid ${C.dim}`, color: C.muted, borderRadius: 10, padding: "11px 18px", fontSize: 13, cursor: "pointer" }}>
              Skip
            </button>
          </div>
          {result && (
            <div style={{ marginTop: 12, fontSize: 13, color: WEBCAL_TEAL, fontWeight: 600 }}>
              ✓ {result.synced} event{result.synced !== 1 ? "s" : ""} synced from your iCloud calendar
            </div>
          )}
        </div>

        {/* QR to open webcal on phone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <QRPanel
            url={url.replace("webcal://", "https://")}
            label="Scan to open your iCloud calendar link on your phone"
            size={160}
          />
          <div style={{ padding: "12px 14px", background: C.card2, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>HOW TO GET THE LINK</div>
            {["Open Calendar app on iPhone", "Long-press your calendar name", "Tap Share → Copy Link", "Paste above"].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", background: `${WEBCAL_TEAL}30`, color: WEBCAL_TEAL, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProviderCard>
  );
}

// ── STEP 2: Google Calendar ───────────────────────────────────────────────────
function GoogleStep({ onNext, onSkip }) {
  const [state, setState] = useState("idle"); // idle | loading | qr | polling | connected | error
  const [flow, setFlow]   = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const start = async () => {
    setState("loading");
    const r = await apiFetch("/api/integrations/google/auth/start", { method: "POST" });
    if (r?.user_code) {
      setFlow(r);
      setState("qr");
      startPolling();
    } else {
      setError(r?.error || "Could not start — check GOOGLE_CLIENT_ID in your .env file");
      setState("error");
    }
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      const status = await apiFetch("/api/integrations/status");
      if (status?.google?.connected) {
        clearInterval(pollRef.current);
        setState("connected");
        setTimeout(onNext, 1500);
      }
    }, 3000);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  // Check if already connected on mount
  useEffect(() => {
    apiFetch("/api/integrations/status").then(s => {
      if (s?.google?.connected) setState("connected");
    });
  }, []);

  const googleAuthUrl = flow?.verification_url || "https://google.com/device";

  return (
    <ProviderCard
      icon="G" name="Google Calendar" color={GOOGLE_BLUE}
      description="Two-way sync via OAuth device flow"
      state={state === "connected" ? "connected" : state === "qr" ? "pending" : state === "error" ? "error" : "not_started"}
      onSkip={state !== "connected" ? onSkip : undefined}
    >
      {state === "connected" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>Google Calendar connected!</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Events will sync every 5 minutes</div>
        </div>
      )}

      {state === "idle" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 20 }}>
              Connect your Google account to sync events two ways — events you add on the Pi appear in Google Calendar, and vice versa.
            </div>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 20, padding: "12px 14px", background: C.card2, borderRadius: 10, border: `1px solid ${C.border}` }}>
              <strong style={{ color: C.muted }}>Needs a Google Cloud project.</strong><br/>
              console.cloud.google.com → Create project → Enable Calendar API → Credentials → TV &amp; Limited Input devices → add <code style={{ color: "#60a5fa" }}>GOOGLE_CLIENT_ID</code> and <code style={{ color: "#60a5fa" }}>GOOGLE_CLIENT_SECRET</code> to your .env
            </div>
            <button onClick={start} style={{
              background: GOOGLE_BLUE, border: "none", color: "#fff",
              borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer",
            }}>
              Connect Google
            </button>
          </div>
          <QRPanel url="https://console.cloud.google.com" label="Scan to open Google Cloud Console on your phone" size={160}/>
        </div>
      )}

      {state === "loading" && (
        <div style={{ textAlign: "center", padding: "30px 0", color: C.muted, fontSize: 14 }}>
          Starting authentication…
        </div>
      )}

      {state === "qr" && flow && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 20 }}>
              Scan the QR code with your phone, or visit the URL and enter the code below.
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Enter this code</div>
              <div style={{
                fontSize: 38, fontWeight: 900, letterSpacing: 8,
                color: "#f0f9ff", background: C.card2, border: `2px solid ${GOOGLE_BLUE}40`,
                borderRadius: 14, padding: "18px 24px", textAlign: "center",
                fontFamily: "monospace",
                boxShadow: `0 0 24px ${GOOGLE_BLUE}20`,
              }}>
                {flow.user_code}
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              at: <a href={flow.verification_url} style={{ color: GOOGLE_BLUE }}>{flow.verification_url}</a>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24", boxShadow: "0 0 8px #fbbf24", animation: "pulse 1.5s ease-in-out infinite" }}/>
              <span style={{ fontSize: 12, color: "#fbbf24" }}>Waiting for approval on your phone…</span>
            </div>
          </div>
          <QRPanel url={flow.verification_url} label="Scan → enter the code → approve" size={180}/>
        </div>
      )}

      {state === "error" && (
        <div style={{ padding: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.6 }}>{error}</div>
          <button onClick={() => setState("idle")} style={{ marginTop: 12, background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer" }}>Try again</button>
        </div>
      )}
    </ProviderCard>
  );
}

// ── STEP 3: Apple CalDAV (two-way) ────────────────────────────────────────────
function AppleStep({ onNext, onSkip }) {
  const [status, setStatus]       = useState("idle");
  const [calendars, setCalendars] = useState([]);
  const [selected, setSelected]   = useState("");
  const [error, setError]         = useState("");

  useEffect(() => {
    apiFetch("/api/integrations/status").then(s => {
      if (s?.apple?.connected) setStatus("connected");
    });
  }, []);

  const discover = async () => {
    setStatus("discovering"); setError("");
    const r = await apiFetch("/api/integrations/apple/calendars");
    if (r?.calendars?.length) {
      setCalendars(r.calendars);
      setStatus("select");
    } else {
      setError(r?.error || "Could not discover calendars. Check APPLE_USERNAME and APPLE_PASSWORD in .env.");
      setStatus("error");
    }
  };

  const connect = async () => {
    if (!selected) return;
    setStatus("syncing");
    const r = await apiFetch("/api/integrations/apple/sync", { method: "POST" });
    if (r?.synced !== undefined) {
      setStatus("connected");
      setTimeout(onNext, 1500);
    } else {
      setError("Sync failed — check logs");
      setStatus("error");
    }
  };

  const piIp = window.location.hostname !== "localhost" ? window.location.hostname : "YOUR_PI_IP";

  return (
    <ProviderCard
      icon="🍎" name="Apple iCloud (Two-way sync)" color={APPLE_SILVER}
      description="Read + write via CalDAV — app-specific password"
      state={status === "connected" ? "connected" : status === "discovering" || status === "syncing" ? "pending" : status === "error" ? "error" : "not_started"}
      onSkip={status !== "connected" ? onSkip : undefined}
    >
      {status === "connected" && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#34d399" }}>Apple Calendar connected!</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Two-way sync is active</div>
        </div>
      )}

      {(status === "idle" || status === "error") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              For two-way sync (create events from the Pi that appear in Apple Calendar), you need an app-specific password.
            </div>
            <div style={{ padding: "14px 16px", background: C.card2, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Setup steps</div>
              {[
                ["appleid.apple.com", "Sign in to Apple ID"],
                ["App-Specific Passwords", 'Click + → name it "Family Hub"'],
                [".env file on Pi", "Add APPLE_USERNAME and APPLE_PASSWORD"],
                ["Discover below", "Find your calendar URL"],
              ].map(([where, what], i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: `${APPLE_SILVER}20`, color: APPLE_SILVER, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 11, color: APPLE_SILVER, fontWeight: 700 }}>{where}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{what}</div>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ padding: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, fontSize: 12, color: "#fca5a5", marginBottom: 14 }}>{error}</div>
            )}
            <button onClick={discover} style={{
              background: APPLE_SILVER, border: "none", color: "#0a1628",
              borderRadius: 10, padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}>
              Discover Calendars
            </button>
          </div>
          <QRPanel url="https://appleid.apple.com" label="Scan to open appleid.apple.com and generate an app-specific password" size={160}/>
        </div>
      )}

      {status === "discovering" && (
        <div style={{ textAlign: "center", padding: "30px 0", color: C.muted }}>Discovering your Apple calendars…</div>
      )}

      {status === "select" && (
        <div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Select which calendar to sync:</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            {calendars.map(cal => (
              <label key={cal.url} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: selected === cal.url ? `${APPLE_SILVER}15` : C.card2,
                border: `1px solid ${selected === cal.url ? APPLE_SILVER + "60" : C.border}`,
                borderRadius: 12, cursor: "pointer",
              }}>
                <input type="radio" name="calendar" value={cal.url} checked={selected === cal.url} onChange={() => setSelected(cal.url)} style={{ accentColor: APPLE_SILVER }}/>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cal.name}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", marginTop: 2 }}>{cal.url.slice(0, 50)}…</div>
                </div>
              </label>
            ))}
          </div>
          <button onClick={connect} disabled={!selected} style={{
            background: selected ? APPLE_SILVER : C.dim, border: "none",
            color: selected ? "#0a1628" : C.muted, borderRadius: 10,
            padding: "11px 28px", fontSize: 13, fontWeight: 800, cursor: selected ? "pointer" : "default",
          }}>
            Connect selected calendar
          </button>
        </div>
      )}

      {status === "syncing" && (
        <div style={{ textAlign: "center", padding: "30px 0", color: C.muted }}>Connecting and syncing…</div>
      )}
    </ProviderCard>
  );
}

// ── STEP 4: Remote Access / Tailscale ─────────────────────────────────────────
function RemoteStep({ onNext, onSkip }) {
  const [state, setState]     = useState("idle");
  const [apiKey, setApiKey]   = useState(() => localStorage.getItem("familyHubApiKey") || "");
  const [piIp, setPiIp]       = useState("192.168.1.100");
  const [tsHost, setTsHost]   = useState("");
  const localUrl = `http://${piIp}:3001`;
  const remoteUrl = tsHost ? `http://${tsHost}:3001` : null;

  const save = () => {
    localStorage.setItem("familyHubApiKey", apiKey);
    localStorage.setItem("familyHubApi", localUrl);
    setState("saved");
    setTimeout(onNext, 1200);
  };

  const mobileUrl = `${localUrl}/api/docs`;

  return (
    <ProviderCard
      icon="🌐" name="Remote & Mobile Access" color={TAILSCALE_TL}
      description="Access Family Hub from your phone, anywhere"
      state={state === "saved" ? "connected" : "not_started"}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Pi's local IP address</div>
            <input value={piIp} onChange={e => setPiIp(e.target.value)} placeholder="192.168.1.100"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.hi}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" }}/>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>Find it on the Pi with: <code style={{ color: TAILSCALE_TL }}>hostname -I</code></div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>API key (for remote access)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste key from API_KEYS in .env"
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.hi}`, borderRadius: 10, padding: "10px 13px", color: TAILSCALE_TL, fontSize: 13, outline: "none", fontFamily: "monospace" }}/>
              <button onClick={() => { const k = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); setApiKey(k); }}
                style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 10, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
                Generate
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Tailscale hostname (optional)</div>
            <input value={tsHost} onChange={e => setTsHost(e.target.value)} placeholder="family-hub.tail1234.ts.net"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.hi}`, borderRadius: 10, padding: "10px 13px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}/>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
              For access outside home — run <code style={{ color: TAILSCALE_TL }}>bash infra/setup-remote-access.sh</code> on Pi
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} style={{
              background: TAILSCALE_TL, border: "none", color: "#0a1628",
              borderRadius: 10, padding: "11px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            }}>
              Save & continue
            </button>
            <button onClick={onSkip} style={{ background: "none", border: `1px solid ${C.dim}`, color: C.muted, borderRadius: 10, padding: "11px 18px", fontSize: 13, cursor: "pointer" }}>
              Skip
            </button>
          </div>
        </div>

        {/* QR to open the API docs on phone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <QRPanel url={mobileUrl} label="Scan to open Family Hub on your phone (same WiFi)" size={160}/>
          <div style={{ padding: "12px 14px", background: C.card2, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>REMOTE ACCESS</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              Install Tailscale on both your Pi and phone. Once connected, you can access the dashboard from anywhere in the world on your private network.
            </div>
            <a href="https://tailscale.com/download" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: TAILSCALE_TL }}>tailscale.com/download →</a>
          </div>
        </div>
      </div>
    </ProviderCard>
  );
}

// ── STEP 5: All done ──────────────────────────────────────────────────────────
function DoneStep({ completedSteps, onLaunch }) {
  const piIp = window.location.hostname !== "localhost" ? window.location.hostname : "your-pi-ip";

  return (
    <div style={{ textAlign: "center", maxWidth: 580, margin: "0 auto" }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontSize: 32, fontWeight: 900, color: C.text, margin: "0 0 12px", letterSpacing: -1 }}>All set!</h2>
      <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, margin: "0 0 32px" }}>
        Family Hub is ready. Your calendars will sync automatically every 5 minutes.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36, textAlign: "left" }}>
        {[
          { label: "iCloud webcal", state: completedSteps.webcal ? "connected" : "skipped", color: WEBCAL_TEAL },
          { label: "Google Calendar", state: completedSteps.google ? "connected" : "skipped", color: GOOGLE_BLUE },
          { label: "Apple two-way", state: completedSteps.apple ? "connected" : "skipped", color: APPLE_SILVER },
          { label: "Remote access", state: completedSteps.remote ? "connected" : "skipped", color: TAILSCALE_TL },
        ].map(({ label, state, color }) => (
          <div key={label} style={{ padding: "12px 16px", background: C.card, border: `1px solid ${state === "connected" ? color + "40" : C.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</span>
            <StatusBadge state={state}/>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 32, padding: "16px 20px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Access from your phone</div>
        <QRPanel url={`http://${piIp}:5173`} label="Open Family Hub on any device on your WiFi" size={130}/>
      </div>

      <button onClick={onLaunch} style={{
        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
        border: "none", color: "#fff", borderRadius: 14,
        padding: "18px 56px", fontSize: 17, fontWeight: 900,
        cursor: "pointer", letterSpacing: 0.3,
        boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
        animation: "pulse-btn 2s ease-in-out infinite",
      }}>
        Launch Family Hub →
      </button>
    </div>
  );
}

// ── Main onboarding flow ──────────────────────────────────────────────────────
export default function OnboardingPage({ onComplete }) {
  const [step, setStep]       = useState(0);
  const [completed, setCompleted] = useState({ webcal: false, google: false, apple: false, remote: false });

  const STEP_NAMES = ["Welcome", "iCloud", "Google", "Apple", "Remote", "Done"];

  const markDone = (key) => setCompleted(c => ({ ...c, [key]: true }));
  const next = () => setStep(s => s + 1);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "48px 24px 80px", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", color: C.text, position: "relative" }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes pulse-btn { 0%,100%{box-shadow:0 8px 32px rgba(59,130,246,0.35)} 50%{box-shadow:0 8px 48px rgba(99,102,241,0.55)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>

      <GridBackground/>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 760 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: C.muted, textTransform: "uppercase" }}>🏡 Family Hub</span>
        </div>

        {/* Step indicators (skip Welcome and Done) */}
        {step > 0 && step < 5 && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
            <Steps steps={["iCloud", "Google", "Apple", "Remote"]} current={step - 1}/>
          </div>
        )}

        {/* Step content */}
        <div key={step} style={{ animation: "fadeIn 0.35s ease" }}>
          {step === 0 && <WelcomeStep onNext={next}/>}
          {step === 1 && <WebcalStep onNext={() => { markDone("webcal"); next(); }} onSkip={next}/>}
          {step === 2 && <GoogleStep onNext={() => { markDone("google"); next(); }} onSkip={next}/>}
          {step === 3 && <AppleStep  onNext={() => { markDone("apple"); next(); }} onSkip={next}/>}
          {step === 4 && <RemoteStep onNext={() => { markDone("remote"); next(); }} onSkip={next}/>}
          {step === 5 && <DoneStep completedSteps={completed} onLaunch={() => { localStorage.setItem("onboardingComplete", "1"); onComplete?.(); }}/>}
        </div>
      </div>
    </div>
  );
}

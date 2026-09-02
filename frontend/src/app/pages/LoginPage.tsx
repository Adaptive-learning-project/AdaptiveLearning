import { useState } from "react";
import { Link, useNavigate } from "react-router";

const P = "Poppins, sans-serif";
const BLUE = "#1565c0";
const BG = "#f5f9fd";
const BORDER = "#d5e6f5";
const TEXT = "#0d2137";
const MUTED = "#607d8b";

// Animated book illustration (reference project style)
function BookIllustration() {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "32px 0 24px" }}>
      <div style={{ position: "relative", width: 160, height: 140 }}>
        <svg width="160" height="140" viewBox="0 0 160 140" fill="none">
          {/* Book body */}
          <rect x="20" y="30" width="55" height="80" rx="6" fill="#1565c0" />
          <rect x="85" y="30" width="55" height="80" rx="6" fill="#42a5f5" />
          {/* Spine */}
          <rect x="74" y="28" width="12" height="84" rx="4" fill="#0d47a1" />
          {/* Pages detail */}
          <line x1="30" y1="50" x2="65" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="62" x2="65" y2="62" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="74" x2="55" y2="74" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <line x1="95" y1="50" x2="130" y2="50" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
          <line x1="95" y1="62" x2="130" y2="62" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
          <line x1="95" y1="74" x2="115" y2="74" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" />
          {/* Graduation cap */}
          <rect x="60" y="8" width="40" height="8" rx="3" fill={BLUE} />
          <polygon points="80,2 100,12 80,18 60,12" fill="#1565c0" />
          <line x1="100" y1="12" x2="106" y2="22" stroke={BLUE} strokeWidth="2" strokeLinecap="round" />
          <circle cx="106" cy="24" r="3" fill={BLUE} />
          {/* Shadow */}
          <ellipse cx="80" cy="118" rx="45" ry="6" fill="#dce8f5" />
        </svg>
      </div>
    </div>
  );
}

// Focused input field
function Field({
  label, id, type, value, onChange, placeholder, autoComplete, right,
}: {
  label: string; id: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  autoComplete?: string; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{label}</label>
      <div style={{
        display: "flex", alignItems: "center",
        minHeight: 50, borderRadius: 12, overflow: "hidden",
        border: `1.5px solid ${focused ? BLUE : BORDER}`,
        background: focused ? "#fff" : "#f8fbff",
        boxShadow: focused ? `0 0 0 4px rgba(21,101,192,0.08)` : "none",
        transition: "all .2s",
      }}>
        <input
          id={id} type={type} value={value} placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            padding: "0 14px", fontSize: 14, color: TEXT, fontFamily: P,
          }}
        />
        {right && <div style={{ paddingRight: 12 }}>{right}</div>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [remember,    setRemember]    = useState(true);
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState("");
  const [success,     setSuccess]     = useState(false);

  // ── Auth logic (unchanged) ────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!email || !password) { setServerError("Please enter your email and password."); return; }
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
      const res  = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid email or password.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user",  JSON.stringify(data.user));
      if (remember) localStorage.setItem("rememberMe", "true");
      else          localStorage.removeItem("rememberMe");
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setServerError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: P, display: "flex", flexDirection: "column" }}>

      {/* Background shapes */}
      <div style={{ position: "fixed", width: 480, height: 480, top: -280, left: -180, borderRadius: "50%", background: "#e3f2fd", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 320, height: 320, top: -180, right: -140, borderRadius: "50%", background: "#eaf4fc", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", width: 380, height: 380, bottom: -200, right: -100, borderRadius: "50%", background: "#e8f4fd", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <header style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px clamp(20px,5vw,64px)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(21,101,192,0.20)" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>G</span>
          </div>
          <div>
            <div style={{ color: TEXT, fontSize: 16, fontWeight: 800, lineHeight: 1 }}>GIID Tambaram</div>
            <div style={{ color: MUTED, fontSize: 8, fontWeight: 600, letterSpacing: 1.2, marginTop: 4 }}>ADAPTIVE LEARNING PLATFORM</div>
          </div>
        </Link>
        <div style={{ fontSize: 13, color: MUTED }}>
          New here?{" "}
          <Link to="/register" style={{ color: BLUE, fontWeight: 700, textDecoration: "none" }}>Create account →</Link>
        </div>
      </header>

      {/* Main grid */}
      <main style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 48px" }}>
        <div style={{ width: "100%", maxWidth: 920, display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(21,101,192,0.10), 0 4px 20px rgba(0,0,0,0.06)", border: `1px solid ${BORDER}` }}>

          {/* Left panel */}
          <div style={{ background: "#fff", padding: "44px 40px", display: "flex", flexDirection: "column", borderRight: `1px solid ${BORDER}` }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "#eaf3ff", border: `1px solid #c5ddf8`, marginBottom: 20 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: BLUE, display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: BLUE, letterSpacing: 0.8 }}>TEACHER PORTAL</span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: TEXT, lineHeight: 1.2, margin: "0 0 12px" }}>
                Welcome back to<br />
                <span style={{ color: BLUE }}>LearnAble</span>
              </h1>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.75, maxWidth: 280, margin: 0 }}>
                Sign in to manage your students, review LLM-generated content, and track adaptive learning progress.
              </p>
            </div>

            <BookIllustration />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["school",        "Adaptive learning engine"],
                ["psychology",    "BKT-powered mastery tracking"],
                ["bar_chart",     "Real-time student analytics"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "#f8fbff", border: `1px solid ${BORDER}` }}>
                  <span className="material-icons-round" style={{ color: BLUE, fontSize: 17 }}>{icon}</span>
                  <span style={{ color: "#334155", fontSize: 13, fontWeight: 600 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — form */}
          <div style={{ background: "#fafcff", padding: "44px 42px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

            {/* Icon + heading */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#eaf3ff", border: `1px solid #c5ddf8`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <span className="material-icons-round" style={{ color: BLUE, fontSize: 24 }}>lock</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: "0 0 6px" }}>Sign in</h2>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Enter your credentials to continue.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field
                id="email" label="Email address" type="email"
                value={email} onChange={setEmail}
                placeholder="teacher@giid.edu.in" autoComplete="email"
              />

              <Field
                id="password" label="Password" type={showPass ? "text" : "password"}
                value={password} onChange={setPassword}
                placeholder="Enter your password" autoComplete="current-password"
                right={
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ border: "none", background: "transparent", cursor: "pointer", color: MUTED, display: "flex", padding: 0 }}>
                    <span className="material-icons-round" style={{ fontSize: 20 }}>{showPass ? "visibility_off" : "visibility"}</span>
                  </button>
                }
              />

              {/* Remember + forgot */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: BLUE, width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, color: MUTED }}>Remember me</span>
                </label>
                <button type="button" style={{ border: "none", background: "transparent", color: BLUE, fontSize: 13, cursor: "pointer", fontFamily: P, fontWeight: 600, padding: 0 }}>
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {serverError && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fff5f5", border: "1px solid #fecaca", color: "#b91c1c", fontSize: 13, display: "flex", gap: 7, alignItems: "center" }}>
                  <span>⚠</span> {serverError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", padding: "14px", borderRadius: 12, border: "none",
                  background: loading ? "#93b8e8" : BLUE,
                  color: "#fff", fontFamily: P, fontWeight: 700, fontSize: 15,
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: loading ? "none" : "0 8px 22px rgba(21,101,192,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all .2s",
                }}
              >
                {loading ? (
                  <>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", display: "inline-block", animation: "spin .7s linear infinite" }} />
                    Signing in...
                  </>
                ) : (
                  <>
                    <span className="material-icons-round" style={{ fontSize: 18 }}>login</span>
                    Sign in
                  </>
                )}
              </button>
            </form>

            {/* Success banner */}
            {success && (
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                ✓ Signed in! Redirecting to dashboard...
              </div>
            )}

            {/* Register link */}
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: MUTED }}>
              Don't have an account?{" "}
              <Link to="/register" style={{ color: BLUE, fontWeight: 700, textDecoration: "none" }}>Create teacher profile</Link>
            </p>

            {/* Trust badges */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              {["🔒 Secure", "🧠 Adaptive", "📊 Analytics"].map(b => (
                <span key={b} style={{ fontSize: 11, color: "#94a3b8" }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom wave */}
      <svg style={{ position: "fixed", bottom: 0, left: 0, width: "100%", height: 100, pointerEvents: "none", zIndex: 0 }} viewBox="0 0 1440 100" preserveAspectRatio="none">
        <path d="M0 60 C360 0 720 90 1080 40 C1260 15 1380 55 1440 30 L1440 100 L0 100 Z" fill="#e3f2fd" opacity="0.6" />
      </svg>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input::placeholder { color: #94a3b8; }`}</style>
    </div>
  );
}

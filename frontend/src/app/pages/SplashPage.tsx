import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

const P = "Poppins, sans-serif";

const MESSAGES = [
  "Initializing platform...",
  "Loading learning environment...",
  "Preparing adaptive engine...",
  "Setting up your workspace...",
  "Almost ready...",
];

export default function SplashPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  // Advance progress bar
  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); return 100; }
        return Math.min(p + 4, 100);
      });
    }, 140);
    return () => clearInterval(t);
  }, []);

  // Navigate once complete
  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => navigate("/login"), 700);
      return () => clearTimeout(t);
    }
  }, [progress, navigate]);

  const msgIdx = Math.min(Math.floor(progress / 20), MESSAGES.length - 1);

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#f5f9fd", fontFamily: P }}>

      {/* Background shapes */}
      <div style={{ position: "absolute", width: 520, height: 520, top: -300, left: -180, borderRadius: "50%", background: "#e3f2fd", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 360, height: 360, top: -220, right: -170, borderRadius: "50%", background: "#eaf4fc", pointerEvents: "none" }} />

      {/* Dot pattern */}
      <div style={{ position: "absolute", right: "7%", top: "28%", display: "grid", gridTemplateColumns: "repeat(5,7px)", gap: 13, opacity: 0.45, pointerEvents: "none" }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#64b5f6" }} />
        ))}
      </div>

      {/* Bottom wave */}
      <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 240, pointerEvents: "none" }} viewBox="0 0 1440 280" preserveAspectRatio="none">
        <path d="M0 180 C180 90 310 245 510 205 C700 165 760 65 960 125 C1130 177 1220 225 1440 120 L1440 280 L0 280 Z" fill="#e3f2fd" />
        <path d="M0 225 C200 125 330 280 550 230 C740 188 820 120 1010 160 C1190 198 1270 245 1440 165 L1440 280 L0 280 Z" fill="#bbdefb" opacity="0.75" />
        <path d="M0 255 C190 170 360 295 570 250 C780 205 850 160 1050 195 C1210 222 1320 270 1440 205 L1440 280 L0 280 Z" fill="#1565c0" opacity="0.88" />
      </svg>

      {/* Header */}
      <header style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "26px clamp(22px,5vw,72px)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{ width: 45, height: 45, borderRadius: 12, background: "#1565c0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 22px rgba(21,101,192,0.20)" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 19 }}>G</span>
          </div>
          <div>
            <div style={{ color: "#0d2137", fontSize: 17, fontWeight: 800, lineHeight: 1 }}>GIID Tambaram</div>
            <div style={{ color: "#607d8b", fontSize: 8, fontWeight: 600, letterSpacing: 1.2, marginTop: 5 }}>ADAPTIVE LEARNING PLATFORM</div>
          </div>
        </Link>
        <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 17px", borderRadius: 10, background: "#fff", border: "1px solid #d5e6f5", color: "#1565c0", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "0 5px 18px rgba(21,101,192,0.06)" }}>
          Teacher Login <span>→</span>
        </Link>
      </header>

      {/* Main */}
      <main style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 105px)", padding: "30px 24px 220px" }}>
        <div style={{ maxWidth: 900, width: "100%", textAlign: "center" }}>

          {/* Logo icon */}
          <div style={{ width: 105, height: 105, margin: "0 auto 28px", borderRadius: 30, background: "#fff", border: "1px solid #dceaf7", boxShadow: "0 15px 40px rgba(21,101,192,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="65" height="65" viewBox="0 0 80 80" fill="none">
              <path d="M12 20C25 18 34 23 40 32V66C32 57 23 53 12 54V20Z" fill="#1565c0" />
              <path d="M68 20C55 18 46 23 40 32V66C48 57 57 53 68 54V20Z" fill="#42a5f5" />
              <path d="M40 32V66" stroke="#0d47a1" strokeWidth="3" strokeLinecap="round" />
              <path d="M8 24V59C21 58 31 61 40 70C49 61 59 58 72 59V24" stroke="#1565c0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="40" cy="12" r="5" fill="#1565c0" />
            </svg>
          </div>

          {/* Brand */}
          <div style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, letterSpacing: "-1.5px", color: "#0d2137", lineHeight: 1.1 }}>
            GIID <span style={{ color: "#1565c0" }}>Tambaram</span>
          </div>
          <div style={{ marginTop: 13, color: "#607d8b", fontSize: "clamp(13px,2vw,16px)", fontWeight: 500 }}>
            Intelligent learning. Personalized progress.
          </div>

          {/* Divider */}
          <div style={{ width: 75, height: 4, borderRadius: 10, background: "#1565c0", margin: "25px auto 23px" }} />

          {/* Description */}
          <p style={{ maxWidth: 600, margin: "0 auto", color: "#607d8b", fontSize: "clamp(13px,2vw,15px)", lineHeight: 1.8 }}>
            A modern adaptive learning environment designed to support every learner through personalized activities, meaningful progress, and accessible technology.
          </p>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 30 }}>
            {["Personalized Learning", "Accessible Activities", "Learning Analytics"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 20, background: "#fff", border: "1px solid #dceaf7", color: "#456477", fontSize: 11, fontWeight: 600 }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#e3f2fd", color: "#1565c0", fontSize: 10, fontWeight: 800 }}>✓</span>
                {f}
              </div>
            ))}
          </div>

          {/* Loading area */}
          <div style={{ maxWidth: 430, margin: "48px auto 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "#607d8b", fontWeight: 500 }}>{MESSAGES[msgIdx]}</span>
              <span style={{ fontSize: 11, color: "#1565c0", fontWeight: 700 }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: "100%", height: 6, borderRadius: 20, background: "#dceaf7", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 20, background: "#1565c0", width: `${progress}%`, transition: "width 0.25s ease-out" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 13 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#1565c0", display: "inline-block", animation: `pulse 1s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom brand */}
      <div style={{ position: "absolute", zIndex: 20, bottom: 18, left: 0, width: "100%", textAlign: "center" }}>
        <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>Empowering every learner.</span>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:.25} 50%{opacity:1} }`}</style>
    </div>
  );
}

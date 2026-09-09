import { useState } from "react";
import { useNavigate } from "react-router";
import { studentApi } from "../api/adaptiveApi";

const P = "Poppins, sans-serif";
const BLUE = "#1565c0";
const BG = "#f5f9fd";
const WHITE = "#ffffff";
const BORDER = "#dce8f5";
const TEXT = "#0d2137";
const MUTED = "#607d8b";

export default function LoginPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<"Student" | "Admin">("Student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) return;

    if (role === "Admin") {
      sessionStorage.setItem("user_role", "admin");
      navigate("/admin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await studentApi.login(identifier.trim());
      sessionStorage.setItem("student_id", res.student_id);
      sessionStorage.setItem("student_name", res.student_name);
      sessionStorage.setItem("user_role", "student");
      navigate("/learning-modules");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Student not approved or registered by Admin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: P, display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ background: WHITE, borderRadius: 24, padding: "36px 32px", maxWidth: 420, width: "100%", border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.03)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎓</div>
          <h2 style={{ margin: 0, color: TEXT, fontSize: 22, fontWeight: 800 }}>LearnAble Platform</h2>
          <p style={{ margin: "6px 0 0", color: MUTED, fontSize: 13 }}>Sign in to continue your adaptive learning path</p>
        </div>

        {/* Role Toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: BG, padding: 4, borderRadius: 14, marginBottom: 20 }}>
          {(["Student", "Admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setError(""); }}
              style={{
                padding: "8px 0",
                borderRadius: 10,
                border: "none",
                background: role === r ? WHITE : "transparent",
                color: role === r ? BLUE : MUTED,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: role === r ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 12, fontSize: 13, marginBottom: 18 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6 }}>
              {role === "Student" ? "STUDENT NAME OR EMAIL" : "ADMIN CREDENTIAL"}
            </label>
            <input
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === "Student" ? "e.g. Arun Kumar or Meena" : "admin"}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: BG,
                fontSize: 15,
                color: TEXT,
                outline: "none",
                fontFamily: P,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: BLUE,
              color: WHITE,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(21,101,192,0.25)",
            }}
          >
            {loading ? "Authenticating..." : `Enter as ${role} →`}
          </button>
        </form>

        {role === "Student" && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
            <span style={{ fontSize: 12, color: MUTED }}>Demo Whitelisted: </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Arun Kumar · Meena Devi · Suresh</span>
          </div>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { studentApi } from "../api/adaptiveApi";

const P = "Poppins, sans-serif";
const BLUE = "#1565c0";
const BG = "#f5f9fd";
const WHITE = "#ffffff";
const BORDER = "#dce8f5";
const TEXT = "#0d2137";
const MUTED = "#607d8b";
const LIGHT_BLUE = "#eaf3ff";

export default function LearningModulesPage() {
  const navigate = useNavigate();
  const [studentName] = useState(() => sessionStorage.getItem("student_name") || "Student");
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Call studentApi.getModules() or fallback to adminApi.listUnits()
    studentApi
      .getModules()
      .then((res: any) => {
        const list = res.modules || res.units || [];
        // Normalize _id to unit_id if necessary
        const normalized = list.map((item: any) => ({
          ...item,
          unit_id: item.unit_id || item._id,
        }));
        setModules(normalized);
      })
      .catch((err) => {
        console.error("Could not load units from getModules, trying fallback:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  function startModule(unitId: string, topicName: string) {
    sessionStorage.setItem("unit_id", unitId);
    sessionStorage.setItem("topic_name", topicName);
    navigate("/student");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: P, padding: "32px 24px" }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>

        {/* Header Bar */}
        <div
          style={{
            background: WHITE,
            borderRadius: 20,
            padding: "20px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: `1px solid ${BORDER}`,
            marginBottom: 28,
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: TEXT, fontSize: 20, fontWeight: 800 }}>Welcome, {studentName}! 👋</h2>
            <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>Choose an active curriculum module to begin</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.clear();
              navigate("/login");
            }}
            style={{
              background: BG,
              border: `1px solid ${BORDER}`,
              color: MUTED,
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Modules Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>Available Curriculum Modules</h3>
          <span style={{ fontSize: 13, color: MUTED }}>{modules.length} Available</span>
        </div>

        {loading ? (
          <div style={{ background: WHITE, borderRadius: 16, padding: 40, textAlign: "center", border: `1px solid ${BORDER}`, color: MUTED }}>
            Loading available curriculum modules...
          </div>
        ) : modules.length === 0 ? (
          <div style={{ background: WHITE, borderRadius: 16, padding: 40, textAlign: "center", border: `1px solid ${BORDER}`, color: MUTED }}>
            No modules published yet. Please ask the Admin to initialize a curriculum unit.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
            {modules.map((m) => (
              <div
                key={m.unit_id}
                style={{
                  background: WHITE,
                  borderRadius: 20,
                  padding: "24px",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT }}>{m.topic}</h4>
                    <span style={{ background: LIGHT_BLUE, color: BLUE, padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                      DAG INITIALIZED
                    </span>
                  </div>
                  <p style={{ margin: "0 0 18px", fontSize: 13, color: MUTED }}>
                    Subtopics: {Array.isArray(m.subtopics) ? m.subtopics.join(", ") : "Interactive Concepts"}
                  </p>
                </div>

                <button
                  onClick={() => startModule(m.unit_id, m.topic)}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "none",
                    background: BLUE,
                    color: WHITE,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(21,101,192,0.2)",
                  }}
                >
                  Start Adaptive Session →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
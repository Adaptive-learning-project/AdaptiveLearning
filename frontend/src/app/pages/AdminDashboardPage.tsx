import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { adminApi } from "../api/adaptiveApi";
import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";
const BLUE = "#1565c0";
const BG = "#f5f9fd";
const WHITE = "#ffffff";
const BORDER = "#dce8f5";
const TEXT = "#0d2137";
const MUTED = "#607d8b";
const LIGHT_BLUE = "#eaf3ff";
const GREEN = "#16a34a";
const ORANGE = "#d97706";

export default function AdminDashboardPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Unit creation modal state
  const [showModal, setShowModal] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [subtopicsInput, setSubtopicsInput] = useState("");
  const [refText, setRefText] = useState("");
    const [activeTab, setActiveTab] = useState<
  "All Units" | "Approved Students" | "Pending Escalations"
>("All Units");
  const [search, setSearch] = useState("");
    const [students, setStudents] = useState<any[]>([]);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [newStudentName, setNewStudentName] = useState("");
    const [newStudentEmail, setNewStudentEmail] = useState("");

async function loadAdminData() {
  setIsLoading(true);
  try {
    const [uRes, eRes, sRes] = await Promise.all([
      adminApi.listUnits().catch(() => ({ units: [] })),
      adminApi.getEscalations().catch(() => ({ escalations: [] })),
      adminApi.listStudents().catch(() => ({ students: [] })),
    ]);
    setUnits(uRes.units || []);
    setEscalations(eRes.escalations || []);
    setStudents(sRes.students || []);
  } catch (e) {
    console.error("Failed to load admin data:", e);
  } finally {
    setIsLoading(false);
  }
}

// 3. Handlers for student operations
async function handleAddStudent(e: React.FormEvent) {
  e.preventDefault();
  if (!newStudentName.trim()) return;

  try {
    await adminApi.addStudent({
      name: newStudentName.trim(),
      email: newStudentEmail.trim(),
    });
    setShowStudentModal(false);
    setNewStudentName("");
    setNewStudentEmail("");
    await loadAdminData();
  } catch (err: any) {
    alert(err.response?.data?.detail || "Error adding student");
  }
}

async function handleToggleStudent(studentId: string) {
  try {
    await adminApi.toggleStudent(studentId);
    await loadAdminData();
  } catch (err) {
    console.error("Failed to toggle access:", err);
  }
}

  async function handleCreateUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!topicName.trim() || !subtopicsInput.trim()) return;

    const subtopics = subtopicsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await adminApi.createUnit({
        topic: topicName.trim(),
        subtopics,
        reference_text: refText.trim(),
        teacher_id: "admin_01",
      });
      setShowModal(false);
      setTopicName("");
      setSubtopicsInput("");
      setRefText("");
      await loadAdminData();
    } catch (err) {
      console.error("Create unit error:", err);
    }
  }

  async function handleResolve(escId: string) {
    try {
      await adminApi.resolveEscalation({
        escalation_id: escId,
        teacher_note: "Resolved via Admin Command Center",
      });
      await loadAdminData();
    } catch (e) {
      console.error("Resolve error:", e);
    }
  }

  const filteredUnits = useMemo(() => {
    return units.filter((u) => u.topic?.toLowerCase().includes(search.toLowerCase()));
  }, [units, search]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, color: TEXT, fontFamily: P }}>
      <div style={{ position: "relative", zIndex: 5 }}>
        <Sidebar active="Admin" />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar title="Admin Command Center" subtitle="Neuro-Symbolic Hybrid Architecture & Telemetry Supervisor" />

        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px 60px" }}>
          {/* Hero Banner */}
          <section
            style={{
              borderRadius: 20,
              padding: "24px 28px",
              marginBottom: 24,
              background: WHITE,
              border: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
              <div style={{ display: "flex", gap: 10 }}>
  <button
    onClick={() => setShowStudentModal(true)}
    style={{
      background: LIGHT_BLUE,
      color: BLUE,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "12px 18px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    ＋ Register Student
  </button>
  <button
    onClick={() => setShowModal(true)}
    style={{
      background: BLUE,
      color: WHITE,
      border: "none",
      borderRadius: 12,
      padding: "12px 20px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    ＋ Initialize Unit
  </button>
</div>
              {activeTab === "Approved Students" && (
  <div style={{ background: WHITE, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
      <thead>
        <tr style={{ background: BG, borderBottom: `1px solid ${BORDER}` }}>
          <th style={{ padding: "14px 20px", fontSize: 13, color: MUTED, fontWeight: 700 }}>STUDENT NAME</th>
          <th style={{ padding: "14px 20px", fontSize: 13, color: MUTED, fontWeight: 700 }}>LOGIN IDENTIFIER</th>
          <th style={{ padding: "14px 20px", fontSize: 13, color: MUTED, fontWeight: 700 }}>ACCESS STATUS</th>
          <th style={{ padding: "14px 20px", fontSize: 13, color: MUTED, fontWeight: 700, textAlign: "right" }}>ACTION</th>
        </tr>
      </thead>
      <tbody>
        {students.length === 0 ? (
          <tr>
            <td colSpan={4} style={{ padding: 32, textAlign: "center", color: MUTED }}>
              No students registered yet. Click "Register Student" above.
            </td>
          </tr>
        ) : (
          students.map((s) => (
            <tr key={s.student_id} style={{ borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "14px 20px", fontWeight: 700, color: TEXT }}>{s.name}</td>
              <td style={{ padding: "14px 20px", color: MUTED, fontSize: 13 }}>{s.email}</td>
              <td style={{ padding: "14px 20px" }}>
                <span style={{
                  padding: "4px 10px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  background: s.enabled ? "#ecfdf5" : "#fef2f2",
                  color: s.enabled ? GREEN : "#dc2626"
                }}>
                  {s.enabled ? "APPROVED" : "DISABLED"}
                </span>
              </td>
              <td style={{ padding: "14px 20px", textAlign: "right" }}>
                <button
                  onClick={() => handleToggleStudent(s.student_id)}
                  style={{
                    background: s.enabled ? "#fee2e2" : LIGHT_BLUE,
                    color: s.enabled ? "#dc2626" : BLUE,
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {s.enabled ? "Revoke Access" : "Approve Access"}
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)}
              {showStudentModal && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(13,33,55,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
    <div style={{ background: WHITE, borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", border: `1px solid ${BORDER}` }}>
      <h3 style={{ margin: "0 0 14px", color: TEXT, fontSize: 18, fontWeight: 800 }}>Register & Whitelist Student</h3>
      <form onSubmit={handleAddStudent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 700, display: "block", marginBottom: 6 }}>STUDENT FULL NAME</label>
          <input
            required
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="e.g. Vignesh Raja"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${BORDER}`, background: BG, outline: "none" }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: MUTED, fontWeight: 700, display: "block", marginBottom: 6 }}>EMAIL (Optional)</label>
          <input
            type="email"
            value={newStudentEmail}
            onChange={(e) => setNewStudentEmail(e.target.value)}
            placeholder="e.g. vignesh@example.com"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${BORDER}`, background: BG, outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setShowStudentModal(false)}
            style={{ background: "transparent", border: "none", color: MUTED, fontWeight: 700, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ background: BLUE, color: WHITE, border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}
          >
            Save & Whitelist
          </button>
        </div>
      </form>
    </div>
  </div>
)}
            <div>
              <div style={{ color: BLUE, fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>
                ⚡ DETERMINISTIC SUPERVISOR LAYER
              </div>
              <h1 style={{ margin: "6px 0 4px", fontSize: 22, fontWeight: 800, color: TEXT }}>
                Governor & Curriculum Control
              </h1>
              <p style={{ margin: 0, color: MUTED, fontSize: 14, maxWidth: 640 }}>
                Initialize curriculum DAGs, initialize baseline diagnostics, and supervise on-the-fly student pathways.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: BLUE,
                color: WHITE,
                border: "none",
                borderRadius: 12,
                padding: "12px 22px",
                fontFamily: P,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(21,101,192,0.25)",
              }}
            >
              ＋ Initialize Topic Unit
            </button>
          </section>

          {/* Metric KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Active Units", value: units.length, icon: "📚", color: BLUE },
              { label: "Pending Escalations", value: escalations.length, icon: "⚠️", color: ORANGE },
              { label: "Supervisor Model", value: "BKT + DAG", icon: "🧠", color: BLUE },
              { label: "Engine Status", value: "Live 200 OK", icon: "🟢", color: GREEN },
            ].map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: WHITE,
                  borderRadius: 16,
                  padding: "20px 22px",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{kpi.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4, fontWeight: 600 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Controls: Tabs & Search */}
          <div style={{ display: "flex", gap: 10 }}>
  {(["All Units", "Approved Students", "Pending Escalations"] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{
        fontFamily: P,
        fontSize: 13,
        fontWeight: 700,
        padding: "8px 16px",
        borderRadius: 20,
        border: `1px solid ${activeTab === tab ? BLUE : BORDER}`,
        cursor: "pointer",
        background: activeTab === tab ? LIGHT_BLUE : WHITE,
        color: activeTab === tab ? BLUE : MUTED,
        transition: "all 0.15s ease",
      }}
    >
      {tab}
    </button>
  ))}
</div>

          {/* Content Views */}
          {activeTab === "All Units" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
              {filteredUnits.length === 0 ? (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    background: WHITE,
                    padding: 40,
                    borderRadius: 16,
                    textAlign: "center",
                    border: `1px solid ${BORDER}`,
                    color: MUTED,
                  }}
                >
                  No units found. Initialize a new unit above to get started!
                </div>
              ) : (
                filteredUnits.map((u) => (
                  <div
                    key={u._id}
                    style={{
                      background: WHITE,
                      borderRadius: 18,
                      padding: 22,
                      border: `1px solid ${BORDER}`,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: TEXT }}>{u.topic}</h3>
                        <span style={{ fontSize: 12, color: MUTED }}>Unit ID: {u._id}</span>
                      </div>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 800,
                          background: u.status === "ready" ? "#ecfdf5" : "#fffbeb",
                          color: u.status === "ready" ? GREEN : ORANGE,
                        }}
                      >
                        {u.status?.toUpperCase() || "READY"}
                      </span>
                    </div>

                    <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: MUTED }}>Diagnostics: Initialized</span>
                      <button
                        onClick={() => {
                          sessionStorage.setItem("unit_id", u._id);
                          alert(`Active unit set to "${u.topic}". Students will now load this unit.`);
                        }}
                        style={{
                          background: LIGHT_BLUE,
                          border: `1px solid ${BORDER}`,
                          color: BLUE,
                          padding: "8px 14px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Activate For Student →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "Pending Escalations" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {escalations.length === 0 ? (
                <div
                  style={{
                    background: WHITE,
                    borderRadius: 16,
                    padding: 44,
                    textAlign: "center",
                    border: `1px solid ${BORDER}`,
                    color: MUTED,
                  }}
                >
                  🎉 No unresolved escalations. All student paths are progressing smoothly!
                </div>
              ) : (
                escalations.map((esc) => (
                  <div
                    key={esc._id}
                    style={{
                      background: WHITE,
                      borderRadius: 16,
                      padding: 20,
                      border: "1px solid #fed7aa",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 16, color: TEXT, fontWeight: 700 }}>
                        Student: {esc.student_id} · Subtopic: {esc.subtopic_id}
                      </h4>
                      <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
                        Trigger: Repeated struggle or cognitive threshold exceeded
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolve(esc._id)}
                      style={{
                        background: GREEN,
                        color: WHITE,
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Resolve & Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(13, 33, 55, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: WHITE,
              borderRadius: 20,
              padding: 30,
              maxWidth: 500,
              width: "100%",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18, color: TEXT, fontWeight: 800 }}>Initialize Curriculum Unit</h2>
            <form onSubmit={handleCreateUnit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, fontWeight: 700 }}>
                  TOPIC NAME
                </label>
                <input
                  required
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., Object Oriented C++"
                  style={{
                    width: "100%",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 10,
                    color: TEXT,
                    fontFamily: P,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, fontWeight: 700 }}>
                  SUBTOPICS (Comma Separated)
                </label>
                <input
                  required
                  value={subtopicsInput}
                  onChange={(e) => setSubtopicsInput(e.target.value)}
                  placeholder="Classes, Inheritance, Virtual Functions"
                  style={{
                    width: "100%",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 10,
                    color: TEXT,
                    fontFamily: P,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 6, fontWeight: 700 }}>
                  REFERENCE CONTEXT (Optional)
                </label>
                <textarea
                  value={refText}
                  onChange={(e) => setRefText(e.target.value)}
                  placeholder="Optional reference notes or concepts to guide diagnostic generation..."
                  rows={3}
                  style={{
                    width: "100%",
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: 10,
                    color: TEXT,
                    fontFamily: P,
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: MUTED,
                    cursor: "pointer",
                    fontWeight: 700,
                    padding: "10px 16px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: BLUE,
                    color: WHITE,
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(21,101,192,0.25)",
                  }}
                >
                  Create & Generate Diagnostics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
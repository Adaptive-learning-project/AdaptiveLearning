import { useEffect, useState } from "react";
import { teacherApi } from "../api/adaptiveApi";

const P = "Poppins, sans-serif";
const TEACHER_ID = "teacher_1"; // simple fixed ID for demo

type View = "home" | "create" | "review" | "escalations";

// ── tiny shared components ──────────────────────────────────────────────────

function Btn({
  onClick, children, color = "#7c3aed", disabled = false, small = false
}: {
  onClick: () => void; children: React.ReactNode;
  color?: string; disabled?: boolean; small?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "6px 14px" : "12px 24px",
      borderRadius: 10, border: "none", cursor: disabled ? "default" : "pointer",
      background: disabled ? "#374151" : color,
      color: "#fff", fontFamily: P, fontWeight: 700,
      fontSize: small ? 13 : 15, opacity: disabled ? 0.6 : 1,
    }}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#111827", borderRadius: 16, padding: 24,
      border: "1px solid rgba(255,255,255,.08)", ...style
    }}>
      {children}
    </div>
  );
}

// ── CREATE UNIT form ────────────────────────────────────────────────────────

function CreateUnit({ onCreated }: { onCreated: (unitId: string) => void }) {
  const [topic, setTopic] = useState("");
  const [subtopicInput, setSubtopicInput] = useState("");
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [referenceText, setReferenceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addSubtopic() {
    const v = subtopicInput.trim();
    if (v && !subtopics.includes(v)) {
      setSubtopics(s => [...s, v]);
      setSubtopicInput("");
    }
  }

  async function handleCreate() {
    if (!topic.trim() || subtopics.length === 0) return;
    setLoading(true); setError("");
    try {
      const res = await teacherApi.createUnit({
        teacher_id: TEACHER_ID,
        topic: topic.trim(),
        subtopics,
        reference_text: referenceText,
      });
      // immediately trigger generation
      await teacherApi.generateContent(res.unit_id);
      onCreated(res.unit_id);
    } catch (e: any) {
      setError("Failed to create unit. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 style={{ fontFamily: P, color: "#f1f5f9", marginTop: 0 }}>📝 Create New Unit</h2>

      <label style={{ color: "#94a3b8", fontFamily: P, fontSize: 13 }}>Topic Name</label>
      <input
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="e.g. Computer Networks"
        style={inputStyle}
      />

      <label style={{ color: "#94a3b8", fontFamily: P, fontSize: 13, display: "block", marginTop: 16 }}>
        Subtopics (add one at a time)
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          value={subtopicInput}
          onChange={e => setSubtopicInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addSubtopic()}
          placeholder="e.g. Packet switching"
          style={{ ...inputStyle, margin: 0, flex: 1 }}
        />
        <Btn onClick={addSubtopic} small>+ Add</Btn>
      </div>

      {subtopics.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {subtopics.map((s, i) => (
            <span key={i} style={{
              background: "rgba(124,58,237,.2)", color: "#c4b5fd",
              borderRadius: 20, padding: "4px 12px", fontFamily: P, fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {i + 1}. {s}
              <button onClick={() => setSubtopics(st => st.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <label style={{ color: "#94a3b8", fontFamily: P, fontSize: 13, display: "block", marginTop: 16 }}>
        Reference Text (optional — paste notes/textbook excerpt)
      </label>
      <textarea
        value={referenceText}
        onChange={e => setReferenceText(e.target.value)}
        placeholder="Paste any reference material here..."
        rows={4}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {error && <p style={{ color: "#f87171", fontFamily: P, fontSize: 13 }}>{error}</p>}

      <div style={{ marginTop: 20 }}>
        <Btn onClick={handleCreate} disabled={loading || !topic.trim() || subtopics.length === 0}>
          {loading ? "⏳ Generating content via LLM..." : "🚀 Create & Generate Content"}
        </Btn>
      </div>
    </Card>
  );
}

// ── REVIEW CONTENT ──────────────────────────────────────────────────────────

function ReviewContent({ unitId }: { unitId: string }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState("generating");
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const poll = async () => {
      try {
        const s = await teacherApi.getUnitStatus(unitId);
        setStatus(s?.status ?? "generating");
        if (s?.status === "ready") {
          clearInterval(interval);
          const r = await teacherApi.reviewContent(unitId);
          if (r) setData(r);
        }
      } catch { /* ignore */ }
    };
    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [unitId]);

  async function approve(subtopicId: string) {
    setApproving(subtopicId);
    try {
      await teacherApi.approveSubtopic(subtopicId);
      const r = await teacherApi.reviewContent(unitId);
      if (r) setData(r);
    } catch { /* ignore */ } finally {
      setApproving(null);
    }
  }

  if (status === "generating") {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48 }}>⏳</div>
          <p style={{ fontFamily: P, color: "#94a3b8", marginTop: 12 }}>
            LLM is generating content for all subtopics…
          </p>
          <p style={{ fontFamily: P, color: "#475569", fontSize: 13 }}>This usually takes 15-30 seconds</p>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h2 style={{ fontFamily: P, color: "#f1f5f9" }}>✅ Review & Approve Content</h2>
      {(data.subtopics ?? []).map((sub: any) => (
        <Card key={sub.subtopic_id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontFamily: P, fontWeight: 800, color: "#f1f5f9", fontSize: 17 }}>
                {sub.order + 1}. {sub.name}
              </span>
              {sub.content_approved && (
                <span style={{
                  marginLeft: 10, background: "rgba(34,197,94,.15)", color: "#4ade80",
                  borderRadius: 20, padding: "2px 10px", fontSize: 12, fontFamily: P, fontWeight: 700
                }}>✓ APPROVED</span>
              )}
            </div>
            {!sub.content_approved && (
              <Btn
                onClick={() => approve(sub.subtopic_id)}
                disabled={approving === sub.subtopic_id}
                color="#059669" small
              >
                {approving === sub.subtopic_id ? "..." : "Approve & Publish"}
              </Btn>
            )}
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {sub.content.map((piece: any) => (
              <div key={piece.type} style={{
                background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "10px 14px",
                border: "1px solid rgba(255,255,255,.06)",
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#7c3aed",
                  letterSpacing: "0.1em", fontFamily: P, textTransform: "uppercase",
                }}>
                  {piece.type.replace(/_/g, " ")}
                </span>
                <div style={{ marginTop: 6, fontFamily: P, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
                  {piece.type === "question" || piece.type === "easy_question" ? (
                    <div>
                      <p style={{ margin: "0 0 8px", color: "#f1f5f9", fontWeight: 600 }}>{piece.data.text}</p>
                      {piece.data.options?.map((opt: string, i: number) => (
                        <div key={i} style={{
                          padding: "4px 10px", borderRadius: 6, marginBottom: 4,
                          background: i === piece.data.correct ? "rgba(34,197,94,.1)" : "rgba(255,255,255,.04)",
                          color: i === piece.data.correct ? "#4ade80" : "#94a3b8",
                          fontFamily: P, fontSize: 13,
                        }}>
                          {["A", "B", "C", "D"][i]}. {opt} {i === piece.data.correct ? "✓" : ""}
                        </div>
                      ))}
                      <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 12 }}>
                        Explanation: {piece.data.explanation}
                      </p>
                    </div>
                  ) : (
                    <span>{piece.data.emoji} {piece.data.text}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── ESCALATION DASHBOARD ────────────────────────────────────────────────────

function EscalationDashboard() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function load() {
    try {
      const d = await teacherApi.getEscalations();
      setEscalations(d?.escalations ?? []);
    } catch { /* ignore */ }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    setResolving(id);
    try {
      await teacherApi.resolveEscalation(id, note[id] || "");
      await load();
    } catch { /* ignore */ } finally {
      setResolving(null);
    }
  }

  if (escalations.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <p style={{ fontFamily: P, color: "#4ade80", fontWeight: 700, marginTop: 12 }}>
            No escalations — all students are progressing!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: P, color: "#f87171" }}>🚨 Student Escalations</h2>
      {escalations.map((e: any) => (
        <Card key={e._id} style={{ marginBottom: 16, borderColor: "rgba(239,68,68,.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontFamily: P, fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px" }}>
                👤 {e.student_id}
              </p>
              <p style={{ fontFamily: P, color: "#94a3b8", fontSize: 14, margin: "0 0 4px" }}>
                Stuck on: <strong>{e.subtopic_name}</strong>
              </p>
              <p style={{ fontFamily: P, color: "#64748b", fontSize: 13, margin: 0 }}>
                Mastery: {e.mastery_score}/100 · Attempts: {e.attempt_count}
              </p>
            </div>
          </div>
          <textarea
            value={note[e._id] || ""}
            onChange={ev => setNote(n => ({ ...n, [e._id]: ev.target.value }))}
            placeholder="Optional note for student..."
            rows={2}
            style={{ ...inputStyle, marginTop: 12, marginBottom: 8 }}
          />
          <Btn
            onClick={() => resolve(e._id)}
            disabled={resolving === e._id}
            color="#f59e0b" small
          >
            {resolving === e._id ? "Resolving..." : "✓ Unblock Student (skip subtopic)"}
          </Btn>
        </Card>
      ))}
    </div>
  );
}

// ── UNITS LIST ──────────────────────────────────────────────────────────────

function UnitsList({ onReview }: { onReview: (unitId: string) => void }) {
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    teacherApi.listUnits(TEACHER_ID).then(d => setUnits(d?.units ?? [])).catch(() => {});
  }, []);

  if (units.length === 0) {
    return <p style={{ fontFamily: P, color: "#64748b" }}>No units created yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {units.map((u: any) => (
        <Card key={u._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontFamily: P, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>{u.topic}</p>
            <span style={{
              fontSize: 12, fontFamily: P, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
              background: u.status === "ready" ? "rgba(34,197,94,.1)" : "rgba(245,158,11,.1)",
              color: u.status === "ready" ? "#4ade80" : "#fbbf24",
            }}>
              {u.status === "ready" ? "✓ Ready" : "⏳ Generating"}
            </span>
          </div>
          <Btn onClick={() => onReview(u._id)} small color="#0891b2">Review →</Btn>
        </Card>
      ))}
    </div>
  );
}

// ── MAIN TEACHER PAGE ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 6, padding: "10px 14px", borderRadius: 10,
  background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
  color: "#fff", fontFamily: P, fontSize: 15, outline: "none", boxSizing: "border-box",
};

export default function TeacherPage() {
  const [view, setView] = useState<View>("home");
  const [reviewUnitId, setReviewUnitId] = useState<string | null>(null);
  const [escalationCount, setEscalationCount] = useState(0);

  useEffect(() => {
    teacherApi.getEscalations()
      .then(d => setEscalationCount(d?.escalations?.length ?? 0))
      .catch(() => {});
  }, [view]);

  function navBtn(v: View, label: string, active: boolean) {
    return (
      <button onClick={() => setView(v)} style={{
        background: active ? "rgba(124,58,237,.2)" : "none",
        border: active ? "1px solid rgba(124,58,237,.3)" : "1px solid transparent",
        color: active ? "#c4b5fd" : "#64748b",
        borderRadius: 10, padding: "8px 16px", cursor: "pointer",
        fontFamily: P, fontWeight: 700, fontSize: 14,
      }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070b24", color: "#fff", fontFamily: P }}>
      {/* header */}
      <div style={{
        padding: "16px 32px", borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#f1f5f9" }}>🎓 Teacher Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {navBtn("home", "📚 My Units", view === "home")}
          {navBtn("create", "➕ New Unit", view === "create")}
          {navBtn("escalations",
            `🚨 Escalations${escalationCount > 0 ? ` (${escalationCount})` : ""}`,
            view === "escalations"
          )}
        </div>
      </div>

      {/* main */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        {view === "home" && (
          <>
            <h2 style={{ margin: "0 0 20px", color: "#f1f5f9" }}>My Units</h2>
            <UnitsList onReview={(id) => { setReviewUnitId(id); setView("review"); }} />
          </>
        )}

        {view === "create" && (
          <CreateUnit onCreated={(id) => {
            setReviewUnitId(id);
            setView("review");
          }} />
        )}

        {view === "review" && reviewUnitId && (
          <>
            <button onClick={() => setView("home")} style={{
              background: "none", border: "none", color: "#64748b",
              cursor: "pointer", fontFamily: P, marginBottom: 16, fontSize: 14,
            }}>
              ← Back to units
            </button>
            <ReviewContent unitId={reviewUnitId} />
          </>
        )}

        {view === "escalations" && <EscalationDashboard />}
      </div>
    </div>
  );
}

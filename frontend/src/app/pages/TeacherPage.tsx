import { useEffect, useState } from "react";
import { teacherApi } from "../api/adaptiveApi";

const P      = "Poppins, sans-serif";
const BLUE   = "#1565c0";
const BG     = "#f5f9fd";
const WHITE  = "#ffffff";
const BORDER = "#dce8f5";
const TEXT   = "#0d2137";
const MUTED  = "#607d8b";
const LIGHT  = "#eaf3ff";
const TEACHER_ID = "teacher_1";

type View = "home" | "create" | "review" | "escalations";

// ── Shared atoms ──────────────────────────────────────────────────────────────

function Btn({ onClick, children, color = BLUE, disabled = false, small = false, outline = false }: {
  onClick: () => void; children: React.ReactNode;
  color?: string; disabled?: boolean; small?: boolean; outline?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "7px 16px" : "12px 22px",
      borderRadius: 10, border: outline ? `1.5px solid ${color}` : "none",
      cursor: disabled ? "default" : "pointer",
      background: disabled ? "#e2e8f0" : outline ? "transparent" : color,
      color: disabled ? MUTED : outline ? color : "#fff",
      fontFamily: P, fontWeight: 700, fontSize: small ? 13 : 14,
      boxShadow: (disabled || outline) ? "none" : "0 4px 14px rgba(21,101,192,0.18)",
      opacity: disabled ? 0.7 : 1, transition: "all .15s",
    }}>
      {children}
    </button>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: WHITE, borderRadius: 16, padding: 24, border: `1px solid ${BORDER}`, boxShadow: "0 2px 10px rgba(21,101,192,0.05)", ...style }}>
      {children}
    </div>
  );
}

// ── Input style ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", marginTop: 6, padding: "10px 14px", borderRadius: 10,
  background: "#f8fbff", border: `1.5px solid ${BORDER}`,
  color: TEXT, fontFamily: P, fontSize: 14, outline: "none",
  boxSizing: "border-box", transition: "border-color .2s",
};

// ── CREATE UNIT ───────────────────────────────────────────────────────────────

function CreateUnit({ onCreated }: { onCreated: (unitId: string) => void }) {
  const [topic,          setTopic]          = useState("");
  const [subtopicInput,  setSubtopicInput]  = useState("");
  const [subtopics,      setSubtopics]      = useState<string[]>([]);
  const [referenceText,  setReferenceText]  = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  function addSubtopic() {
    const v = subtopicInput.trim();
    if (v && !subtopics.includes(v)) { setSubtopics(s => [...s, v]); setSubtopicInput(""); }
  }

  async function handleCreate() {
    if (!topic.trim() || subtopics.length === 0) return;
    setLoading(true); setError("");
    try {
      const res = await teacherApi.createUnit({ teacher_id: TEACHER_ID, topic: topic.trim(), subtopics, reference_text: referenceText });
      await teacherApi.generateContent(res.unit_id);
      onCreated(res.unit_id);
    } catch { setError("Failed to create unit. Is the backend running?"); }
    finally { setLoading(false); }
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-icons-round" style={{ color: BLUE, fontSize: 20 }}>edit_note</span>
        </div>
        <h2 style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 20, margin: 0 }}>Create New Unit</h2>
      </div>

      <label style={{ fontFamily: P, color: TEXT, fontSize: 13, fontWeight: 600 }}>Topic Name</label>
      <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Computer Networks" style={inputStyle} />

      <label style={{ fontFamily: P, color: TEXT, fontSize: 13, fontWeight: 600, display: "block", marginTop: 18 }}>
        Subtopics <span style={{ color: MUTED, fontWeight: 400 }}>(add one at a time)</span>
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input value={subtopicInput} onChange={e => setSubtopicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubtopic()} placeholder="e.g. Packet switching" style={{ ...inputStyle, margin: 0, flex: 1 }} />
        <Btn onClick={addSubtopic} small>+ Add</Btn>
      </div>

      {subtopics.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {subtopics.map((s, i) => (
            <span key={i} style={{ background: LIGHT, color: BLUE, borderRadius: 20, padding: "5px 12px", fontFamily: P, fontSize: 13, fontWeight: 600, border: `1px solid #c5ddf8`, display: "flex", alignItems: "center", gap: 6 }}>
              {i + 1}. {s}
              <button onClick={() => setSubtopics(st => st.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}

      <label style={{ fontFamily: P, color: TEXT, fontSize: 13, fontWeight: 600, display: "block", marginTop: 18 }}>
        Reference Text <span style={{ color: MUTED, fontWeight: 400 }}>(optional — paste notes or textbook excerpt)</span>
      </label>
      <textarea value={referenceText} onChange={e => setReferenceText(e.target.value)} placeholder="Paste any reference material here..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />

      {error && <p style={{ color: "#dc2626", fontFamily: P, fontSize: 13, marginTop: 8 }}>⚠ {error}</p>}

      <div style={{ marginTop: 22 }}>
        <Btn onClick={handleCreate} disabled={loading || !topic.trim() || subtopics.length === 0}>
          {loading ? "⏳ Generating via LLM…" : "🚀 Create & Generate Content"}
        </Btn>
      </div>
    </Card>
  );
}

// ── REVIEW CONTENT ────────────────────────────────────────────────────────────

function ReviewContent({ unitId }: { unitId: string }) {
  const [data,      setData]      = useState<any>(null);
  const [status,    setStatus]    = useState("generating");
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const poll = async () => {
      try {
        const s = await teacherApi.getUnitStatus(unitId);
        setStatus(s?.status ?? "generating");
        if (s?.status === "ready") { clearInterval(interval); const r = await teacherApi.reviewContent(unitId); if (r) setData(r); }
      } catch { /* ignore */ }
    };
    poll(); interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [unitId]);

  async function approve(subtopicId: string) {
    setApproving(subtopicId);
    try {
      await teacherApi.approveSubtopic(subtopicId);
      const r = await teacherApi.reviewContent(unitId);
      if (r) setData(r);
    } catch { /* ignore */ } finally { setApproving(null); }
  }

  if (status === "generating") return (
    <Card>
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: BLUE, margin: "0 auto 16px", animation: "spin .8s linear infinite" }} />
        <p style={{ fontFamily: P, color: TEXT, fontWeight: 700, fontSize: 16, margin: "0 0 6px" }}>LLM is generating content…</p>
        <p style={{ fontFamily: P, color: MUTED, fontSize: 13, margin: 0 }}>This usually takes 15–30 seconds</p>
      </div>
    </Card>
  );

  if (!data) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-icons-round" style={{ color: "#16a34a", fontSize: 20 }}>fact_check</span>
        </div>
        <h2 style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 20, margin: 0 }}>Review & Approve Content</h2>
      </div>

      {(data.subtopics ?? []).map((sub: any) => (
        <Card key={sub.subtopic_id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: P, fontWeight: 800, fontSize: 13, color: BLUE }}>{sub.order + 1}</div>
              <span style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 16 }}>{sub.name}</span>
              {sub.content_approved && (
                <span style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontFamily: P, fontWeight: 700, border: "1px solid #bbf7d0" }}>✓ APPROVED</span>
              )}
            </div>
            {!sub.content_approved && (
              <Btn onClick={() => approve(sub.subtopic_id)} disabled={approving === sub.subtopic_id} small color="#16a34a">
                {approving === sub.subtopic_id ? "Saving…" : "Approve & Publish"}
              </Btn>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {sub.content.map((piece: any) => (
              <div key={piece.type} style={{ background: BG, borderRadius: 10, padding: "10px 14px", border: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: BLUE, letterSpacing: "0.10em", fontFamily: P, textTransform: "uppercase" }}>
                  {piece.type.replace(/_/g, " ")}
                </span>
                <div style={{ marginTop: 6, fontFamily: P, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                  {piece.type === "question" || piece.type === "easy_question" || piece.type === "hard_question" ? (
                    <div>
                      <p style={{ margin: "0 0 8px", color: TEXT, fontWeight: 600 }}>{piece.data.text}</p>
                      {piece.data.options?.map((opt: string, i: number) => (
                        <div key={i} style={{ padding: "4px 10px", borderRadius: 6, marginBottom: 4, background: i === piece.data.correct ? "#f0fdf4" : WHITE, color: i === piece.data.correct ? "#16a34a" : "#475569", fontFamily: P, fontSize: 13, border: `1px solid ${i === piece.data.correct ? "#bbf7d0" : BORDER}` }}>
                          {["A", "B", "C", "D"][i]}. {opt} {i === piece.data.correct ? "✓" : ""}
                        </div>
                      ))}
                      <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 12 }}>Explanation: {piece.data.explanation}</p>
                    </div>
                  ) : piece.type === "overview" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {piece.data.what_we_know     && <p style={{ margin: 0 }}><strong>Know:</strong> {piece.data.what_we_know}</p>}
                      {piece.data.what_we_study    && <p style={{ margin: 0 }}><strong>Study:</strong> {piece.data.what_we_study}</p>}
                      {piece.data.expected_outcome && <p style={{ margin: 0 }}><strong>Outcome:</strong> {piece.data.expected_outcome}</p>}
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

// ── ESCALATION DASHBOARD ──────────────────────────────────────────────────────

function EscalationDashboard() {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [resolving,   setResolving]   = useState<string | null>(null);
  const [note,        setNote]        = useState<Record<string, string>>({});

  async function load() {
    try { const d = await teacherApi.getEscalations(); setEscalations(d?.escalations ?? []); } catch { /* ignore */ }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    setResolving(id);
    try { await teacherApi.resolveEscalation(id, note[id] || ""); await load(); }
    catch { /* ignore */ } finally { setResolving(null); }
  }

  if (escalations.length === 0) return (
    <Card>
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0fdf4", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✅</div>
        <p style={{ fontFamily: P, color: "#16a34a", fontWeight: 700, fontSize: 16, margin: 0 }}>No escalations — all students are progressing!</p>
      </div>
    </Card>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-icons-round" style={{ color: "#dc2626", fontSize: 20 }}>warning</span>
        </div>
        <h2 style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 20, margin: 0 }}>Student Escalations</h2>
        <span style={{ background: "#fff5f5", color: "#dc2626", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700, border: "1px solid #fecaca" }}>{escalations.length}</span>
      </div>

      {escalations.map((e: any) => (
        <Card key={e._id} style={{ marginBottom: 14, borderColor: "#fecaca" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fff5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                <span style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 15 }}>{e.student_id}</span>
              </div>
              <p style={{ fontFamily: P, color: "#475569", fontSize: 13, margin: "0 0 3px" }}>
                Stuck on: <strong style={{ color: TEXT }}>{e.subtopic_name}</strong>
              </p>
              <p style={{ fontFamily: P, color: MUTED, fontSize: 12, margin: 0 }}>
                Mastery: {e.mastery_score}/100 · Attempts: {e.attempt_count}
              </p>
            </div>
          </div>
          <textarea value={note[e._id] || ""} onChange={ev => setNote(n => ({ ...n, [e._id]: ev.target.value }))} placeholder="Optional note for student…" rows={2} style={{ ...inputStyle, marginTop: 14, marginBottom: 10 }} />
          <Btn onClick={() => resolve(e._id)} disabled={resolving === e._id} small color="#d97706">
            {resolving === e._id ? "Resolving…" : "✓ Unblock Student (skip subtopic)"}
          </Btn>
        </Card>
      ))}
    </div>
  );
}

// ── UNITS LIST ────────────────────────────────────────────────────────────────

function UnitsList({ onReview }: { onReview: (unitId: string) => void }) {
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    teacherApi.listUnits(TEACHER_ID).then(d => setUnits(d?.units ?? [])).catch(() => {});
  }, []);

  if (units.length === 0) return (
    <Card>
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
        <p style={{ fontFamily: P, color: MUTED, fontSize: 14 }}>No units created yet. Click <strong>+ New Unit</strong> to get started.</p>
      </div>
    </Card>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {units.map((u: any) => (
        <Card key={u._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: LIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📘</div>
            <div>
              <p style={{ fontFamily: P, fontWeight: 700, color: TEXT, margin: "0 0 4px", fontSize: 15 }}>{u.topic}</p>
              <span style={{ fontSize: 11, fontFamily: P, fontWeight: 700, borderRadius: 20, padding: "2px 10px", border: `1px solid ${u.status === "ready" ? "#bbf7d0" : "#fde68a"}`, background: u.status === "ready" ? "#f0fdf4" : "#fffbeb", color: u.status === "ready" ? "#16a34a" : "#d97706" }}>
                {u.status === "ready" ? "✓ Ready" : "⏳ Generating"}
              </span>
            </div>
          </div>
          <Btn onClick={() => onReview(u._id)} small outline color={BLUE}>Review →</Btn>
        </Card>
      ))}
    </div>
  );
}

// ── MAIN TEACHER PAGE ─────────────────────────────────────────────────────────

export default function TeacherPage() {
  const [view,           setView]           = useState<View>("home");
  const [reviewUnitId,   setReviewUnitId]   = useState<string | null>(null);
  const [escalationCount,setEscalationCount]= useState(0);

  useEffect(() => {
    teacherApi.getEscalations().then(d => setEscalationCount(d?.escalations?.length ?? 0)).catch(() => {});
  }, [view]);

  const navItems: { v: View; icon: string; label: string; badge?: number }[] = [
    { v: "home",       icon: "library_books", label: "My Units" },
    { v: "create",     icon: "add_circle",    label: "New Unit" },
    { v: "escalations",icon: "warning",       label: "Escalations", badge: escalationCount || undefined },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: P }}>

      {/* Header */}
      <header style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "0 clamp(16px,4vw,32px)", boxShadow: "0 1px 6px rgba(21,101,192,0.06)", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 62 }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(21,101,192,0.22)" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>G</span>
            </div>
            <div>
              <div style={{ color: TEXT, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>GIID Tambaram</div>
              <div style={{ color: MUTED, fontSize: 9, fontWeight: 600, letterSpacing: 1, marginTop: 3 }}>TEACHER DASHBOARD</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 4 }}>
            {navItems.map(item => {
              const active = view === item.v;
              return (
                <button key={item.v} onClick={() => setView(item.v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: active ? LIGHT : "transparent", color: active ? BLUE : MUTED, fontFamily: P, fontWeight: active ? 700 : 600, fontSize: 13, position: "relative", transition: "all .15s" }}>
                  <span className="material-icons-round" style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <span style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 48px" }}>

        {view === "home" && (
          <>
            <div style={{ marginBottom: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: BLUE, letterSpacing: "0.08em", margin: "0 0 4px" }}>MY CURRICULUM</p>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT, margin: "0 0 2px" }}>My Units</h1>
              <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Manage and publish learning units for your students.</p>
            </div>
            <UnitsList onReview={id => { setReviewUnitId(id); setView("review"); }} />
          </>
        )}

        {view === "create" && (
          <CreateUnit onCreated={id => { setReviewUnitId(id); setView("review"); }} />
        )}

        {view === "review" && reviewUnitId && (
          <>
            <button onClick={() => setView("home")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MUTED, cursor: "pointer", fontFamily: P, marginBottom: 18, fontSize: 14, fontWeight: 600, padding: 0 }}>
              <span className="material-icons-round" style={{ fontSize: 16 }}>arrow_back</span> Back to units
            </button>
            <ReviewContent unitId={reviewUnitId} />
          </>
        )}

        {view === "escalations" && <EscalationDashboard />}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

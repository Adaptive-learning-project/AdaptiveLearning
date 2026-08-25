import { useEffect, useRef, useState } from "react";
import { studentApi } from "../api/adaptiveApi";

const P = "Poppins, sans-serif";

// ── TTS ────────────────────────────────────────────────────────────────────────

function speak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate  = 0.82;
  u.pitch = 1.05;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function stopSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ── small shared UI ────────────────────────────────────────────────────────────

function SpeakBtn({ text, label = "🔊 Listen again" }: { text: string; label?: string }) {
  return (
    <button onClick={() => speak(text)} style={{
      background: "rgba(34,211,238,.1)", border: "1px solid rgba(34,211,238,.2)",
      borderRadius: 8, padding: "6px 14px", cursor: "pointer",
      color: "#67e8f9", fontFamily: P, fontSize: 13, fontWeight: 700,
    }}>
      {label}
    </button>
  );
}

function BigBtn({ onClick, children, disabled = false, color = "linear-gradient(135deg,#7c3aed,#4f46e5)" }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; color?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "18px 0", borderRadius: 16, border: "none",
      background: disabled ? "#1e293b" : color,
      color: "#fff", fontFamily: P, fontWeight: 800, fontSize: 18,
      cursor: disabled ? "default" : "pointer", marginTop: 16,
      opacity: disabled ? 0.6 : 1,
    }}>
      {children}
    </button>
  );
}

// Progress bar + subtopic indicator
function ProgressHeader({
  subtopicName, done, total, mastery, consecutive_wrong,
}: {
  subtopicName: string; done: number; total: number; mastery: number; consecutive_wrong: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const masteryColor = mastery >= 80 ? "#22c55e" : mastery >= 50 ? "#f59e0b" : "#7c3aed";

  return (
    <div style={{ marginBottom: 24 }}>
      {/* subtopic progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: P, fontSize: 13, color: "#64748b", fontWeight: 700 }}>
          SUBTOPIC {done + 1} of {total}
        </span>
        <span style={{ fontFamily: P, fontSize: 13, color: "#64748b" }}>{pct}% done</span>
      </div>
      <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 12 }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "linear-gradient(90deg,#7c3aed,#22d3ee)",
          borderRadius: 99, transition: "width 0.6s ease",
        }} />
      </div>

      {/* current subtopic + mastery */}
      <div style={{
        background: "#111827", borderRadius: 14, padding: "12px 16px",
        border: "1px solid rgba(255,255,255,.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p style={{ fontFamily: P, fontWeight: 800, color: "#f1f5f9", fontSize: 16, margin: 0 }}>
            {subtopicName}
          </p>
          {consecutive_wrong > 0 && (
            <p style={{ fontFamily: P, fontSize: 12, color: "#f87171", margin: "2px 0 0" }}>
              {"⚡".repeat(consecutive_wrong)} attempt {consecutive_wrong + 1}
            </p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: P, fontWeight: 800, color: masteryColor, fontSize: 18, margin: 0 }}>
            {mastery}
          </p>
          <p style={{ fontFamily: P, fontSize: 11, color: "#475569", margin: 0 }}>MASTERY</p>
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState("");
  useEffect(() => { speak("Welcome! What is your name?"); }, []);
  return (
    <div style={{
      minHeight: "100vh", background: "#070b24",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        background: "#111827", borderRadius: 24, padding: 48,
        maxWidth: 400, width: "100%", textAlign: "center",
        border: "1px solid rgba(124,58,237,.25)",
      }}>
        <div style={{ fontSize: 72 }}>🌟</div>
        <h1 style={{ fontFamily: P, fontWeight: 900, color: "#f1f5f9", fontSize: 28, margin: "16px 0 8px" }}>
          Welcome!
        </h1>
        <p style={{ fontFamily: P, color: "#64748b", fontSize: 16, margin: "0 0 32px" }}>
          What is your name?
        </p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && onLogin(name.trim())}
          placeholder="Type your name here"
          autoFocus
          style={{
            width: "100%", padding: "16px", borderRadius: 12, boxSizing: "border-box",
            background: "rgba(255,255,255,.06)", border: "2px solid rgba(124,58,237,.4)",
            color: "#fff", fontFamily: P, fontSize: 20, outline: "none", textAlign: "center",
          }}
        />
        <BigBtn onClick={() => name.trim() && onLogin(name.trim())} disabled={!name.trim()}>
          Let's Learn! 🚀
        </BigBtn>
      </div>
    </div>
  );
}

// ── TOPIC SELECT ───────────────────────────────────────────────────────────────

function TopicSelect({ studentId, onSelect }: {
  studentId: string;
  onSelect: (unitId: string, topic: string) => void;
}) {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getTopics()
      .then(d => {
        // Only show topics that have at least one approved subtopic
        const ready = (d.topics as any[]).filter((t: any) => t.approved_subtopics > 0);
        setTopics(ready);
        if (ready.length > 0) speak(`Hi ${studentId}! Choose what you want to learn today.`);
        else speak("No topics are ready yet. Ask your teacher!");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#070b24", padding: "40px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontFamily: P, fontWeight: 900, color: "#f1f5f9", fontSize: 28, textAlign: "center" }}>
          Hi {studentId}! 👋
        </h1>
        <p style={{ fontFamily: P, color: "#64748b", textAlign: "center", marginBottom: 32, fontSize: 16 }}>
          What do you want to learn today?
        </p>

        {loading ? (
          <p style={{ fontFamily: P, color: "#64748b", textAlign: "center" }}>Loading…</p>
        ) : topics.length === 0 ? (
          <div style={{
            background: "#111827", borderRadius: 20, padding: 40, textAlign: "center",
            border: "1px solid rgba(255,255,255,.06)",
          }}>
            <div style={{ fontSize: 48 }}>⏳</div>
            <p style={{ fontFamily: P, color: "#94a3b8", marginTop: 12 }}>
              Your teacher hasn't published any lessons yet.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {topics.map((t: any) => (
              <button key={t.unit_id}
                onClick={() => { speak(t.topic); onSelect(t.unit_id, t.topic); }}
                style={{
                  background: "#111827", border: "2px solid rgba(124,58,237,.2)",
                  borderRadius: 20, padding: "28px", cursor: "pointer", textAlign: "left",
                  width: "100%", transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,.7)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(124,58,237,.2)")}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>📘</div>
                <div style={{ fontFamily: P, fontWeight: 800, color: "#f1f5f9", fontSize: 22 }}>
                  {t.topic}
                </div>
                <div style={{ fontFamily: P, color: "#64748b", fontSize: 14, marginTop: 4 }}>
                  {t.approved_subtopics} lessons ready
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LEARNING LOOP ──────────────────────────────────────────────────────────────

type Phase = "loading" | "content" | "question" | "feedback" | "escalated" | "completed";

function LearningLoop({ studentId, unitId, topic, onDone }: {
  studentId: string; unitId: string; topic: string; onDone: () => void;
}) {
  const [phase, setPhase]       = useState<Phase>("loading");
  const [activity, setActivity] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult]     = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const ttsGuard = useRef(false);

  // ── load next activity ─────────────────────────────────────────────────────

  async function loadNext() {
    stopSpeech();
    setPhase("loading");
    setSelected(null);
    setResult(null);
    ttsGuard.current = false;

    try {
      const data = await studentApi.getNextActivity(studentId, unitId);
      setActivity(data);
      if (data.completed) {
        setPhase("completed");
        speak(data.message || "You completed all topics! Great job!");
        return;
      }
      setPhase("content");
    } catch (e: any) {
      alert("Could not load activity. Is the backend running?\n" + (e?.message || ""));
    }
  }

  useEffect(() => { loadNext(); }, []);

  // ── auto TTS on phase changes ──────────────────────────────────────────────

  useEffect(() => {
    if (!activity || ttsGuard.current) return;
    if (phase === "content") {
      ttsGuard.current = true;
      const msg   = activity.message && activity.message !== "Correct! Moving on 🎉" ? activity.message + ". " : "";
      const emoji = activity.content?.emoji ? "" : "";
      const text  = `${msg}${activity.content?.text || ""}`;
      speak(text);
    }
    if (phase === "question") {
      ttsGuard.current = true;
      const hintText = activity.show_hint && activity.hint ? " Here is your hint: " + activity.hint : "";
      speak(activity.question?.text + hintText);
    }
  }, [phase, activity]);

  // ── submit answer ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (selected === null || !activity) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitAnswer({
        student_id:      studentId,
        subtopic_id:     activity.subtopic_id,
        selected_option: selected,
        hint_used:       activity.show_hint,
      });
      setResult(res);
      setActivity((prev: any) => ({ ...prev, mastery_score: res.mastery_score, consecutive_wrong: res.consecutive_wrong }));
      if (res.escalated) {
        speak("Great effort! Your teacher will help you with this one.");
        setPhase("escalated");
      } else {
        const fb = res.correct
          ? "Correct! " + (res.explanation || "Well done!")
          : "Not quite. " + (res.explanation || "Let's try again.");
        speak(fb);
        setPhase("feedback");
      }
    } catch (e: any) {
      alert("Could not submit. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  // ── after feedback ─────────────────────────────────────────────────────────

  function handleNext() {
    if (result?.status === "mastered") {
      speak("Amazing! You got it. Moving to the next topic!");
    }
    loadNext();
  }

  // ── screens ────────────────────────────────────────────────────────────────

  if (phase === "loading") return (
    <Screen>
      <div style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 56 }}>⏳</div>
        <p style={{ fontFamily: P, color: "#64748b", fontSize: 18, marginTop: 12 }}>Loading…</p>
      </div>
    </Screen>
  );

  if (phase === "completed") return (
    <Screen>
      <div style={{ paddingTop: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 72 }}>🎉</div>
          <h2 style={{ fontFamily: P, fontWeight: 900, color: "#4ade80", fontSize: 32, margin: "16px 0 4px" }}>
            Topic Complete!
          </h2>
          <p style={{ fontFamily: P, color: "#94a3b8", fontSize: 16, margin: 0 }}>
            {activity?.message}
          </p>
          {activity?.avg_mastery !== undefined && (
            <div style={{
              display: "inline-block", marginTop: 16, padding: "8px 24px",
              background: activity.avg_mastery >= 70
                ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)",
              border: `1px solid ${activity.avg_mastery >= 70 ? "rgba(34,197,94,.3)" : "rgba(245,158,11,.3)"}`,
              borderRadius: 99,
            }}>
              <span style={{
                fontFamily: P, fontWeight: 900, fontSize: 22,
                color: activity.avg_mastery >= 70 ? "#4ade80" : "#fbbf24",
              }}>
                {activity.avg_mastery}
              </span>
              <span style={{ fontFamily: P, color: "#64748b", fontSize: 14, marginLeft: 6 }}>
                avg mastery
              </span>
            </div>
          )}
        </div>

        {/* Per-subtopic mastery table */}
        {activity?.subtopics && activity.subtopics.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p style={{
              fontFamily: P, fontSize: 12, fontWeight: 700, color: "#475569",
              letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase",
            }}>
              Completion Report
            </p>

            {/* header row */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 80px 100px",
              padding: "6px 16px", marginBottom: 4,
            }}>
              <span style={{ fontFamily: P, fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.08em" }}>SUBTOPIC</span>
              <span style={{ fontFamily: P, fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.08em", textAlign: "center" }}>SCORE</span>
              <span style={{ fontFamily: P, fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.08em", textAlign: "right" }}>STATUS</span>
            </div>

            {activity.subtopics.map((s: any, i: number) => {
              const scoreColor = s.mastery_score >= 80 ? "#4ade80" : s.mastery_score >= 50 ? "#f59e0b" : "#f87171";
              const statusIcon = s.status === "mastered" ? "✅ Mastered"
                : s.status === "skipped"  ? "⚡ Skipped"
                : s.status === "escalated" ? "🙋 Escalated"
                : "⏳ In progress";
              const statusColor = s.status === "mastered" ? "#4ade80"
                : s.status === "skipped"  ? "#f59e0b"
                : s.status === "escalated" ? "#f87171"
                : "#94a3b8";

              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 80px 100px",
                  alignItems: "center", padding: "12px 16px",
                  background: i % 2 === 0 ? "rgba(255,255,255,.03)" : "transparent",
                  borderRadius: 10, marginBottom: 4,
                  border: "1px solid rgba(255,255,255,.04)",
                }}>
                  <span style={{
                    fontFamily: P, fontWeight: 600, color: "#e2e8f0", fontSize: 14,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    paddingRight: 8,
                  }}>
                    {i + 1}. {s.subtopic}
                  </span>

                  {/* score + mini bar */}
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: P, fontWeight: 900, fontSize: 16, color: scoreColor }}>
                      {s.mastery_score}
                    </span>
                    <span style={{ fontFamily: P, fontSize: 11, color: "#475569" }}>/100</span>
                    <div style={{
                      marginTop: 4, height: 4, borderRadius: 99,
                      background: "rgba(255,255,255,.08)", overflow: "hidden",
                    }}>
                      <div style={{
                        width: `${s.mastery_score}%`, height: "100%",
                        background: scoreColor, borderRadius: 99,
                      }} />
                    </div>
                  </div>

                  <span style={{
                    fontFamily: P, fontSize: 12, fontWeight: 700,
                    color: statusColor, textAlign: "right",
                  }}>
                    {statusIcon}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <BigBtn onClick={onDone}>← Back to Topics</BigBtn>
      </div>
    </Screen>
  );

  if (phase === "escalated") return (
    <Screen>
      <div style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 72 }}>🙌</div>
        <h2 style={{ fontFamily: P, fontWeight: 900, color: "#fbbf24", fontSize: 26, margin: "16px 0 8px" }}>
          Great effort!
        </h2>
        <p style={{ fontFamily: P, color: "#94a3b8", fontSize: 16, lineHeight: 1.7 }}>
          Your teacher has been notified.<br />
          They will help you understand <strong style={{ color: "#f1f5f9" }}>{activity?.subtopic_name}</strong>.
        </p>
        <div style={{
          marginTop: 24, padding: 20, background: "rgba(245,158,11,.08)",
          borderRadius: 16, border: "1px solid rgba(245,158,11,.2)",
        }}>
          <p style={{ fontFamily: P, color: "#fbbf24", margin: 0, fontSize: 14 }}>
            📣 Moving on to the next topic for now.
          </p>
        </div>
        <BigBtn onClick={loadNext}>Continue →</BigBtn>
      </div>
    </Screen>
  );

  const content  = activity?.content;
  const question = activity?.question;
  const mastery  = activity?.mastery_score ?? 0;
  const cWrong   = activity?.consecutive_wrong ?? 0;
  const prog     = activity?.progress ?? { done: 0, total: 1 };

  return (
    <Screen>
      <ProgressHeader
        subtopicName={activity?.subtopic_name || ""}
        done={prog.done}
        total={prog.total}
        mastery={mastery}
        consecutive_wrong={cWrong}
      />

      {/* message banner (re-teach / hint etc.) */}
      {activity?.message && activity.message !== "Correct! Moving on 🎉" && (
        <div style={{
          padding: "10px 16px", borderRadius: 10, marginBottom: 20,
          background: cWrong === 0 ? "rgba(124,58,237,.1)" : "rgba(245,158,11,.1)",
          border: `1px solid ${cWrong === 0 ? "rgba(124,58,237,.2)" : "rgba(245,158,11,.2)"}`,
          fontFamily: P, fontSize: 14,
          color: cWrong === 0 ? "#c4b5fd" : "#fcd34d",
        }}>
          {activity.message}
        </div>
      )}

      {/* ── CONTENT phase ── */}
      {phase === "content" && content && (
        <div>
          <div style={{
            background: "#111827", borderRadius: 20, padding: "32px 24px",
            border: "1px solid rgba(255,255,255,.06)", textAlign: "center",
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{content.emoji || "📖"}</div>
            <p style={{
              fontFamily: P, fontSize: 20, fontWeight: 600, color: "#f1f5f9",
              lineHeight: 1.8, margin: "0 0 20px",
            }}>
              {content.text}
            </p>
            <SpeakBtn text={content.text} />
          </div>
          <BigBtn onClick={() => { ttsGuard.current = false; setPhase("question"); }}>
            I'm ready — answer the question →
          </BigBtn>
        </div>
      )}

      {/* ── QUESTION phase ── */}
      {phase === "question" && question && (
        <div>
          <div style={{
            background: "#111827", borderRadius: 20, padding: "24px",
            border: "1px solid rgba(255,255,255,.06)", marginBottom: 16,
          }}>
            <p style={{
              fontFamily: P, fontSize: 19, fontWeight: 700, color: "#f1f5f9",
              lineHeight: 1.6, margin: "0 0 12px",
            }}>
              {question.text}
            </p>
            <SpeakBtn text={question.text} />

            {/* auto-show hint if consecutive_wrong >= 1 */}
            {activity?.show_hint && activity?.hint && (
              <div style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 12,
                background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)",
                fontFamily: P, fontSize: 14, color: "#fcd34d",
                display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <span>💡</span>
                <span>{activity.hint}</span>
              </div>
            )}
          </div>

          {/* MCQ options */}
          <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
            {question.options?.map((opt: string, i: number) => {
              const chosen = selected === i;
              return (
                <button key={i}
                  onClick={() => { setSelected(i); speak(opt); }}
                  style={{
                    padding: "16px 20px", borderRadius: 14,
                    border: `2px solid ${chosen ? "#7c3aed" : "rgba(255,255,255,.08)"}`,
                    background: chosen ? "rgba(124,58,237,.15)" : "rgba(255,255,255,.03)",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    display: "flex", alignItems: "center", gap: 14,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: chosen ? "#7c3aed" : "rgba(255,255,255,.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: P, fontWeight: 800, fontSize: 14,
                    color: chosen ? "#fff" : "#64748b",
                  }}>
                    {["A", "B", "C", "D"][i]}
                  </span>
                  <span style={{
                    fontFamily: P, fontSize: 17,
                    color: chosen ? "#f1f5f9" : "#94a3b8",
                    fontWeight: chosen ? 700 : 400,
                  }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          <BigBtn onClick={handleSubmit} disabled={selected === null || submitting}>
            {submitting ? "Checking…" : "Submit Answer ✓"}
          </BigBtn>
        </div>
      )}

      {/* ── FEEDBACK phase ── */}
      {phase === "feedback" && result && (
        <div>
          <div style={{
            borderRadius: 20, padding: 28, textAlign: "center", marginBottom: 20,
            background: result.correct ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
            border: `2px solid ${result.correct ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
          }}>
            <div style={{ fontSize: 64 }}>{result.correct ? "✅" : "❌"}</div>
            <h3 style={{
              fontFamily: P, fontWeight: 900, fontSize: 26, margin: "12px 0 8px",
              color: result.correct ? "#4ade80" : "#f87171",
            }}>
              {result.correct ? "Correct! 🎉" : "Not quite!"}
            </h3>
            {result.explanation && (
              <p style={{ fontFamily: P, color: "#94a3b8", fontSize: 15, lineHeight: 1.7, margin: "0 0 14px" }}>
                {result.explanation}
              </p>
            )}
            <SpeakBtn text={(result.correct ? "Correct! " : "Not quite. ") + (result.explanation || "")} />
          </div>

          {/* show correct answer if wrong */}
          {!result.correct && (
            <div style={{
              background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.2)",
              borderRadius: 12, padding: "12px 18px", marginBottom: 16,
              fontFamily: P, fontSize: 15, color: "#4ade80",
            }}>
              ✓ Correct answer: <strong>{activity?.question?.options?.[result.correct_option]}</strong>
            </div>
          )}

          {/* mastery update */}
          <div style={{
            background: "#111827", borderRadius: 14, padding: "14px 18px", marginBottom: 20,
            border: "1px solid rgba(255,255,255,.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: P, fontSize: 13, color: "#64748b" }}>
              <span>Mastery</span>
              <span style={{ color: result.mastery_delta >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                {result.mastery_delta >= 0 ? "+" : ""}{result.mastery_delta} → {result.mastery_score}/100
              </span>
            </div>
            <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{
                width: `${result.mastery_score}%`, height: "100%",
                background: result.mastery_score >= 80 ? "#22c55e" : result.mastery_score >= 50 ? "#f59e0b" : "#7c3aed",
                borderRadius: 99, transition: "width 0.6s ease",
              }} />
            </div>
          </div>

          {result.status === "mastered" && (
            <div style={{
              padding: "12px 16px", borderRadius: 12, marginBottom: 12,
              background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)",
              fontFamily: P, color: "#4ade80", fontWeight: 700, textAlign: "center",
            }}>
              🏆 Concept mastered! Moving to next topic.
            </div>
          )}

          <BigBtn
            onClick={handleNext}
            color={result.correct ? "linear-gradient(135deg,#059669,#0891b2)" : "linear-gradient(135deg,#7c3aed,#4f46e5)"}
          >
            {result.status === "mastered" ? "Next Topic 🚀" : "Try Again →"}
          </BigBtn>
        </div>
      )}
    </Screen>
  );
}

// ── layout ─────────────────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#070b24", color: "#fff" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>
        {children}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────────

type SView = "login" | "topics" | "learning";

export default function StudentPage() {
  const [view,      setView]      = useState<SView>(() =>
    sessionStorage.getItem("student_id") ? "topics" : "login"
  );
  const [studentId, setStudentId] = useState(() => sessionStorage.getItem("student_id") || "");
  const [unitId,    setUnitId]    = useState("");
  const [topic,     setTopic]     = useState("");

  function onLogin(name: string) {
    sessionStorage.setItem("student_id", name);
    setStudentId(name);
    setView("topics");
  }

  if (view === "login")    return <LoginScreen onLogin={onLogin} />;
  if (view === "topics")   return <TopicSelect studentId={studentId} onSelect={(uid, t) => { setUnitId(uid); setTopic(t); setView("learning"); }} />;
  if (view === "learning") return <LearningLoop studentId={studentId} unitId={unitId} topic={topic} onDone={() => setView("topics")} />;
  return null;
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { getLearningModule, submitAnswer } from "../api/learningModuleApi";

const P = "Poppins, sans-serif";

// ── tiny helpers ───────────────────────────────────────────────────────────────

function MasteryBar({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#7c3aed";
  return (
    <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <motion.div
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.6 }}
        style={{ height: "100%", background: color, borderRadius: 99 }}
      />
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 99,
      fontSize: 12, fontWeight: 700, fontFamily: P,
      background: `${color}22`, color,
    }}>
      {label}
    </span>
  );
}

type Phase = "loading" | "lesson" | "question" | "feedback" | "complete";

interface Content {
  text: string;
  title: string;
  key_points: string[];
}
interface Question {
  text: string;
  correct_answer: string;
  explanation: string;
}
interface Hint { text: string }

// ── main page ──────────────────────────────────────────────────────────────────

export default function LearningModuleDetailsPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  // ask student name once (stored in sessionStorage)
  const [studentId, setStudentId] = useState<string>(() =>
    sessionStorage.getItem("student_id") ?? ""
  );
  const [nameInput, setNameInput] = useState("");

  const [phase, setPhase] = useState<Phase>("loading");
  const [difficulty, setDifficulty] = useState("easy");
  const [masteryScore, setMasteryScore] = useState(0);
  const [round, setRound] = useState(1);

  const [content, setContent] = useState<Content | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [showHint, setShowHint] = useState(false);

  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    mastery_score: number;
    next_difficulty: string;
    recommendation: string;
    correct_answer: string;
    answer_explanation: string;
  } | null>(null);

  const [error, setError] = useState("");

  // ── load content ─────────────────────────────────────────────────────────────

  function loadContent(diff: string) {
    if (!moduleId || !studentId) return;
    setPhase("loading");
    setError("");
    setAnswer("");
    setShowHint(false);
    setFeedback(null);

    getLearningModule(moduleId, diff, studentId)
      .then(({ data }) => {
        setContent(data.content);
        setQuestion(data.question);
        setHint(data.hint);
        setMasteryScore(data.mastery_score ?? 0);
        setDifficulty(data.difficulty ?? diff);
        setPhase("lesson");
      })
      .catch(() => {
        setError("Could not load content. Is the backend running?");
        setPhase("lesson");
      });
  }

  useEffect(() => {
    if (studentId) loadContent(difficulty);
  }, [moduleId, studentId]);

  // ── submit answer ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!answer.trim() || !moduleId) return;
    setSubmitting(true);
    try {
      const { data } = await submitAnswer(moduleId, {
        student_id: studentId,
        answer: answer.trim(),
      });
      setFeedback(data);
      setMasteryScore(data.mastery_score);
      setPhase("feedback");
    } catch {
      setError("Could not submit answer. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  // ── next round ────────────────────────────────────────────────────────────────

  function handleNext() {
    if (!feedback) return;
    const nextDiff = feedback.next_difficulty === "hard" ? "medium" : feedback.next_difficulty;
    setRound((r) => r + 1);
    setDifficulty(nextDiff);
    loadContent(nextDiff);
  }

  // ── student name gate ─────────────────────────────────────────────────────────

  if (!studentId) {
    return (
      <div style={{
        minHeight: "100vh", background: "#070b24", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "#111827", borderRadius: 24, padding: 40,
            maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.4)",
            border: "1px solid rgba(124,58,237,.2)",
          }}
        >
          <div style={{ fontSize: 48, textAlign: "center" }}>🧑‍💻</div>
          <h2 style={{ fontFamily: P, fontSize: 26, fontWeight: 900, color: "#fff", textAlign: "center", marginTop: 16 }}>
            Who's learning today?
          </h2>
          <p style={{ fontFamily: P, fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 8 }}>
            Enter your name so we can track your progress
          </p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                sessionStorage.setItem("student_id", nameInput.trim());
                setStudentId(nameInput.trim());
              }
            }}
            placeholder="Your name..."
            style={{
              width: "100%", marginTop: 24, padding: "12px 16px", borderRadius: 12,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
              color: "#fff", fontFamily: P, fontSize: 16, outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            disabled={!nameInput.trim()}
            onClick={() => {
              sessionStorage.setItem("student_id", nameInput.trim());
              setStudentId(nameInput.trim());
            }}
            style={{
              width: "100%", marginTop: 16, padding: "14px 0", borderRadius: 12,
              background: nameInput.trim() ? "#7c3aed" : "#374151",
              border: "none", color: "#fff", fontFamily: P, fontWeight: 700,
              fontSize: 16, cursor: nameInput.trim() ? "pointer" : "default",
            }}
          >
            Start Learning 🚀
          </button>
        </motion.div>
      </div>
    );
  }

  const diffColor = difficulty === "medium" ? "#f59e0b" : "#7c3aed";
  const diffLabel = difficulty === "medium" ? "Medium" : "Easy";

  return (
    <div style={{ minHeight: "100vh", background: "#070b24", color: "#fff", fontFamily: P }}>

      {/* ── top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,.06)",
        background: "#0d1117",
      }}>
        <button
          onClick={() => navigate("/learning-modules")}
          style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontFamily: P, fontSize: 14 }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Badge label={diffLabel} color={diffColor} />
          <span style={{ fontSize: 13, color: "#64748b" }}>Round {round}</span>
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
            {studentId} · {masteryScore}pts
          </span>
        </div>
      </div>

      {/* ── mastery bar ── */}
      <div style={{ padding: "8px 24px", background: "#0d1117" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11, color: "#475569" }}>
          <span>MASTERY</span>
          <span>{masteryScore}/100</span>
        </div>
        <MasteryBar score={masteryScore} />
      </div>

      {/* ── main content ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

        {/* title */}
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 8px", lineHeight: 1.2 }}>
          {moduleId}
        </h1>

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 20,
            background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)",
            color: "#f87171", fontSize: 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ── LOADING ── */}
          {phase === "loading" && (
            <motion.div key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ textAlign: "center", padding: "60px 0" }}
            >
              <div style={{ fontSize: 48 }}>⏳</div>
              <p style={{ color: "#64748b", marginTop: 12 }}>Loading lesson…</p>
            </motion.div>
          )}

          {/* ── LESSON ── */}
          {phase === "lesson" && content && (
            <motion.div key="lesson"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            >
              <div style={{
                background: "#111827", borderRadius: 20, padding: 28,
                border: "1px solid rgba(124,58,237,.15)", marginBottom: 20,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>📖</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.1em" }}>
                    LESSON — {diffLabel.toUpperCase()}
                  </span>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: "0 0 16px" }}>
                  {content.title}
                </h2>

                <p style={{ fontSize: 15, lineHeight: 1.8, color: "#94a3b8", margin: 0 }}>
                  {content.text}
                </p>

                {content.key_points?.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", margin: "0 0 10px" }}>
                      KEY POINTS
                    </p>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {content.key_points.map((pt, i) => (
                        <li key={i} style={{
                          display: "flex", gap: 10, alignItems: "flex-start",
                          fontSize: 14, color: "#cbd5e1",
                        }}>
                          <span style={{ color: "#7c3aed", marginTop: 1 }}>▸</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => setPhase("question")}
                style={{
                  width: "100%", padding: "16px 0", borderRadius: 14,
                  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  border: "none", color: "#fff", fontWeight: 700, fontSize: 16,
                  cursor: "pointer",
                }}
              >
                I'm ready — Take the question →
              </button>
            </motion.div>
          )}

          {/* ── QUESTION ── */}
          {phase === "question" && question && (
            <motion.div key="question"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            >
              <div style={{
                background: "#111827", borderRadius: 20, padding: 28,
                border: "1px solid rgba(124,58,237,.15)", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>🧠</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.1em" }}>
                    QUESTION
                  </span>
                </div>

                <p style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.6, margin: "0 0 24px" }}>
                  {question.text}
                </p>

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here…"
                  rows={4}
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                    color: "#fff", fontFamily: P, fontSize: 15, resize: "vertical",
                    outline: "none", boxSizing: "border-box",
                  }}
                />

                {/* hint toggle */}
                {hint?.text && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => setShowHint((h) => !h)}
                      style={{
                        background: "none", border: "none", color: "#64748b",
                        cursor: "pointer", fontSize: 13, fontFamily: P,
                      }}
                    >
                      💡 {showHint ? "Hide hint" : "Show hint"}
                    </button>
                    <AnimatePresence>
                      {showHint && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          style={{
                            marginTop: 8, padding: "12px 16px", borderRadius: 10,
                            background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.15)",
                            color: "#fcd34d", fontSize: 13, lineHeight: 1.6,
                          }}
                        >
                          {hint.text}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setPhase("lesson")}
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 12,
                    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                    color: "#94a3b8", fontFamily: P, fontWeight: 600, fontSize: 15, cursor: "pointer",
                  }}
                >
                  ← Re-read lesson
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || submitting}
                  style={{
                    flex: 2, padding: "14px 0", borderRadius: 12,
                    background: answer.trim() ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#1e293b",
                    border: "none", color: "#fff", fontFamily: P, fontWeight: 700, fontSize: 15,
                    cursor: answer.trim() ? "pointer" : "default",
                  }}
                >
                  {submitting ? "Checking…" : "Submit Answer ✓"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── FEEDBACK ── */}
          {phase === "feedback" && feedback && (
            <motion.div key="feedback"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            >
              {/* result card */}
              <div style={{
                borderRadius: 20, padding: 28, marginBottom: 20,
                background: feedback.correct
                  ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
                border: `1px solid ${feedback.correct ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)"}`,
              }}>
                <div style={{ fontSize: 40, textAlign: "center" }}>
                  {feedback.correct ? "🎉" : "💡"}
                </div>
                <h3 style={{
                  textAlign: "center", marginTop: 12, fontSize: 22, fontWeight: 900,
                  color: feedback.correct ? "#4ade80" : "#f87171",
                }}>
                  {feedback.correct ? "Correct!" : "Not quite"}
                </h3>
                <p style={{ textAlign: "center", color: "#94a3b8", marginTop: 8, fontSize: 14 }}>
                  {feedback.recommendation}
                </p>
              </div>

              {/* your answer vs correct */}
              <div style={{
                background: "#111827", borderRadius: 16, padding: 20,
                border: "1px solid rgba(255,255,255,.06)", marginBottom: 16,
              }}>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 4px" }}>YOUR ANSWER</p>
                  <p style={{ fontSize: 15, color: feedback.correct ? "#4ade80" : "#f87171", margin: 0 }}>{answer}</p>
                </div>
                {!feedback.correct && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12 }}>
                    <p style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 4px" }}>CORRECT ANSWER</p>
                    <p style={{ fontSize: 15, color: "#4ade80", margin: 0 }}>{feedback.correct_answer}</p>
                  </div>
                )}
                {feedback.answer_explanation && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 12, marginTop: 12 }}>
                    <p style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 4px" }}>EXPLANATION</p>
                    <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{feedback.answer_explanation}</p>
                  </div>
                )}
              </div>

              {/* mastery update */}
              <div style={{
                background: "#111827", borderRadius: 16, padding: 20,
                border: "1px solid rgba(255,255,255,.06)", marginBottom: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>Mastery Score</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#a78bfa" }}>{feedback.mastery_score}/100</span>
                </div>
                <MasteryBar score={feedback.mastery_score} />
                <p style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
                  Next: <span style={{ color: "#67e8f9", fontWeight: 700 }}>{feedback.next_difficulty === "medium" ? "Medium" : "Easy"}</span> difficulty
                  {feedback.mastery_score >= 70 && " 🔥 You're mastering this!"}
                  {feedback.mastery_score >= 50 && feedback.mastery_score < 70 && " 👍 Making great progress!"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => navigate("/learning-modules")}
                  style={{
                    flex: 1, padding: "14px 0", borderRadius: 12,
                    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                    color: "#94a3b8", fontFamily: P, fontWeight: 600, fontSize: 15, cursor: "pointer",
                  }}
                >
                  ← All Modules
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    flex: 2, padding: "14px 0", borderRadius: 12,
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    border: "none", color: "#fff", fontFamily: P, fontWeight: 700, fontSize: 15, cursor: "pointer",
                  }}
                >
                  Next Round →
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

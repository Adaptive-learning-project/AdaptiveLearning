import { useEffect, useRef, useState } from "react";
import { studentApi } from "../api/adaptiveApi";

const P = "Poppins, sans-serif";
const BLUE = "#1565c0";
const BG = "#f5f9fd";
const WHITE = "#ffffff";
const BORDER = "#dce8f5";
const TEXT = "#0d2137";
const MUTED = "#607d8b";
const LIGHT_BLUE = "#eaf3ff";

// ── INDIAN ENGLISH NATURAL TTS ────────────────────────────────────────────────

let cachedVoice: SpeechSynthesisVoice | null = null;

function getIndianVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const preferred = voices.find(v =>
    v.lang.replace("_", "-").toLowerCase() === "en-in" ||
    v.name.toLowerCase().includes("india") ||
    v.name.toLowerCase().includes("neerja") ||
    v.name.toLowerCase().includes("prabhat")
  );

  cachedVoice = preferred || voices.find(v => v.lang.startsWith("en")) || null;
  return cachedVoice;
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => { getIndianVoice(); };
}

function cleanSpeech(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "")
    .replace(/```[\s\S]*?```/g, ", , Look at the code snippet on screen. , ,")
    .replace(/`/g, "")
    .replace(/:\s+/g, ": , ")
    .replace(/\bC\+\+\b/g, "C plus plus")
    .replace(/= 0;/g, "equals zero semicolon")
    .replace(/\s+/g, " ")
    .trim();
}

function speak(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const cl = cleanSpeech(text);
  if (!cl) { onEnd?.(); return; }
  const u = new SpeechSynthesisUtterance(cl);
  const v = getIndianVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-IN"; }
  u.rate = 0.86;
  u.pitch = 1.0;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function stopSpeech() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ── DIFFICULTY BADGE ──────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  const d = (difficulty || "medium").toLowerCase();
  let bg = "#f1f5f9";
  let color = "#475569";
  let border = "#cbd5e1";

  if (d === "easy") {
    bg = "#f0fdf4"; color = "#16a34a"; border = "#bbf7d0";
  } else if (d === "easy-medium") {
    bg = "#f0fdfa"; color = "#0d9488"; border = "#99f6e4";
  } else if (d === "medium") {
    bg = "#eff6ff"; color = "#2563eb"; border = "#bfdbfe";
  } else if (d === "medium-hard") {
    bg = "#fffbeb"; color = "#d97706"; border = "#fde68a";
  } else if (d === "hard") {
    bg = "#fef2f2"; color = "#dc2626"; border = "#fecaca";
  }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20, fontSize: 11,
      fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
      background: bg, color: color, border: `1px solid ${border}`
    }}>
      ● {d}
    </span>
  );
}

// ── SHARED ATOMS ──────────────────────────────────────────────────────────────

function SpeakBtn({ text, label = "🔊 Listen again" }: { text: string; label?: string }) {
  return (
    <button onClick={() => speak(text)} style={{
      background: LIGHT_BLUE, border: "1px solid #c5ddf8", borderRadius: 8,
      padding: "6px 14px", cursor: "pointer", color: BLUE, fontFamily: P,
      fontSize: 13, fontWeight: 700,
    }}>
      {label}
    </button>
  );
}

function PrimaryBtn({ onClick, children, disabled = false, color }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; color?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
      background: disabled ? "#cbd5e1" : (color || BLUE),
      color: "#fff", fontFamily: P, fontWeight: 700, fontSize: 17,
      cursor: disabled ? "default" : "pointer", marginTop: 14,
      boxShadow: disabled ? "none" : "0 6px 18px rgba(21,101,192,0.22)",
      transition: "all .2s",
    }}>
      {children}
    </button>
  );
}

function OverviewCard({ overview }: { overview: { what_we_know: string; what_we_study: string; expected_outcome: string } }) {
  return (
    <div style={{ background: WHITE, borderRadius: 16, padding: "20px", marginBottom: 18, border: `1px solid #c5ddf8`, boxShadow: "0 2px 10px rgba(21,101,192,0.06)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 14 }}>
        📍 Lesson Overview
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span>✅</span>
          <span style={{ fontSize: 14, color: "#334155" }}><strong>What we know:</strong> {overview.what_we_know}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span>📖</span>
          <span style={{ fontSize: 14, color: "#334155" }}><strong>Studying now:</strong> {overview.what_we_study}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span>🎯</span>
          <span style={{ fontSize: 14, color: "#334155" }}><strong>Outcome:</strong> {overview.expected_outcome}</span>
        </div>
      </div>
    </div>
  );
}

// ── LEARNING LOOP ─────────────────────────────────────────────────────────────

type Phase = "loading" | "diagnostic" | "overview" | "content" | "question" | "feedback" | "completed";

function LearningLoop({ studentId, unitId, topic, onDone }: {
  studentId: string; unitId: string; topic: string; onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [activity, setActivity] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [diagnosticDone, setDiagnosticDone] = useState(false);
  const ttsGuard = useRef(false);

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
        speak(data.message || "All concepts mastered!");
        return;
      }

      // 1. Check for entry diagnostic
      if (!diagnosticDone && data.diagnostic_question) {
        setPhase("diagnostic");
        return;
      }

      // 2. Route straight to question if content_type is null (re-attempt or challenge)
      if (data.content_type === null) {
        setPhase("question");
      } else if (data.consecutive_wrong === 0 && data.overview && data.std_question_index === 0) {
        setPhase("overview");
      } else {
        setPhase("content");
      }
    } catch (e: any) {
      alert("Activity load error: " + (e?.message || ""));
    }
  }

  useEffect(() => { loadNext(); }, []);

  // Voice narration triggers
  useEffect(() => {
    if (!activity || ttsGuard.current) return;
    if (phase === "overview") {
      ttsGuard.current = true;
      speak(`Overview for ${activity.subtopic_name}. ${activity.overview?.what_we_study || ""}`);
    } else if (phase === "content") {
      ttsGuard.current = true;
      speak(activity.content?.text || "");
    } else if (phase === "question") {
      ttsGuard.current = true;
      const hintMsg = (activity.show_hint && activity.hint && activity.consecutive_wrong >= 1)
        ? " Hint: " + activity.hint
        : "";
      speak((activity.question?.text || "") + hintMsg);
    }
  }, [phase, activity]);

  async function handleDiagnosticSubmit() {
    if (selected === null || !activity?.diagnostic_question) return;
    setSubmitting(true);
    try {
      const isCorrect = selected === activity.diagnostic_question.correct;
      await studentApi.submitDiagnostic({
        student_id: studentId,
        unit_id: unitId,
        answers: [{ subtopic_id: activity.subtopic_id, correct: isCorrect }],
      });
      setDiagnosticDone(true);
      setPhase(activity.overview ? "overview" : "content");
    } finally {
      setSubmitting(false);
      setSelected(null);
    }
  }

  async function handleSubmit() {
    if (selected === null || !activity) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitAnswer({
        student_id: studentId,
        subtopic_id: activity.subtopic_id,
        selected_option: selected,
        question_type: activity.question_type || "question",
        hint_used: Boolean(activity.show_hint),
      });

      setResult(res);
      setActivity((prev: any) => ({
        ...prev,
        mastery_score: res.mastery_score,
        consecutive_wrong: res.correct ? 0 : (prev.consecutive_wrong + 1),
        can_skip: res.can_skip,
      }));

      speak(res.correct ? "Correct! " + (res.explanation || "") : "Not quite. " + (res.explanation || ""));
      setPhase("feedback");
    } catch {
      alert("Submission error. Ensure backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading") {
    return (
      <Screen topic={topic} onBack={onDone}>
        <div style={{ textAlign: "center", paddingTop: 80, fontFamily: P, color: MUTED }}>
          Loading your next activity…
        </div>
      </Screen>
    );
  }

  const content = activity?.content;
  const question = activity?.question;
  const mastery = activity?.mastery_score ?? 0;
  const cWrong = activity?.consecutive_wrong ?? 0;

  return (
    <Screen topic={topic} onBack={onDone}>
      {/* Header bar */}
      <div style={{ background: WHITE, borderRadius: 14, padding: "12px 18px", border: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <p style={{ fontWeight: 800, color: TEXT, fontSize: 16, margin: 0 }}>{activity?.subtopic_name}</p>
          {cWrong > 0 && <span style={{ fontSize: 12, color: "#d97706" }}>Attempt {cWrong + 1}</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontWeight: 900, color: BLUE, fontSize: 20 }}>{mastery}</span>
          <span style={{ fontSize: 10, color: MUTED, display: "block" }}>MASTERY</span>
        </div>
      </div>

      {/* ── 1. DIAGNOSTIC CARD ── */}
      {phase === "diagnostic" && activity?.diagnostic_question && (
        <div style={{ background: WHITE, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ color: BLUE, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>🎯 Diagnostic Check</span>
            <DifficultyBadge difficulty="easy" />
          </div>
          <p style={{ fontFamily: P, fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 16 }}>
            {activity.diagnostic_question.text}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {activity.diagnostic_question.options.map((opt: string, i: number) => (
              <button key={i} onClick={() => setSelected(i)} style={{
                padding: "14px 16px", borderRadius: 12, border: `2px solid ${selected === i ? BLUE : BORDER}`,
                background: selected === i ? LIGHT_BLUE : WHITE, textAlign: "left", cursor: "pointer", fontFamily: P
              }}>
                {opt}
              </button>
            ))}
          </div>
          <PrimaryBtn onClick={handleDiagnosticSubmit} disabled={selected === null || submitting}>
            Confirm & Start Lesson →
          </PrimaryBtn>
        </div>
      )}

      {/* ── 2. SEPARATE OVERVIEW CARD ── */}
      {phase === "overview" && activity?.overview && (
        <div>
          <OverviewCard overview={activity.overview} />
          <PrimaryBtn onClick={() => setPhase("content")}>
            Begin Lesson →
          </PrimaryBtn>
        </div>
      )}

      {/* ── 3. LESSON CARD ── */}
      {phase === "content" && content && (
        <div style={{ background: WHITE, borderRadius: 20, padding: "26px 22px", border: `1px solid ${BORDER}` }}>
          <p style={{ fontFamily: P, fontSize: 16, fontWeight: 500, color: TEXT, lineHeight: 1.8, whiteSpace: "pre-line" }}>
            {content.text}
          </p>

          {content.code_snippet && (
            <div style={{ background: "#030712", borderRadius: 12, padding: "14px 18px", margin: "16px 0", overflowX: "auto" }}>
              <pre style={{ fontFamily: "monospace", fontSize: 14, color: "#38bdf8", margin: 0 }}>
                {content.code_snippet}
              </pre>
            </div>
          )}

          {content.takeaway && (
            <div style={{ background: LIGHT_BLUE, borderRadius: 10, padding: "10px 14px", color: BLUE, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              💡 Takeaway: {content.takeaway}
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <SpeakBtn text={content.text} />
          </div>

          <PrimaryBtn onClick={() => { ttsGuard.current = false; setPhase("question"); }}>
            I'm ready — answer question →
          </PrimaryBtn>
        </div>
      )}

      {/* ── 4. QUESTION PHASE ── */}
      {phase === "question" && question && (
        <div>
          <div style={{ background: WHITE, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>
                {activity.question_type === "hard_question" ? "🔥 Challenge" : "Question"}
              </span>
              <DifficultyBadge difficulty={activity.difficulty || question.difficulty} />
            </div>

            <p style={{ fontFamily: P, fontSize: 17, fontWeight: 700, color: TEXT, lineHeight: 1.6, margin: "0 0 10px", whiteSpace: "pre-line" }}>
              {question.text}
            </p>
            <SpeakBtn text={question.text} />

            {/* Hint only displayed after a failed attempt */}
            {activity.show_hint && activity.hint && cWrong >= 1 && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#d97706", display: "flex", gap: 8, fontSize: 14 }}>
                <span>💡</span><span>{activity.hint}</span>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
            {question.options?.map((opt: string, i: number) => (
              <button key={i} onClick={() => { setSelected(i); speak(opt); }} style={{
                padding: "15px 18px", borderRadius: 14, border: `2px solid ${selected === i ? BLUE : BORDER}`,
                background: selected === i ? LIGHT_BLUE : WHITE, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12
              }}>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: selected === i ? BLUE : BORDER, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: selected === i ? "#fff" : MUTED }}>
                  {["A", "B", "C", "D"][i]}
                </span>
                <span style={{ fontFamily: P, fontSize: 16, color: selected === i ? TEXT : "#475569" }}>{opt}</span>
              </button>
            ))}
          </div>

          <PrimaryBtn onClick={handleSubmit} disabled={selected === null || submitting}>
            {submitting ? "Checking…" : "Submit Answer ✓"}
          </PrimaryBtn>

          {/* Skip option available for hard questions or persistent loop */}
          {(activity.can_skip || activity.question_type === "hard_question") && (
            <button onClick={loadNext} style={{
              width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14,
              border: `1px solid ${BORDER}`, background: "transparent", color: MUTED,
              fontFamily: P, fontWeight: 600, fontSize: 14, cursor: "pointer"
            }}>
              Next Topic →
            </button>
          )}
        </div>
      )}

      {/* ── 5. FEEDBACK PHASE ── */}
      {phase === "feedback" && result && (
        <div style={{ background: WHITE, borderRadius: 20, padding: 24, border: `1px solid ${BORDER}`, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{result.correct ? "✅" : "❌"}</div>
          <h3 style={{ fontFamily: P, fontWeight: 900, fontSize: 22, color: result.correct ? "#16a34a" : "#dc2626", margin: "0 0 8px" }}>
            {result.correct ? "Correct!" : "Not quite!"}
          </h3>
          {result.explanation && (
            <p style={{ fontFamily: P, color: "#334155", fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
              {result.explanation}
            </p>
          )}

          <PrimaryBtn onClick={loadNext} color={result.correct ? "#16a34a" : BLUE}>
            {result.just_mastered ? "Next Concept 🚀" : "Continue →"}
          </PrimaryBtn>

          {/* Option to skip forward if failed on hard question or with hints */}
          {(result.can_skip || activity.question_type === "hard_question") && !result.correct && (
            <button onClick={loadNext} style={{
              width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14,
              border: `1px solid ${BORDER}`, background: "transparent", color: MUTED,
              fontFamily: P, fontWeight: 600, fontSize: 14, cursor: "pointer"
            }}>
              Next Topic →
            </button>
          )}
        </div>
      )}

      {/* ── 6. COMPLETED PHASE ── */}
      {phase === "completed" && (
        <div style={{ background: WHITE, borderRadius: 20, padding: 36, textAlign: "center", border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontFamily: P, fontWeight: 900, color: "#16a34a", fontSize: 26 }}>Unit Mastered!</h2>
          <p style={{ fontFamily: P, color: MUTED, fontSize: 15 }}>{activity.message}</p>
          <PrimaryBtn onClick={onDone}>Back to Topics</PrimaryBtn>
        </div>
      )}
    </Screen>
  );
}

function Screen({ children, topic, onBack }: { children: React.ReactNode; topic?: string; onBack?: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ background: WHITE, borderBottom: `1px solid ${BORDER}`, padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: P, fontWeight: 700, color: TEXT, fontSize: 15 }}>{topic || "Adaptive Learning"}</span>
        {onBack && (
          <button onClick={onBack} style={{ marginLeft: "auto", border: `1px solid ${BORDER}`, background: WHITE, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: P, fontSize: 13, color: MUTED }}>
            ← Topics
          </button>
        )}
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 20px 40px" }}>{children}</div>
    </div>
  );
}

type SView = "login" | "topics" | "learning";

export default function StudentPage() {
  const [view, setView] = useState<SView>(() => sessionStorage.getItem("student_id") ? "topics" : "login");
  const [studentId, setStudentId] = useState(() => sessionStorage.getItem("student_id") || "");
  const [unitId, setUnitId] = useState("");
  const [topic, setTopic] = useState("");

  function onLogin(name: string) {
    sessionStorage.setItem("student_id", name);
    setStudentId(name);
    setView("topics");
  }

  if (view === "login") return <LoginScreen onLogin={onLogin} />;
  if (view === "topics") return <TopicSelect studentId={studentId} onSelect={(uid, t) => { setUnitId(uid); setTopic(t); setView("learning"); }} />;
  if (view === "learning") return <LearningLoop studentId={studentId} unitId={unitId} topic={topic} onDone={() => setView("topics")} />;
  return null;
}

function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState("");
  useEffect(() => { speak("Welcome! What is your name?"); }, []);
  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: WHITE, borderRadius: 24, padding: 48, maxWidth: 400, width: "100%", textAlign: "center", border: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 26, margin: "0 0 8px" }}>Welcome!</h1>
        <p style={{ fontFamily: P, color: MUTED, fontSize: 15, margin: "0 0 24px" }}>What is your name?</p>
        <input
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && onLogin(name.trim())}
          placeholder="Type your name here" autoFocus
          style={{ width: "100%", padding: 14, borderRadius: 12, boxSizing: "border-box", background: "#f8fbff", border: `1.5px solid ${BORDER}`, color: TEXT, fontFamily: P, fontSize: 18, textAlign: "center" }}
        />
        <PrimaryBtn onClick={() => name.trim() && onLogin(name.trim())} disabled={!name.trim()}>
          Let's Learn! 🚀
        </PrimaryBtn>
      </div>
    </div>
  );
}

function TopicSelect({ studentId, onSelect }: { studentId: string; onSelect: (unitId: string, topic: string) => void }) {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getTopics()
      .then(d => {
        const ready = (d.topics as any[]).filter((t: any) => t.approved_subtopics > 0);
        setTopics(ready);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: BG, padding: "40px 24px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 26, textAlign: "center", marginBottom: 24 }}>
          Choose a Topic, {studentId}!
        </h1>
        {loading ? <p style={{ textAlign: "center", color: MUTED }}>Loading topics…</p> : (
          <div style={{ display: "grid", gap: 14 }}>
            {topics.map((t: any) => (
              <button key={t.unit_id} onClick={() => onSelect(t.unit_id, t.topic)} style={{
                background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 18, padding: 20, textAlign: "left", cursor: "pointer"
              }}>
                <div style={{ fontFamily: P, fontWeight: 800, color: TEXT, fontSize: 18 }}>{t.topic}</div>
                <div style={{ fontFamily: P, color: MUTED, fontSize: 13, marginTop: 4 }}>{t.approved_subtopics} lessons available</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
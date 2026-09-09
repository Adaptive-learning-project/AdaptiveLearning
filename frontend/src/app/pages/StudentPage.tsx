import { useEffect, useRef, useState } from "react";
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

// --- NATURAL INDIAN EN-IN SPACED TTS ENGINE ---
let cachedVoice: SpeechSynthesisVoice | null = null;

function getIndianVoice(): SpeechSynthesisVoice | null {
  if (!("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find(
      (v) =>
        v.lang.replace("_", "-").toLowerCase() === "en-in" ||
        v.name.toLowerCase().includes("india") ||
        v.name.toLowerCase().includes("neerja") ||
        v.name.toLowerCase().includes("ravi") ||
        v.name.toLowerCase().includes("veena")
    ) ||
    voices.find((v) => v.lang.startsWith("en-GB")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null;

  return cachedVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    getIndianVoice();
  };
}

function speakIndianSpaced(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();

  // Spaced cadence formatting to avoid rushing technical jargon
  const spacedText = text
    .replace(/([A-Z]{2,})/g, " $1 ") // acronym spacing (e.g. DAG -> D A G)
    .replace(/([.?!])/g, "$1 ... ")  // natural pause after sentences
    .replace(/([,:;])/g, "$1 ")       // natural pause after clauses
    .replace(/\s+/g, " ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(spacedText);
  const voice = getIndianVoice();
  if (voice) utterance.voice = voice;

  utterance.rate = 0.86; // natural Indian cadence
  utterance.pitch = 1.02;

  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
}

function stopTTS() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export default function StudentPage() {
  const navigate = useNavigate();
  const [studentName] = useState(() => sessionStorage.getItem("student_name") || "Student");
  const [studentId] = useState(() => sessionStorage.getItem("student_id") || "student_demo");
  const [unitId] = useState(() => sessionStorage.getItem("unit_id") || "");

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  const switchCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!unitId) {
      navigate("/learning-modules");
      return;
    }
    fetchNext();

    return () => {
      stopTTS();
    };
  }, []);

  async function fetchNext() {
    stopTTS();
    setLoading(true);
    setSelected(null);
    setFeedback(null);
    switchCount.current = 0;
    startTime.current = Date.now();

    try {
      const res = await studentApi.getNextActivity(studentId, unitId);
      setActivity(res);
      setPayload(res.activity_payload);

      if (res.completed) {
        speakIndianSpaced(`Congratulations ${studentName}! You have successfully mastered this entire module.`);
        return;
      }

      // Voice the dynamic intervention or question
      if (res.activity_payload) {
        const p = res.activity_payload;
        if (p.analogy_text) {
          speakIndianSpaced(`Let us break this down with an analogy. ${p.analogy_text}. Now, consider this question: ${p.question}`);
        } else if (p.hint) {
          speakIndianSpaced(`Here is a helpful clue: ${p.hint}. Now, evaluate the question: ${p.question}`);
        } else {
          speakIndianSpaced(p.question);
        }
      }
    } catch (e) {
      console.error("Error loading activity:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(idx: number) {
    if (selected !== null && selected !== idx) {
      switchCount.current += 1;
    }
    setSelected(idx);

    if (payload?.options?.[idx]) {
      speakIndianSpaced(payload.options[idx]);
    }
  }

  async function handleSubmit() {
    if (selected === null || submitting) return;
    setSubmitting(true);
    stopTTS();

    const latency = Date.now() - startTime.current;
    const isCorrect = selected === payload.correct_index;

    try {
      const res = await studentApi.submitAnswer({
        student_id: studentId,
        unit_id: unitId,
        subtopic_id: activity.subtopic_id,
        subtopic_name: activity.subtopic_name,
        selected_option: selected,
        correct_option: payload.correct_index,
        correct: isCorrect,
        response_time_ms: latency,
        option_switch_count: switchCount.current,
      });

      if (res.completed) {
        setFeedback(null);
        setActivity((prev: any) => ({ ...prev, completed: true }));
        speakIndianSpaced(`Module completed! You navigated the entire curriculum tree and reached full mastery.`);
        return;
      }

      setFeedback({
        correct: res.correct,
        p_l: res.p_l,
        delta: res.mastery_delta,
        score: res.mastery_score,
        state: res.cognitive_state,
        action: res.pedagogical_action,
        explanation: payload.explanation,
      });

      setActivity((prev: any) => ({
        ...prev,
        subtopic_name: res.subtopic_name || prev.subtopic_name,
        cognitive_state: res.cognitive_state,
        mastery_score: res.mastery_score,
        p_l: res.p_l,
      }));

      setPayload(res.activity_payload);

      // Auditory Feedback
      if (res.correct) {
        speakIndianSpaced(`Correct! Well reasoned. ${payload.explanation || ""}`);
      } else {
        speakIndianSpaced(`Not quite. Let us examine why: ${payload.explanation || ""}`);
      }
    } catch (e) {
      console.error("Submission failed:", e);
    } finally {
      setSubmitting(false);
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "MASTERED": return "#16a34a";
      case "OSCILLATING": return "#d97706";
      case "STRUGGLING": return "#dc2626";
      default: return BLUE;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: P, padding: "28px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Navigation & Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button
            onClick={() => {
              stopTTS();
              navigate("/learning-modules");
            }}
            style={{ background: "none", border: "none", color: BLUE, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            ← Back to Modules
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => {
                if (payload?.question) {
                  speakIndianSpaced(payload.analogy_text ? `${payload.analogy_text}. Question: ${payload.question}` : payload.question);
                }
              }}
              style={{
                background: LIGHT_BLUE,
                border: `1px solid ${BORDER}`,
                color: BLUE,
                borderRadius: 10,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔊 Read Aloud
            </button>
            <span style={{ fontSize: 12, color: MUTED }}>Learner: <strong>{studentName}</strong></span>
          </div>
        </div>

        {/* Dynamic Governor Monitor Banner */}
        <div
          style={{
            background: WHITE,
            borderRadius: 20,
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: `1px solid ${BORDER}`,
            marginBottom: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: TEXT }}>{activity?.subtopic_name || "Learning Concept"}</h3>
              <span
                style={{
                  background: `${getStateColor(activity?.cognitive_state || "PROGRESSING")}15`,
                  color: getStateColor(activity?.cognitive_state || "PROGRESSING"),
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {activity?.cognitive_state || "INITIALIZING"}
              </span>
            </div>
            <span style={{ fontSize: 13, color: MUTED }}>
              Governor Action: <strong>{payload?.tier || "EVALUATING"}</strong>
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: BLUE }}>
              {activity?.mastery_score ?? 30}%
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 0.5 }}>P(L) MASTERY</span>
          </div>
        </div>

        {/* Completion Card */}
        {activity?.completed ? (
          <div style={{ background: WHITE, borderRadius: 22, padding: 40, textAlign: "center", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎓</div>
            <h2 style={{ color: TEXT, margin: "0 0 8px" }}>Module Completely Mastered!</h2>
            <p style={{ color: MUTED, fontSize: 15, marginBottom: 24 }}>
              You navigated the full curriculum DAG, demonstrated mastery across all concept nodes, and resolved all interventions.
            </p>
            <button
              onClick={() => navigate("/learning-modules")}
              style={{
                padding: "14px 28px",
                borderRadius: 14,
                border: "none",
                background: BLUE,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Select Another Module →
            </button>
          </div>
        ) : loading ? (
          <div style={{ background: WHITE, borderRadius: 20, padding: 40, textAlign: "center", border: `1px solid ${BORDER}`, color: MUTED }}>
            Synthesizing adaptive instruction...
          </div>
        ) : feedback ? (
          /* Feedback Card */
          <div style={{ background: WHITE, borderRadius: 22, padding: 32, textAlign: "center", border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{feedback.correct ? "🌟" : "💡"}</div>
            <h2 style={{ margin: "0 0 8px", color: feedback.correct ? "#16a34a" : "#d97706" }}>
              {feedback.correct ? "Correct! Concept Strengthened" : "Misconception Detected"}
            </h2>
            <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.5, margin: "0 0 16px" }}>{feedback.explanation}</p>

            {/* Pedagogical Intervention Summary */}
            <div style={{ background: BG, padding: "16px 20px", borderRadius: 16, textAlign: "left", marginBottom: 24, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginBottom: 6 }}>PEDAGOGICAL INTERVENTION LOG:</div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
                • Transition State: <strong style={{ color: getStateColor(feedback.state) }}>{feedback.state}</strong>
              </div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
                • Governor Strategy: <strong>{feedback.action}</strong>
              </div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 600 }}>
                • Updated Probability of Mastery: <strong>{feedback.p_l} ({feedback.delta >= 0 ? `+${feedback.delta}%` : `${feedback.delta}%`})</strong>
              </div>
            </div>

            <button
              onClick={() => {
                setFeedback(null);
                setSelected(null);
                startTime.current = Date.now();
                switchCount.current = 0;
                if (payload?.question) {
                  speakIndianSpaced(payload.analogy_text ? `${payload.analogy_text}. Question: ${payload.question}` : payload.question);
                }
              }}
              style={{
                width: "100%",
                padding: "15px 0",
                borderRadius: 14,
                border: "none",
                background: BLUE,
                color: WHITE,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Receive Next Adaptive Step →
            </button>
          </div>
        ) : (
          /* Active Question & Interventions */
          <div style={{ background: WHITE, borderRadius: 22, padding: 30, border: `1px solid ${BORDER}` }}>

            {/* Analogy Box if Struggling */}
            {payload?.analogy_text && (
              <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#854d0e", display: "block", marginBottom: 4 }}>
                  STEP-DOWN ANALOGY SCAFFOLD
                </span>
                <p style={{ margin: 0, fontSize: 14, color: "#713f12", lineHeight: 1.5 }}>
                  {payload.analogy_text}
                </p>
              </div>
            )}

            {/* Hint Box if Oscillating */}
            {payload?.hint && (
              <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 16, padding: "16px 20px", marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#065f46", display: "block", marginBottom: 4 }}>
                  SOCRATIC ELIMINATION CLUE
                </span>
                <p style={{ margin: 0, fontSize: 14, color: "#047857", lineHeight: 1.5 }}>
                  {payload.hint}
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: BLUE }}>{payload?.badge || "ACTIVE QUESTION"}</span>
              <span style={{ fontSize: 12, color: MUTED }}>Switches: {switchCount.current}</span>
            </div>

            <p style={{ fontSize: 17, fontWeight: 700, color: TEXT, margin: "0 0 24px", lineHeight: 1.5 }}>
              {payload?.question}
            </p>

            {/* Options */}
            <div style={{ display: "grid", gap: 12, marginBottom: 26 }}>
              {payload?.options?.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  style={{
                    padding: "16px 20px",
                    borderRadius: 14,
                    border: `2px solid ${selected === idx ? BLUE : BORDER}`,
                    background: selected === idx ? LIGHT_BLUE : WHITE,
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 600,
                    color: selected === idx ? BLUE : TEXT,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ marginRight: 10, color: MUTED, fontWeight: 800 }}>
                    {["A", "B", "C", "D"][idx]}.
                  </span>
                  {opt}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={selected === null || submitting}
              style={{
                width: "100%",
                padding: "16px 0",
                borderRadius: 14,
                border: "none",
                background: selected === null ? "#cbd5e1" : BLUE,
                color: WHITE,
                fontSize: 16,
                fontWeight: 700,
                cursor: selected === null ? "default" : "pointer",
              }}
            >
              {submitting ? "Evaluating via Governor..." : "Submit Answer & Evaluate ✓"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";

import {
  jitApi,
  type JITTeachingContent,
  type JITVisualActivity,
} from "../api/adaptiveApi";

const P = "Poppins, sans-serif";
const BLUE = "#1d4ed8";
const BG = "#f1f5f9";
const WHITE = "#ffffff";
const BORDER = "#cbd5e1";
const TEXT = "#0f172a";
const MUTED = "#475569";
const LIGHT_BLUE = "#eff6ff";
const SUCCESS = "#15803d";
const WARNING_BG = "#fffbeb";
const WARNING_TEXT = "#b45309";

type Phase = "teach" | "question" | "feedback" | "completed";

interface AdaptiveInfo {
  subtopic_id: string;
  subtopic_name?: string;
  learning_objective: string;
  difficulty: "easy" | "medium" | "hard";
  zone?: string;
  reason?: string;
  p_l: number;
}

interface FeedbackState {
  correct: boolean;
  previous_mastery: number;
  new_mastery: number;
  status: string;
}

// ------------------------------------------------------------
// Universal Vivid Palette with Sharp, Saturated Hues
// ------------------------------------------------------------
const COLOR_CONFIG: Record<string, { hex: string; tamil: string; en: string }> = {
  tile_red: { hex: "#DC2626", tamil: "சிகப்பு", en: "red" },
  tile_green: { hex: "#16A34A", tamil: "பச்சை", en: "green" },
  tile_blue: { hex: "#2563EB", tamil: "நீலம்", en: "blue" },
  tile_yellow: { hex: "#CA8A04", tamil: "மஞ்சள்", en: "yellow" },
  ball_big_red: { hex: "#DC2626", tamil: "சிகப்பு", en: "red" },
  ball_small_green: { hex: "#16A34A", tamil: "பச்சை", en: "green" },
};

function getColorMeta(key: string) {
  if (COLOR_CONFIG[key]) return COLOR_CONFIG[key];
  const l = (key || "").toLowerCase();
  if (l.includes("red")) return COLOR_CONFIG.tile_red;
  if (l.includes("green")) return COLOR_CONFIG.tile_green;
  if (l.includes("blue")) return COLOR_CONFIG.tile_blue;
  if (l.includes("yellow")) return COLOR_CONFIG.tile_yellow;
  return COLOR_CONFIG.tile_red;
}

// ------------------------------------------------------------
// Sharp, Bold Color Tile Component
// ------------------------------------------------------------
function RenderColorSquare({
  colorKey,
  isPulsing,
  width = 240,
  height = 240,
}: {
  colorKey: string;
  isPulsing: boolean;
  width?: number;
  height?: number;
}) {
  const meta = getColorMeta(colorKey);

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: meta.hex,
        borderRadius: 8,
        border: isPulsing ? "6px solid #f59e0b" : "3px solid rgba(0, 0, 0, 0.12)",
        boxShadow: isPulsing
          ? "0 0 32px 8px rgba(245, 158, 11, 0.75)"
          : "0 6px 16px rgba(0, 0, 0, 0.15)",
        transform: isPulsing ? "scale(1.03)" : "scale(1)",
        transition: "all 0.25s ease-in-out",
      }}
    />
  );
}

// ------------------------------------------------------------
// Speech Synthesis Engine
// ------------------------------------------------------------
// ------------------------------------------------------------
// Audio Unlocker & Fail-Safe TTS Engine
// ------------------------------------------------------------
let isAudioUnlocked = false;

export function unlockAudioContext() {
  if (isAudioUnlocked || typeof window === "undefined") return;
  if ("speechSynthesis" in window) {
    // Speak a silent micro-utterance to lift the browser autoplay lock
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0.01;
    window.speechSynthesis.speak(silent);
    isAudioUnlocked = true;
    console.log("🔊 Audio Context Unlocked by User Interaction");
  }
}

export function speakInstruction(tamilText?: string, englishText?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported.");
    return;
  }

  // Cancel any stalled utterance
  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const voices = window.speechSynthesis.getVoices();

  // Look for any Tamil voice installed in Windows/Edge/Chrome
  const tamilVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith("ta") ||
      v.name.toLowerCase().includes("tamil") ||
      v.name.toLowerCase().includes("valluvar") ||
      v.name.toLowerCase().includes("pallavi")
  );

  let utterance: SpeechSynthesisUtterance;

  if (tamilVoice && tamilText) {
    // Native Tamil voice exists
    utterance = new SpeechSynthesisUtterance(tamilText);
    utterance.voice = tamilVoice;
    utterance.lang = tamilVoice.lang;
    utterance.rate = 0.85;
  } else {
    // Fallback: Speak simple English with Indian/US English voice
    const textToSpeak = englishText || (tamilText ? "Touch the color" : "");
    utterance = new SpeechSynthesisUtterance(textToSpeak);
    const enVoice = voices.find((v) => v.lang.startsWith("en-IN")) || voices.find((v) => v.lang.startsWith("en"));
    if (enVoice) utterance.voice = enVoice;
    utterance.lang = "en-IN";
    utterance.rate = 0.9;
  }

  utterance.pitch = 1.0;

  // Workaround for Chrome/Edge garbage collection bug
  (window as any)._activeUtterance = utterance;
  utterance.onend = () => {
    (window as any)._activeUtterance = null;
  };
  utterance.onerror = (e) => {
    console.warn("TTS playback error:", e);
  };

  window.speechSynthesis.speak(utterance);
}
export default function StudentPage() {
  const navigate = useNavigate();

  const [studentName] = useState(
    () => sessionStorage.getItem("student_name") || "Student"
  );
  const [studentId] = useState(
    () => sessionStorage.getItem("student_id") || "student_demo"
  );
  const [unitId] = useState(
    () => sessionStorage.getItem("unit_id") || ""
  );

  const [phase, setPhase] = useState<Phase>("teach");
  const [teaching, setTeaching] = useState<JITTeachingContent | null>(null);
  const [question, setQuestion] = useState<JITVisualActivity | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [adaptive, setAdaptive] = useState<AdaptiveInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [facpCode, setFacpCode] = useState<string>("+");

  // Interaction telemetry
  const [switchCount, setSwitchCount] = useState(0);
  const [audioReplayCount, setAudioReplayCount] = useState(0);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const startedAt = useRef<number>(Date.now());

  // Scaffolding states
  const [scaffoldLevel, setScaffoldLevel] = useState<"NONE" | "VP" | "C" | "PP">("NONE");
  const [targetPulsing, setTargetPulsing] = useState(false);
  const [distractorOpacity, setDistractorOpacity] = useState(1.0);
  const [errorCount, setErrorCount] = useState(0);
  useEffect(() => {
  const handleInteraction = () => {
    unlockAudioContext();
  };

  window.addEventListener("click", handleInteraction, { once: true });
  window.addEventListener("touchstart", handleInteraction, { once: true });

  return () => {
    window.removeEventListener("click", handleInteraction);
    window.removeEventListener("touchstart", handleInteraction);
  };
}, []);
  const [audioReady, setAudioReady] = useState(false);

  // Pre-load audio voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoices = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", onVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      };
    }
  }, []);

  const stopTTS = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ------------------------------------------------------------
  // AUTOMATIC READ ALOUD TRIGGER
  // ------------------------------------------------------------
  useEffect(() => {
    if (loading) return;

    if (phase === "teach" && teaching) {
      const targetKey = teaching.visuals?.[0]?.image_key || "tile_red";
      const targetMeta = getColorMeta(targetKey);
      const tamil =
        (teaching as any)?.spoken_tamil ||
        `இதுதான் ${targetMeta.tamil}. ${targetMeta.tamil} நிறத்த தொடுங்க!`;
      const english =
        teaching.spoken_teaching || `This is ${targetMeta.en} color. Touch it!`;

      const timer = setTimeout(() => {
        speakInstruction(tamil, english);
      }, 400);
      return () => clearTimeout(timer);
    }

    if (phase === "question" && question) {
      const targetChoice = question.choices.find((c) => c.is_correct);
      const targetMeta = getColorMeta(targetChoice?.image_key || "tile_red");
      const qTamil =
        (question as any)?.spoken_tamil || `${targetMeta.tamil} நிறத்த தொடுங்க!`;
      const qEnglish =
        question.spoken_prompt || `Touch the ${targetMeta.en} color`;

      const timer = setTimeout(() => {
        speakInstruction(qTamil, qEnglish);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [phase, teaching, question, loading]);

  // ------------------------------------------------------------
  // Clinical Hesitation Timer (8s VP -> +5s C)
  // ------------------------------------------------------------
  useEffect(() => {
    if (phase !== "question") {
      setTargetPulsing(false);
      return;
    }

    let cueTimer: ReturnType<typeof setTimeout> | null = null;

    const vpTimer = setTimeout(() => {
      setScaffoldLevel((prev) => (prev === "NONE" ? "VP" : prev));
      setAudioReplayCount((c) => c + 1);

      const targetChoice = question?.choices.find((c) => c.is_correct);
      const targetMeta = getColorMeta(targetChoice?.image_key || "tile_red");
      speakInstruction(`இங்க பாருங்க, ${targetMeta.tamil} நிறத்த தொடுங்க!`, `Touch ${targetMeta.en}`);

      cueTimer = setTimeout(() => {
        setScaffoldLevel((prev) => (prev === "VP" ? "C" : prev));
        setTargetPulsing(true);
      }, 5000);
    }, 8000);

    return () => {
      clearTimeout(vpTimer);
      if (cueTimer) clearTimeout(cueTimer);
    };
  }, [phase, question]);

  // ------------------------------------------------------------
  // STAGE 1: Teach Load
  // ------------------------------------------------------------
  const loadTeaching = useCallback(async () => {
    try {
      stopTTS();
      setLoading(true);
      setError(null);
      setPhase("teach");

      setScaffoldLevel("NONE");
      setTargetPulsing(false);
      setDistractorOpacity(1.0);
      setErrorCount(0);

      const response = await jitApi.generateTeaching({
        student_id: studentId,
        unit_id: unitId ? unitId : undefined,
      });

      if (response?.adaptive?.subtopic_id && !unitId) {
        sessionStorage.setItem("unit_id", response.adaptive.subtopic_id);
      }

      if (!response?.success || !response?.teaching) {
        throw new Error("Teaching content was not returned.");
      }

      setTeaching(response.teaching);
      if (response.adaptive) setAdaptive(response.adaptive);
      startedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson.");
    } finally {
      setLoading(false);
    }
  }, [unitId, studentId, stopTTS]);

  useEffect(() => {
    void loadTeaching();
    return () => stopTTS();
  }, [loadTeaching, stopTTS]);

  // ------------------------------------------------------------
  // STAGE 2: Start Assessment
  // ------------------------------------------------------------
  const handleUnderstand = useCallback(async () => {
    try {
      stopTTS();
      setLoading(true);
      setError(null);
      setScaffoldLevel("NONE");
      setTargetPulsing(false);
      setDistractorOpacity(1.0);
      setErrorCount(0);

      const response = await jitApi.generateQuestion({
        student_id: studentId,
        unit_id: unitId,
        subtopic_id: adaptive?.subtopic_id,
      });

      if (!response?.success || !response?.activity || !response?.question_id) {
        throw new Error("Question activity was not returned.");
      }

      setQuestion(response.activity);
      setQuestionId(response.question_id);

      if (response.adaptive) {
        setAdaptive((prev) => ({
          ...prev,
          subtopic_id: response.adaptive!.subtopic_id,
          learning_objective: response.adaptive!.learning_objective,
          difficulty: response.adaptive!.difficulty,
          p_l: response.adaptive!.p_l,
        }));
      }

      startedAt.current = Date.now();
      setPhase("question");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load question.");
      setPhase("teach");
    } finally {
      setLoading(false);
    }
  }, [studentId, unitId, adaptive?.subtopic_id, stopTTS]);

  // ------------------------------------------------------------
  // Choice Click: Telemetry & Scoring
  // ------------------------------------------------------------
  const handleColorTouch = useCallback(
    async (imageKey: string, isCorrect: boolean) => {
      if (!question || !questionId || answerSubmitting || phase !== "question") return;

      const targetChoice = question.choices.find((c) => c.is_correct);
      const targetMeta = getColorMeta(targetChoice?.image_key || "tile_red");

      if (!isCorrect) {
        const nextErrors = errorCount + 1;
        setErrorCount(nextErrors);
        setSwitchCount((c) => c + 1);

        if (nextErrors === 1) {
          setTargetPulsing(true);
          setDistractorOpacity(0.5);
          setScaffoldLevel("C");
          speakInstruction(`இங்க பாருங்க, நல்லா பார்த்து ${targetMeta.tamil} நிறத்த தொடுங்க!`, `Look carefully, touch ${targetMeta.en}`);
        } else if (nextErrors === 2) {
          setTargetPulsing(true);
          setDistractorOpacity(0.2);
          setScaffoldLevel("C");
          speakInstruction(`இங்க பாருங்க, ${targetMeta.tamil} நிறத்த தொடுங்க!`, `Touch ${targetMeta.en}`);
        } else {
          setTargetPulsing(true);
          setDistractorOpacity(0.0);
          setScaffoldLevel("PP");
          speakInstruction(`இதுதான் ${targetMeta.tamil}. இத மட்டும் தொடுங்க!`, `This is ${targetMeta.en}. Touch this!`);
        }
        return;
      }

      setAnswerSubmitting(true);
      setError(null);
      const responseTime = Math.max(0, Date.now() - startedAt.current);

      const activeScaffoldPayload =
        scaffoldLevel === "PP" || distractorOpacity === 0
          ? "ELIMINATE_DISTRACTOR"
          : targetPulsing || scaffoldLevel === "C"
          ? "HIGHLIGHT_TARGET"
          : "NONE";

      try {
        const result = await jitApi.submitAnswer({
          student_id: studentId,
          question_id: questionId,
          answer: imageKey,
          response_time_ms: responseTime,
          option_switch_count: switchCount,
          audio_replay_count: audioReplayCount + (scaffoldLevel === "VP" ? 1 : 0),
          active_scaffold: activeScaffoldPayload,
        });

        if (adaptive) {
          setAdaptive({
            ...adaptive,
            p_l: result.new_mastery,
            reason: result.status,
          });
        }

        setFacpCode((result as any).facp_code || (result.correct ? "+" : "-"));
        setFeedback({
          correct: true,
          previous_mastery: result.previous_mastery,
          new_mastery: result.new_mastery,
          status: result.status,
        });

        stopTTS();
        speakInstruction("சூப்பர்! அருமையா பண்ணிட்டீங்க!", "Great job! Very well done!");
        setPhase("feedback");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission error.");
      } finally {
        setAnswerSubmitting(false);
      }
    },
    [
      question,
      questionId,
      answerSubmitting,
      phase,
      errorCount,
      switchCount,
      audioReplayCount,
      scaffoldLevel,
      targetPulsing,
      distractorOpacity,
      adaptive,
      studentId,
      stopTTS,
    ]
  );

  const stateLabel =
    phase === "teach"
      ? "TEACHING"
      : phase === "question"
      ? "ASSESSING"
      : phase === "feedback"
      ? "EVALUATED"
      : "COMPLETED";

  const targetMetaInTeach = getColorMeta(teaching?.visuals?.[0]?.image_key || "tile_red");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        fontFamily: P,
        padding: "20px 16px",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {/* Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              stopTTS();
              navigate("/learning-modules");
            }}
            style={{
              background: "none",
              border: "none",
              color: BLUE,
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← Back to Modules
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                if (phase === "teach") {
                  speakInstruction(
                    (teaching as any)?.spoken_tamil || `இதுதான் ${targetMetaInTeach.tamil}. தொடுங்க!`,
                    teaching?.spoken_teaching
                  );
                } else if (phase === "question") {
                  const targetChoice = question?.choices.find((c) => c.is_correct);
                  const targetMeta = getColorMeta(targetChoice?.image_key || "tile_red");
                  speakInstruction(
                    (question as any)?.spoken_tamil || `${targetMeta.tamil} நிறத்த தொடுங்க!`,
                    question?.spoken_prompt
                  );
                }
              }}
              style={{
                background: WHITE,
                border: `1.5px solid ${BORDER}`,
                color: BLUE,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🔊 Replay Audio
            </button>
            <span style={{ fontSize: 13, color: MUTED }}>
              Learner: <strong>{studentName}</strong>
            </span>
          </div>
        </div>

        {/* Cognitive Governor Status Bar */}
        <div
          style={{
            background: WHITE,
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: `1px solid ${BORDER}`,
            marginBottom: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT }}>
                {adaptive?.subtopic_name || "Color Identification"}
              </h3>
              <span
                style={{
                  background: LIGHT_BLUE,
                  color: BLUE,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {stateLabel}
              </span>
            </div>
            <span style={{ fontSize: 12, color: MUTED }}>
              Action: <strong>{adaptive?.reason || "INDEPENDENT_RETRIEVAL"}</strong>
            </span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: BLUE }}>
              {adaptive ? Math.round(adaptive.p_l * 100) : 20}%
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: MUTED }}>P(L) MASTERY</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: 8,
              padding: "12px",
              color: "#be123c",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div
            style={{
              background: WHITE,
              borderRadius: 10,
              padding: 40,
              textAlign: "center",
              border: `1px solid ${BORDER}`,
              color: MUTED,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>
              {phase === "question" ? "Generating next adaptive trial..." : "Loading milestone lesson..."}
            </div>
          </div>
        )}

        {/* -----------------------------------------------------
            STAGE 1: TEACHING (Sharp Edge, Bold Red, Clean Margin)
        ------------------------------------------------------ */}
        {!loading && phase === "teach" && teaching && (
          <div
            style={{
              background: WHITE,
              borderRadius: 12,
              padding: "28px 24px",
              border: `1px solid ${BORDER}`,
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                background: LIGHT_BLUE,
                color: BLUE,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              📘 LEARN FIRST
            </span>

            <h1 style={{ margin: "4px 0", color: TEXT, fontSize: 26, fontWeight: 900 }}>
              {(teaching as any)?.spoken_tamil || `இதுதான் ${targetMetaInTeach.tamil}`}
            </h1>
            <p style={{ margin: "2px 0 16px", color: MUTED, fontSize: 14, fontWeight: 600 }}>
              {targetMetaInTeach.tamil} நிறத்த தொடுங்க
            </p>

            {/* Central Solid Tile: Sharp Corners, Edge-to-Edge Visual Area */}
            <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
              <button
                type="button"
                onClick={() => void handleUnderstand()}
                style={{
                  background: "#f8fafc",
                  border: "4px solid #f59e0b",
                  borderRadius: 12,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  boxShadow: "0 0 28px rgba(245, 158, 11, 0.45)",
                }}
              >
                <RenderColorSquare
                  colorKey={teaching.visuals?.[0]?.image_key || "tile_red"}
                  isPulsing={true}
                  width={240}
                  height={240}
                />
                <div style={{ marginTop: 12, color: BLUE, fontSize: 15, fontWeight: 900 }}>
                  👆 {targetMetaInTeach.tamil} தொடுங்க!
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleUnderstand()}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 8,
                border: "none",
                background: BLUE,
                color: WHITE,
                fontFamily: P,
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(29, 78, 216, 0.25)",
              }}
            >
              I Understand → Start Assessment
            </button>
          </div>
        )}

        {/* -----------------------------------------------------
            STAGE 2: QUESTION (Sharp, Saturated Binary Tiles)
        ------------------------------------------------------ */}
        {!loading && phase === "question" && question && (
          <div
            style={{
              background: WHITE,
              borderRadius: 12,
              padding: "24px 20px",
              border: `1px solid ${BORDER}`,
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                background: LIGHT_BLUE,
                color: BLUE,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              🧩 CHOOSE THE COLOR
            </span>

            <h1 style={{ margin: "4px 0 2px", color: TEXT, fontSize: 26, fontWeight: 900 }}>
              {(question as any).spoken_tamil || question.spoken_prompt}
            </h1>
            <p style={{ margin: "0 0 16px", color: MUTED, fontSize: 14, fontWeight: 600 }}>
              சரியான நிறத்த தொடுங்க
            </p>

            {/* Exactly 2 Binary Sharp Color Squares */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 16,
                maxWidth: 580,
                margin: "0 auto",
              }}
            >
              {question.choices.slice(0, 2).map((choice) => {
                const isTarget = choice.is_correct;
                const shouldPulse = isTarget && targetPulsing;
                const currentOpacity = isTarget ? 1.0 : distractorOpacity;

                return (
                  <button
                    key={choice.image_key}
                    type="button"
                    disabled={answerSubmitting || (!isTarget && distractorOpacity === 0)}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleColorTouch(choice.image_key, choice.is_correct);
                    }}
                    style={{
                      border: shouldPulse
                        ? "5px solid #f59e0b"
                        : `2px solid ${BORDER}`,
                      background: "#f8fafc",
                      borderRadius: 10,
                      padding: 10,
                      width: "240px",
                      minHeight: "250px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: !isTarget && distractorOpacity === 0 ? "default" : "pointer",
                      opacity: currentOpacity,
                      pointerEvents: !isTarget && distractorOpacity === 0 ? "none" : "auto",
                      transition: "all 0.25s ease-in-out",
                    }}
                  >
                    <RenderColorSquare
                      colorKey={choice.image_key}
                      isPulsing={shouldPulse}
                      width={210}
                      height={210}
                    />
                  </button>
                );
              })}
            </div>

            {errorCount > 0 && (
              <div
                style={{
                  marginTop: 14,
                  background: WARNING_BG,
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: WARNING_TEXT,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                இங்க பாருங்க, நல்லா பார்த்து தொடுங்க.
              </div>
            )}
          </div>
        )}

        {/* -----------------------------------------------------
            STAGE 3: FEEDBACK & PROMOTION SCREEN
        ------------------------------------------------------ */}
        {!loading && phase === "feedback" && feedback?.correct && (
          <div
            style={{
              background: WHITE,
              borderRadius: 14,
              padding: "32px 24px",
              textAlign: "center",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 6px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 6 }}>
              {(feedback as any)?.color_curriculum_passed ? "🏆" : "🎉"}
            </div>

            <h2 style={{ margin: "0 0 6px", color: SUCCESS, fontSize: 24, fontWeight: 900 }}>
              {(feedback as any)?.color_curriculum_passed
                ? "வண்ணங்கள் தேர்ச்சி! (Color Curriculum Mastered!)"
                : (feedback as any)?.node_promoted
                ? "அடுத்த நிறம்! (Milestone Promoted!)"
                : "அருமை! (Correct!)"}
            </h2>

            <p style={{ margin: "0 0 16px", color: TEXT, fontSize: 14 }}>
              {(feedback as any)?.color_curriculum_passed
                ? "NIMH FACP Preprimary Item 12: 80% criterion reached across all colors!"
                : "You identified the color correctly."}
            </p>

            <div style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
              <span
                style={{
                  background: "#e0f2fe",
                  color: "#0369a1",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  border: "1px solid #bae6fd",
                }}
              >
                FACP Evaluation: [{facpCode}]{" "}
                {facpCode === "+"
                  ? "Independent"
                  : facpCode === "C"
                  ? "Occasional Cue"
                  : facpCode === "VP"
                  ? "Verbal Prompt"
                  : "Physical Prompt"}
              </span>
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                padding: "14px",
                marginBottom: 20,
              }}
            >
              <div style={{ color: "#166534", fontSize: 12, fontWeight: 800 }}>
                Adaptive Cognitive Mastery
              </div>
              <div style={{ marginTop: 2, color: SUCCESS, fontSize: 28, fontWeight: 900 }}>
                {Math.round(feedback.new_mastery * 100)}%
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadTeaching()}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 8,
                border: "none",
                background: BLUE,
                color: WHITE,
                fontFamily: P,
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(29, 78, 216, 0.25)",
              }}
            >
              {(feedback as any)?.color_curriculum_passed
                ? "Review Modules / Next Domain →"
                : (feedback as any)?.node_promoted
                ? "Learn Next Color Milestone →"
                : "Next Adaptive Question →"}
            </button>
          </div>
        )}
        {!audioReady && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <div
      style={{
        background: WHITE,
        borderRadius: 16,
        padding: 32,
        maxWidth: 420,
        textAlign: "center",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔊</div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, margin: "0 0 8px" }}>
        Enable Voice Assistant
      </h2>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 20px" }}>
        Tap below so the system can speak instructions in Tamil and English automatically.
      </p>
      <button
        type="button"
        onClick={() => {
          unlockAudioContext();
          setAudioReady(true);
          // Immediately speak teaching instructions
          const targetKey = teaching?.visuals?.[0]?.image_key || "tile_red";
          const meta = getColorMeta(targetKey);
          speakInstruction(
            (teaching as any)?.spoken_tamil || `இதுதான் ${meta.tamil}. தொடுங்க!`,
            teaching?.spoken_teaching || `This is ${meta.en}. Touch it!`
          );
        }}
        style={{
          width: "100%",
          padding: "16px",
          background: BLUE,
          color: WHITE,
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Start Learning 🚀
      </button>
    </div>
  </div>
)}
      </div>
    </div>
  );
}
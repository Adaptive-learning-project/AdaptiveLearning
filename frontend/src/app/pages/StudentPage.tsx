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
const BLUE = "#1565c0";
const BG = "#f5f9fd";
const WHITE = "#ffffff";
const BORDER = "#dce8f5";
const TEXT = "#0d2137";
const MUTED = "#607d8b";
const LIGHT_BLUE = "#eaf3ff";
const SUCCESS = "#16a34a";
const ERROR = "#dc2626";
const WARNING_BG = "#fff7ed";
const WARNING_TEXT = "#c2410c";

const IMAGE_BASE_PATH = "/learning/objects";

type Phase =
  | "teach"
  | "question"
  | "feedback"
  | "completed";

interface TeachingVisual {
  image_key: string;
  role: string;
}

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

export default function StudentPage() {
  const navigate = useNavigate();

  const [studentName] = useState(
    () =>
      sessionStorage.getItem("student_name") ||
      "Student"
  );

  const [studentId] = useState(
    () =>
      sessionStorage.getItem("student_id") ||
      "student_demo"
  );

  const [unitId] = useState(
    () =>
      sessionStorage.getItem("unit_id") ||
      ""
  );

  // ------------------------------------------------------------
  // Main JIT state
  // ------------------------------------------------------------

  const [phase, setPhase] =
    useState<Phase>("teach");

  const [teaching, setTeaching] =
    useState<JITTeachingContent | null>(null);

  const [question, setQuestion] =
    useState<JITVisualActivity | null>(null);

  const [questionId, setQuestionId] =
    useState<string | null>(null);

  const [adaptive, setAdaptive] =
    useState<AdaptiveInfo | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedImageKey, setSelectedImageKey] =
    useState<string | null>(null);

  const [answerSubmitting, setAnswerSubmitting] =
    useState(false);

  const [feedback, setFeedback] =
    useState<FeedbackState | null>(null);

  const [wrongAttempts, setWrongAttempts] =
    useState<Record<string, number>>({});

  const [audioReplayCount, setAudioReplayCount] =
    useState(0);

  const [switchCount, setSwitchCount] =
    useState(0);

  const startedAt = useRef<number>(
    Date.now()
  );

  // ------------------------------------------------------------
  // TTS
  // ------------------------------------------------------------

  const speak = useCallback(
    (text: string) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        !text
      ) {
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(
            text
          );

        utterance.rate = 0.86;
        utterance.pitch = 1.02;
        utterance.volume = 1;

        window.speechSynthesis.speak(
          utterance
        );
      } catch (speechError) {
        console.warn(
          "Speech synthesis unavailable:",
          speechError
        );
      }
    },
    []
  );

  const stopTTS = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ------------------------------------------------------------
  // Reset state
  // ------------------------------------------------------------

  const resetJitState = useCallback(() => {
    setTeaching(null);
    setQuestion(null);
    setQuestionId(null);
    setSelectedImageKey(null);
    setAnswerSubmitting(false);
    setFeedback(null);
    setWrongAttempts({});
    setAudioReplayCount(0);
    setSwitchCount(0);

    startedAt.current = Date.now();
  }, []);

  // ------------------------------------------------------------
  // STAGE 1
  // Backend chooses adaptive context.
  // LLM generates the teaching.
  // ------------------------------------------------------------

  const loadTeaching = useCallback(
    async () => {
      if (!unitId) {
        setError(
          "No learning unit is selected. Please choose a module first."
        );
        setLoading(false);
        return;
      }

      try {
        stopTTS();
        resetJitState();

        setLoading(true);
        setError(null);
        setPhase("teach");

        const response =
          await jitApi.generateTeaching({
            student_id: studentId,
            unit_id: unitId,
          });

        console.log(
          "FRONTEND -> BACKEND: jit-teaching",
          {
            student_id: studentId,
            unit_id: unitId,
          }
        );

        console.log(
          "BACKEND -> FRONTEND: teaching response",
          response
        );

        if (
          !response?.success ||
          !response?.teaching
        ) {
          throw new Error(
            "Teaching content was not returned by the backend."
          );
        }

        setTeaching(response.teaching);

        if (response.adaptive) {
          setAdaptive(response.adaptive);
        }

        startedAt.current = Date.now();

        speak(
          response.teaching.spoken_teaching
        );
      } catch (err) {
        console.error(
          "Teaching generation failed:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate the teaching content."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      unitId,
      studentId,
      resetJitState,
      speak,
      stopTTS,
    ]
  );

  // ------------------------------------------------------------
  // Initial load
  // ------------------------------------------------------------

  useEffect(() => {
    void loadTeaching();

    return () => {
      stopTTS();
    };
  }, [loadTeaching, stopTTS]);

  // ------------------------------------------------------------
  // STAGE 2
  // Student clicks "I Understand".
  // Backend retrieves stored teaching.
  // LLM generates the question from what was taught.
  // ------------------------------------------------------------

  const handleUnderstand = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedImageKey(null);
        setWrongAttempts({});
        setFeedback(null);
        setPhase("question");

        const response =
          await jitApi.generateQuestion({
            student_id: studentId,
            unit_id: unitId,
            subtopic_id:
              adaptive?.subtopic_id,
          });

        console.log(
          "FRONTEND -> BACKEND: jit-question",
          {
            student_id: studentId,
            unit_id: unitId,
            subtopic_id:
              adaptive?.subtopic_id,
          }
        );

        console.log(
          "BACKEND -> FRONTEND: question response",
          response
        );

        if (
          !response?.success ||
          !response?.activity ||
          !response?.question_id
        ) {
          throw new Error(
            "Question content was not returned by the backend."
          );
        }

        setQuestion(
          response.activity
        );

        setQuestionId(
          response.question_id
        );

        if (response.adaptive) {
          setAdaptive(
            (previous) => ({
              ...previous,
              subtopic_id:
                response.adaptive!.subtopic_id,
              learning_objective:
                response.adaptive!
                  .learning_objective,
              difficulty:
                response.adaptive!
                  .difficulty,
              p_l:
                response.adaptive!.p_l,
            })
          );
        }

        startedAt.current = Date.now();

        speak(
          response.activity.spoken_prompt
        );

        setPhase("question");
      } catch (err) {
        console.error(
          "Question generation failed:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate the question."
        );

        setPhase("teach");
      } finally {
        setLoading(false);
      }
    },
    [
      studentId,
      unitId,
      adaptive?.subtopic_id,
      speak,
    ]
  );

  // ------------------------------------------------------------
  // Wrong answer fade
  // Each wrong touch reduces opacity by exactly 20 percentage points:
  // 0 = 100%
  // 1 = 80%
  // 2 = 60%
  // 3 = 40%
  // 4 = 20%
  // 5 = 0%
  // ------------------------------------------------------------

  function getOpacity(
    imageKey: string
  ): number {
    const attempts =
      wrongAttempts[imageKey] ?? 0;

    return Math.max(
      0,
      1 - attempts * 0.2
    );
  }

  function isFadedOut(
    imageKey: string
  ): boolean {
    return (
      (wrongAttempts[imageKey] ?? 0) >= 5
    );
  }

  // ------------------------------------------------------------
  // STAGE 3
  // Touch image -> backend answer grading -> BKT.
  // ------------------------------------------------------------

  const handleImageTouch = useCallback(
    async (
      imageKey: string
    ) => {
      if (
        !question ||
        !questionId ||
        answerSubmitting ||
        phase !== "question" ||
        isFadedOut(imageKey)
      ) {
        return;
      }

      // Track option switching.
      if (
        selectedImageKey &&
        selectedImageKey !== imageKey
      ) {
        setSwitchCount(
          (previous) => previous + 1
        );
      }

      setSelectedImageKey(imageKey);
      setAnswerSubmitting(true);
      setError(null);

      const responseTime =
        Math.max(
          0,
          Date.now() -
            startedAt.current
        );

      try {
        const result =
          await jitApi.submitAnswer({
            student_id: studentId,
            question_id: questionId,
            answer: imageKey,
            response_time_ms:
              responseTime,
            option_switch_count:
              switchCount,
            audio_replay_count:
              audioReplayCount,
            active_scaffold: "NONE",
          });

        console.log(
          "FRONTEND -> BACKEND: /api/submit",
          {
            student_id: studentId,
            question_id: questionId,
            answer: imageKey,
          }
        );

        console.log(
          "BACKEND -> FRONTEND: BKT result",
          result
        );

        setFeedback({
          correct: result.correct,
          previous_mastery:
            result.previous_mastery,
          new_mastery:
            result.new_mastery,
          status: result.status,
        });

        if (result.correct) {
          stopTTS();

          speak(
            "Correct! Great job."
          );

          setPhase("feedback");
          return;
        }

        // Backend says it is wrong.
        // Fade the selected image and let the learner try another.
        setWrongAttempts(
          (previous) => ({
            ...previous,
            [imageKey]:
              (previous[imageKey] ?? 0) +
              1,
          })
        );

        // Keep the same question active for another attempt.
        // Only the incorrect picture fades.
        setSelectedImageKey(null);
        setPhase("question");

        speak(
          "Not quite. Try another picture."
        );
      } catch (err) {
        console.error(
          "Answer submission failed:",
          err
        );

        setSelectedImageKey(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to evaluate the answer."
        );
      } finally {
        setAnswerSubmitting(false);
      }
    },
    [
      question,
      questionId,
      answerSubmitting,
      phase,
      selectedImageKey,
      switchCount,
      audioReplayCount,
      studentId,
      speak,
      stopTTS,
    ]
  );

  // ------------------------------------------------------------
  // Header status
  // ------------------------------------------------------------

  const stateColor =
    feedback?.correct
      ? SUCCESS
      : ERROR;

  const stateLabel =
    phase === "teach"
      ? "TEACHING"
      : phase === "question"
        ? "ASSESSING"
        : phase === "feedback"
          ? "EVALUATED"
          : "COMPLETED";

  // ------------------------------------------------------------
  // MAIN UI
  // ------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        fontFamily: P,
        padding: "28px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        {/* Navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              stopTTS();
              navigate(
                "/learning-modules"
              );
            }}
            style={{
              background: "none",
              border: "none",
              color: BLUE,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
              padding: 0,
            }}
          >
            ← Back to Modules
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                const textToSpeak =
                  phase === "teach"
                    ? teaching
                        ?.spoken_teaching
                    : question
                        ?.spoken_prompt;

                if (textToSpeak) {
                  setAudioReplayCount(
                    (count) =>
                      count + 1
                  );

                  speak(textToSpeak);
                }
              }}
              style={{
                background:
                  LIGHT_BLUE,
                border:
                  `1px solid ${BORDER}`,
                color: BLUE,
                borderRadius: 10,
                padding:
                  "7px 12px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔊 Read Aloud
            </button>

            <span
              style={{
                fontSize: 12,
                color: MUTED,
              }}
            >
              Learner:{" "}
              <strong>
                {studentName}
              </strong>
            </span>
          </div>
        </div>

        {/* Governor monitor */}
        <div
          style={{
            background: WHITE,
            borderRadius: 20,
            padding:
              "18px 24px",
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            border:
              `1px solid ${BORDER}`,
            marginBottom: 20,
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.02)",
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
                marginBottom: 4,
                flexWrap:
                  "wrap",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 800,
                  color: TEXT,
                }}
              >
                {adaptive
                  ?.subtopic_name ||
                  "Learning Concept"}
              </h3>

              <span
                style={{
                  background:
                    `${BLUE}15`,
                  color: BLUE,
                  padding:
                    "4px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {stateLabel}
              </span>
            </div>

            <span
              style={{
                fontSize: 13,
                color: MUTED,
              }}
            >
              Governor Action:{" "}
              <strong>
                {adaptive?.reason ||
                  "EVALUATING"}
              </strong>
            </span>
          </div>

          <div
            style={{
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: BLUE,
              }}
            >
              {adaptive
                ? Math.round(
                    adaptive.p_l * 100
                  )
                : 20}
              %
            </div>

            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: MUTED,
                letterSpacing: 0.5,
              }}
            >
              P(L) MASTERY
            </span>
          </div>
        </div>

        {/* Backend/LLM errors */}
        {error && (
          <div
            style={{
              background:
                "#fff7f7",
              border:
                "1px solid #fecaca",
              borderRadius: 16,
              padding:
                "12px 16px",
              marginBottom: 18,
              color: ERROR,
              fontSize: 13,
              fontWeight: 600,
              wordBreak:
                "break-word",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              background:
                WHITE,
              borderRadius: 20,
              padding: 40,
              textAlign:
                "center",
              border:
                `1px solid ${BORDER}`,
              color: MUTED,
            }}
          >
            <div
              style={{
                fontSize: 42,
                marginBottom: 10,
              }}
            >
              🧠
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: TEXT,
              }}
            >
              {phase ===
              "question"
                ? "Creating your question..."
                : "Teaching you the concept..."}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
              }}
            >
              The adaptive learning engine
              is preparing your activity.
            </div>
          </div>
        )}

        {/* -----------------------------------------------------
            STAGE 1 — TEACH
        ------------------------------------------------------ */}
        {!loading &&
          phase === "teach" &&
          teaching && (
            <div
              style={{
                background:
                  WHITE,
                borderRadius: 22,
                padding: 30,
                border:
                  `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
                  marginBottom: 22,
                }}
              >
                <span
                  style={{
                    display:
                      "inline-flex",
                    padding:
                      "7px 12px",
                    background:
                      LIGHT_BLUE,
                    color: BLUE,
                    borderRadius:
                      999,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  📘 FIRST — LEARN
                </span>

                <h1
                  style={{
                    margin:
                      "14px 0 8px",
                    color: TEXT,
                    fontSize: 25,
                    fontWeight: 800,
                  }}
                >
                  Let&apos;s learn this first
                </h1>

                <p
                  style={{
                    margin: 0,
                    color: MUTED,
                    fontSize: 14,
                  }}
                >
                  Look at the pictures and
                  listen to the explanation.
                </p>
              </div>

              {/* LLM teaching text */}
              <div
                style={{
                  background:
                    LIGHT_BLUE,
                  border:
                    `1px solid ${BORDER}`,
                  borderRadius: 16,
                  padding:
                    "18px 20px",
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 25,
                  }}
                >
                  🗣️
                </div>

                <div
                  style={{
                    flex: 1,
                    color: TEXT,
                    fontSize: 18,
                    lineHeight: 1.55,
                    fontWeight: 700,
                  }}
                >
                  {
                    teaching.spoken_teaching
                  }
                </div>

                <button
                  type="button"
                  aria-label="Replay teaching"
                  onClick={() => {
                    setAudioReplayCount(
                      (count) =>
                        count + 1
                    );

                    speak(
                      teaching.spoken_teaching
                    );
                  }}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border:
                      `1px solid ${BORDER}`,
                    background:
                      WHITE,
                    color: BLUE,
                    fontSize: 18,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  🔊
                </button>
              </div>

              {/* LLM-selected teaching images */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 16,
                }}
              >
                {teaching.visuals.map(
                  (
                    visual: TeachingVisual
                  ) => (
                    <div
                      key={
                        visual.image_key
                      }
                      style={{
                        background:
                          BG,
                        border:
                          `1px solid ${BORDER}`,
                        borderRadius: 18,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          height: 220,
                          background:
                            WHITE,
                          borderRadius: 14,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          overflow:
                            "hidden",
                        }}
                      >
                        <img
                          src={`${IMAGE_BASE_PATH}/${visual.image_key}.png`}
                          alt={visual.image_key.replaceAll(
                            "_",
                            " "
                          )}
                          draggable={
                            false
                          }
                          style={{
                            width: 190,
                            height: 190,
                            objectFit:
                              "contain",
                          }}
                          onError={(
                            event
                          ) => {
                            console.error(
                              "Teaching image not found:",
                              visual.image_key
                            );

                            event.currentTarget.style.opacity =
                              "0.15";
                          }}
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 9,
                          textAlign:
                            "center",
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {visual.role}
                      </div>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleUnderstand();
                }}
                style={{
                  width: "100%",
                  marginTop: 22,
                  padding:
                    "15px 18px",
                  borderRadius: 14,
                  border: "none",
                  background: BLUE,
                  color: WHITE,
                  fontFamily: P,
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                I Understand → Show Me a Question
              </button>
            </div>
          )}

        {/* -----------------------------------------------------
            STAGE 2 — IMAGE QUESTION
        ------------------------------------------------------ */}
        {!loading &&
          phase === "question" &&
          question && (
            <div
              style={{
                background:
                  WHITE,
                borderRadius: 22,
                padding: 30,
                border:
                  `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
                  marginBottom: 22,
                }}
              >
                <span
                  style={{
                    display:
                      "inline-flex",
                    padding:
                      "7px 12px",
                    background:
                      LIGHT_BLUE,
                    color: BLUE,
                    borderRadius:
                      999,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  🧩 SECOND — TRY IT
                </span>

                <div
                  style={{
                    fontSize: 40,
                    marginTop: 10,
                  }}
                >
                  👆
                </div>

                <h1
                  style={{
                    margin:
                      "6px 0 8px",
                    color: TEXT,
                    fontSize: 24,
                    fontWeight: 800,
                  }}
                >
                  {
                    question.spoken_prompt
                  }
                </h1>

                <p
                  style={{
                    margin: 0,
                    color: MUTED,
                    fontSize: 14,
                  }}
                >
                  Touch the correct picture.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 18,
                  maxWidth: 620,
                  margin:
                    "0 auto",
                }}
              >
                {question.choices.map(
                  (choice) => {
                    const attempts =
                      wrongAttempts[
                        choice.image_key
                      ] ?? 0;

                    const faded =
                      isFadedOut(
                        choice.image_key
                      );

                    const selected =
                      selectedImageKey ===
                      choice.image_key;

                    const borderColor =
                      selected &&
                      choice.is_correct
                        ? SUCCESS
                        : selected
                          ? ERROR
                          : BORDER;

                    const background =
                      selected &&
                      choice.is_correct
                        ? "#f0fdf4"
                        : selected
                          ? "#fef2f2"
                          : WHITE;

                    return (
                      <button
                        key={
                          choice.image_key
                        }
                        type="button"
                        disabled={
                          faded ||
                          answerSubmitting
                        }
                        onClick={() => {
                          void handleImageTouch(
                            choice.image_key
                          );
                        }}
                        style={{
                          border:
                            `3px solid ${borderColor}`,
                          background,
                          borderRadius: 20,
                          padding: 12,
                          minHeight: 280,
                          cursor:
                            faded ||
                            answerSubmitting
                              ? "default"
                              : "pointer",
                          opacity:
                            getOpacity(
                              choice.image_key
                            ),
                          transition:
                            "all 0.25s ease",
                          boxShadow:
                            "0 3px 14px rgba(13,33,55,0.06)",
                          fontFamily: P,
                        }}
                      >
                        <div
                          style={{
                            minHeight: 225,
                            borderRadius: 15,
                            background: BG,
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            overflow:
                              "hidden",
                          }}
                        >
                          <img
                            src={`${IMAGE_BASE_PATH}/${choice.image_key}.png`}
                            alt={choice.image_key.replaceAll(
                              "_",
                              " "
                            )}
                            draggable={
                              false
                            }
                            style={{
                              width: 195,
                              height: 195,
                              objectFit:
                                "contain",
                            }}
                            onError={(
                              event
                            ) => {
                              console.error(
                                "Question image not found:",
                                choice.image_key
                              );

                              event.currentTarget.style.opacity =
                                "0.15";
                            }}
                          />
                        </div>

                        {selected &&
                          answerSubmitting && (
                            <div
                              style={{
                                marginTop: 10,
                                color: MUTED,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              Checking...
                            </div>
                          )}

                        {attempts > 0 &&
                          !answerSubmitting && (
                            <div
                              style={{
                                marginTop: 10,
                                color: MUTED,
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              Try another picture
                            </div>
                          )}
                      </button>
                    );
                  }
                )}
              </div>

              {feedback &&
                !feedback.correct && (
                  <div
                    style={{
                      marginTop: 20,
                      background:
                        WARNING_BG,
                      border:
                        "1px solid #fed7aa",
                      borderRadius: 15,
                      padding:
                        "14px 16px",
                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        color:
                          WARNING_TEXT,
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      Not quite. Try another picture.
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        color: MUTED,
                        fontSize: 12,
                      }}
                    >
                      Mastery updated by the
                      adaptive engine.
                    </div>
                  </div>
                )}

              {question.choices.every(
                (choice) =>
                  isFadedOut(
                    choice.image_key
                  )
              ) && (
                <div
                  style={{
                    marginTop: 20,
                    background:
                      LIGHT_BLUE,
                    border:
                      `1px solid ${BORDER}`,
                    borderRadius: 16,
                    padding:
                      "16px 18px",
                    textAlign:
                      "center",
                  }}
                >
                  <div
                    style={{
                      color: TEXT,
                      fontSize: 15,
                      fontWeight: 800,
                    }}
                  >
                    Let&apos;s learn this concept
                    again.
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void loadTeaching();
                    }}
                    style={{
                      marginTop: 12,
                      padding:
                        "11px 18px",
                      borderRadius: 12,
                      border: "none",
                      background:
                        BLUE,
                      color:
                        WHITE,
                      fontFamily: P,
                      fontSize: 14,
                      fontWeight: 800,
                      cursor:
                        "pointer",
                    }}
                  >
                    Learn Again →
                  </button>
                </div>
              )}
            </div>
          )}

        {/* -----------------------------------------------------
            STAGE 3 — SUCCESS / BKT RESULT
        ------------------------------------------------------ */}
        {!loading &&
          phase === "feedback" &&
          feedback?.correct && (
            <div
              style={{
                background:
                  WHITE,
                borderRadius: 22,
                padding: 34,
                textAlign:
                  "center",
                border:
                  `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  marginBottom: 10,
                }}
              >
                🎉
              </div>

              <h2
                style={{
                  margin:
                    "0 0 8px",
                  color: SUCCESS,
                  fontSize: 23,
                  fontWeight: 800,
                }}
              >
                Correct!
              </h2>

              <p
                style={{
                  margin:
                    "0 0 20px",
                  color: TEXT,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                You learned the concept and
                answered the picture question
                correctly.
              </p>

              <div
                style={{
                  background:
                    "#f0fdf4",
                  border:
                    "1px solid #bbf7d0",
                  borderRadius:
                    16,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    color:
                      "#166534",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Previous Mastery
                </div>

                <div
                  style={{
                    marginTop: 2,
                    color: SUCCESS,
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  {Math.round(
                    feedback.previous_mastery *
                      100
                  )}
                  %
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color:
                      "#166534",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  New Mastery
                </div>

                <div
                  style={{
                    marginTop: 2,
                    color: SUCCESS,
                    fontSize: 22,
                    fontWeight: 900,
                  }}
                >
                  {Math.round(
                    feedback.new_mastery *
                      100
                  )}
                  %
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadTeaching();
                }}
                style={{
                  width: "100%",
                  padding:
                    "15px 18px",
                  borderRadius: 14,
                  border: "none",
                  background:
                    BLUE,
                  color:
                    WHITE,
                  fontFamily: P,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor:
                    "pointer",
                }}
              >
                Next Adaptive Lesson →
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

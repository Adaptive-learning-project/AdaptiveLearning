import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  jitApi,
  type JITTeachingContent,
  type JITVisualActivity,
} from "../api/adaptiveApi";

interface JITVisualActivityGameProps {
  onScore?: (score: number) => void;
  studentId: string;
  unitId: string;
  subtopicId?: string;
}

// Match StudentPage visual system.
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

type Phase = "teach" | "question" | "completed";

export default function JITVisualActivityGame({
  onScore,
  studentId,
  unitId,
  subtopicId,
}: JITVisualActivityGameProps) {
  const [phase, setPhase] =
    useState<Phase>("teach");

  const [teaching, setTeaching] =
    useState<JITTeachingContent | null>(null);

  const [activity, setActivity] =
    useState<JITVisualActivity | null>(null);

  const [questionId, setQuestionId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedKey, setSelectedKey] =
    useState<string | null>(null);

  const [completed, setCompleted] =
    useState(false);

  const [answerSubmitting, setAnswerSubmitting] =
    useState(false);

  const [wrongAttempts, setWrongAttempts] =
    useState<Record<string, number>>({});

  const [lastWrongKey, setLastWrongKey] =
    useState<string | null>(null);

  const [masteryAfter, setMasteryAfter] =
    useState<number | null>(null);

  const [answerStatus, setAnswerStatus] =
    useState<string | null>(null);

  const [audioReplayCount, setAudioReplayCount] =
    useState(0);

  const teachingStartedAt =
    useRef<number>(Date.now());

  // ------------------------------------------------------------
  // Speak teaching content
  // ------------------------------------------------------------

  const speakTeaching = useCallback(
    (text: string) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const utterance =
          new SpeechSynthesisUtterance(text);

        utterance.rate = 0.85;
        utterance.pitch = 1;
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

  // ------------------------------------------------------------
  // Stage 1: request teaching from backend
  // ------------------------------------------------------------

  const loadTeaching = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPhase("teach");

      setTeaching(null);
      setActivity(null);
      setQuestionId(null);
      setSelectedKey(null);
      setCompleted(false);
      setWrongAttempts({});
      setLastWrongKey(null);
      setMasteryAfter(null);
      setAnswerStatus(null);
      setAudioReplayCount(0);

      teachingStartedAt.current =
        Date.now();

      const response =
        await jitApi.generateTeaching({
          student_id: studentId,
          unit_id: unitId,
          subtopic_id: subtopicId,
        });

      console.log(
        "JIT TEACHING RESPONSE:",
        response
      );

      if (
        !response ||
        !response.success ||
        !response.teaching
      ) {
        throw new Error(
          "Invalid teaching response received from backend."
        );
      }

      setTeaching(response.teaching);

      // Automatically speak the lesson once it is loaded.
      speakTeaching(
        response.teaching.spoken_teaching
      );
    } catch (err) {
      console.error(
        "JIT teaching generation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to prepare the lesson."
      );
    } finally {
      setLoading(false);
    }
  }, [
    studentId,
    unitId,
    subtopicId,
    speakTeaching,
  ]);

  useEffect(() => {
    void loadTeaching();

    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, [loadTeaching]);

  // ------------------------------------------------------------
  // Stage 2: "I Understand" -> request question
  // ------------------------------------------------------------

  const handleUnderstand = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await jitApi.generateQuestion({
            student_id: studentId,
            unit_id: unitId,
            subtopic_id: subtopicId,
          });

        console.log(
          "JIT QUESTION RESPONSE:",
          response
        );

        if (
          !response ||
          !response.success ||
          !response.activity ||
          !response.question_id
        ) {
          throw new Error(
            "Invalid question response received from backend."
          );
        }

        setActivity(response.activity);
        setQuestionId(
          response.question_id
        );
        setSelectedKey(null);
        setWrongAttempts({});
        setLastWrongKey(null);
        setAnswerStatus(null);
        setMasteryAfter(null);
        setCompleted(false);
        setPhase("question");
      } catch (err) {
        console.error(
          "JIT question generation error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate the question."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      studentId,
      unitId,
      subtopicId,
    ]
  );

  // ------------------------------------------------------------
  // Wrong-answer opacity
  // ------------------------------------------------------------

  function getOpacity(
    imageKey: string
  ): number {
    const attempts =
      wrongAttempts[imageKey] ?? 0;

    return Math.max(
      0,
      1 - attempts * 0.4
    );
  }

  function isFadedOut(
    imageKey: string
  ): boolean {
    return (
      (wrongAttempts[imageKey] ?? 0) >= 3
    );
  }

  // ------------------------------------------------------------
  // Stage 3: submit image_key -> backend -> BKT
  // ------------------------------------------------------------

  const handleChoice = useCallback(
    async (
      imageKey: string,
      isCorrectFromGeneratedActivity: boolean
    ) => {
      if (
        completed ||
        answerSubmitting ||
        !questionId
      ) {
        return;
      }

      if (isFadedOut(imageKey)) {
        return;
      }

      setSelectedKey(imageKey);
      setAnswerSubmitting(true);
      setError(null);

      const responseTime =
        Math.max(
          0,
          Date.now() -
            teachingStartedAt.current
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
              0,
            audio_replay_count:
              audioReplayCount,
            active_scaffold: "NONE",
          });

        console.log(
          "JIT ANSWER / BKT RESPONSE:",
          result
        );

        setMasteryAfter(
          result.new_mastery
        );

        setAnswerStatus(
          result.status
        );

        // Backend is the source of truth for correctness.
        if (result.correct) {
          setCompleted(true);
          setPhase("completed");
          setLastWrongKey(null);

          onScore?.(1);

          return;
        }

        // Keep the adaptive retry UI, but only fade the image after
        // the backend confirms the answer was wrong.
        setLastWrongKey(imageKey);

        setWrongAttempts(
          (previous) => ({
            ...previous,
            [imageKey]:
              (previous[imageKey] ?? 0) +
              1,
          })
        );

        // The frontend-generated flag is only used as a debug warning.
        // It never overrides backend grading.
        if (isCorrectFromGeneratedActivity) {
          console.warn(
            "Backend marked an activity option as incorrect even though the generated payload marked it correct."
          );
        }
      } catch (err) {
        console.error(
          "JIT answer submission error:",
          err
        );

        setSelectedKey(null);

        setError(
          err instanceof Error
            ? err.message
            : "Could not submit your answer."
        );
      } finally {
        setAnswerSubmitting(false);
      }
    },
    [
      completed,
      answerSubmitting,
      questionId,
      audioReplayCount,
      studentId,
      onScore,
    ]
  );

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          padding: "30px 0",
          fontFamily: P,
          textAlign: "center",
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
            fontWeight: 700,
            color: TEXT,
          }}
        >
          {phase === "teach"
            ? "Preparing your lesson..."
            : "Creating your question..."}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: MUTED,
          }}
        >
          Please wait a moment.
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Error
  // ------------------------------------------------------------

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          background: "#fff7f7",
          border: "1px solid #fecaca",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
          fontFamily: P,
        }}
      >
        <div
          style={{
            fontSize: 38,
            marginBottom: 8,
          }}
        >
          ⚠️
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            color: ERROR,
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          Activity could not be loaded
        </h3>

        <p
          style={{
            margin: 0,
            color: MUTED,
            fontSize: 13,
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          {error}
        </p>

        <button
          type="button"
          onClick={() => {
            if (phase === "question") {
              void handleUnderstand();
            } else {
              void loadTeaching();
            }
          }}
          style={{
            marginTop: 18,
            padding: "11px 18px",
            borderRadius: 12,
            border: "none",
            background: BLUE,
            color: WHITE,
            fontFamily: P,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------
  // TEACHING SCREEN
  // ------------------------------------------------------------

  if (phase === "teach" && teaching) {
    return (
      <div
        style={{
          width: "100%",
          fontFamily: P,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              background: LIGHT_BLUE,
              borderRadius: 999,
              color: BLUE,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            📘 LEARN
          </div>

          <h2
            style={{
              margin: "14px 0 8px",
              color: TEXT,
              fontSize: 24,
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            Let&apos;s learn this first
          </h2>

          <p
            style={{
              margin: 0,
              color: MUTED,
              fontSize: 14,
            }}
          >
            Listen and look at the pictures.
          </p>
        </div>

        <div
          style={{
            maxWidth: 620,
            margin: "0 auto",
            background: WHITE,
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            padding: 22,
            boxShadow:
              "0 4px 18px rgba(13,33,55,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 14,
                background: LIGHT_BLUE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              🗣️
            </div>

            <div
              style={{
                flex: 1,
                color: TEXT,
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1.55,
              }}
            >
              {teaching.spoken_teaching}
            </div>

            <button
              type="button"
              onClick={() => {
                setAudioReplayCount(
                  (count) => count + 1
                );

                speakTeaching(
                  teaching.spoken_teaching
                );
              }}
              aria-label="Play teaching audio"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: WHITE,
                color: BLUE,
                cursor: "pointer",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              🔊
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginTop: 22,
            }}
          >
            {teaching.visuals.map(
              (visual) => (
                <div
                  key={visual.image_key}
                  style={{
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 16,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      height: 190,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      background: WHITE,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={`${IMAGE_BASE_PATH}/${visual.image_key}.png`}
                      alt={visual.image_key.replaceAll(
                        "_",
                        " "
                      )}
                      draggable={false}
                      style={{
                        width: 165,
                        height: 165,
                        objectFit: "contain",
                      }}
                      onError={(event) => {
                        console.error(
                          "Teaching image failed to load:",
                          visual.image_key
                        );

                        event.currentTarget.style.opacity =
                          "0";
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      textAlign: "center",
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: 600,
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
              padding: "14px 18px",
              borderRadius: 14,
              border: "none",
              background: BLUE,
              color: WHITE,
              fontFamily: P,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            I Understand →
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // QUESTION SCREEN
  // ------------------------------------------------------------

  if (
    phase === "question" &&
    activity
  ) {
    const allChoicesFaded =
      activity.choices.every(
        (choice) =>
          isFadedOut(choice.image_key)
      );

    return (
      <div
        style={{
          width: "100%",
          fontFamily: P,
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              background: LIGHT_BLUE,
              borderRadius: 999,
              color: BLUE,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            🧩 TRY IT
          </div>

          <div
            style={{
              fontSize: 42,
              marginTop: 10,
            }}
          >
            👆
          </div>

          <h2
            style={{
              margin: "8px 0 8px",
              color: TEXT,
              fontSize: 24,
              fontWeight: 800,
              lineHeight: 1.35,
            }}
          >
            {activity.spoken_prompt}
          </h2>

          <p
            style={{
              margin: 0,
              color: MUTED,
              fontSize: 14,
            }}
          >
            Choose the correct picture
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          {activity.choices.map(
            (choice) => {
              const attempts =
                wrongAttempts[
                  choice.image_key
                ] ?? 0;

              const opacity =
                getOpacity(
                  choice.image_key
                );

              const faded =
                isFadedOut(
                  choice.image_key
                );

              const selected =
                selectedKey ===
                choice.image_key;

              const correctSelected =
                completed &&
                selected &&
                choice.is_correct;

              const wrongSelected =
                !completed &&
                selected &&
                !choice.is_correct;

              let border = BORDER;
              let background = WHITE;

              if (correctSelected) {
                border = SUCCESS;
                background = "#f0fdf4";
              } else if (wrongSelected) {
                border = ERROR;
                background = "#fef2f2";
              }

              return (
                <button
                  key={choice.image_key}
                  type="button"
                  disabled={
                    completed ||
                    faded ||
                    answerSubmitting
                  }
                  onClick={() => {
                    void handleChoice(
                      choice.image_key,
                      choice.is_correct
                    );
                  }}
                  style={{
                    width: "100%",
                    border: `2px solid ${border}`,
                    background,
                    borderRadius: 18,
                    padding: 14,
                    cursor:
                      completed ||
                      faded ||
                      answerSubmitting
                        ? "default"
                        : "pointer",
                    opacity,
                    transition:
                      "opacity 0.35s ease, border-color 0.2s ease, background 0.2s ease",
                    boxShadow:
                      "0 2px 10px rgba(13,33,55,0.05)",
                    fontFamily: P,
                  }}
                >
                  <div
                    style={{
                      minHeight: 210,
                      borderRadius: 14,
                      background: BG,
                      border:
                        `1px solid ${BORDER}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={`${IMAGE_BASE_PATH}/${choice.image_key}.png`}
                      alt={choice.image_key.replaceAll(
                        "_",
                        " "
                      )}
                      draggable={false}
                      style={{
                        width: 180,
                        height: 180,
                        objectFit: "contain",
                      }}
                      onError={(event) => {
                        console.error(
                          "Question image failed to load:",
                          choice.image_key
                        );

                        event.currentTarget.style.opacity =
                          "0";
                      }}
                    />
                  </div>

                  {correctSelected && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 28,
                      }}
                    >
                      ✅
                    </div>
                  )}

                  {wrongSelected && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 28,
                      }}
                    >
                      ❌
                    </div>
                  )}

                  {attempts > 0 &&
                    !completed && (
                      <div
                        style={{
                          marginTop: 8,
                          color: MUTED,
                          fontSize: 12,
                          fontWeight: 600,
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

        {answerSubmitting && (
          <div
            style={{
              marginTop: 14,
              textAlign: "center",
              color: MUTED,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Checking your answer...
          </div>
        )}

        {!completed &&
          lastWrongKey && (
            <div
              style={{
                marginTop: 18,
                background: WARNING_BG,
                border:
                  "1px solid #fed7aa",
                borderRadius: 14,
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: WARNING_TEXT,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Not quite. Try another picture.
              </span>
            </div>
          )}

        {!completed &&
          allChoicesFaded && (
            <div
              style={{
                marginTop: 20,
                background: LIGHT_BLUE,
                border:
                  `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: "16px 18px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: TEXT,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Let&apos;s learn it again.
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadTeaching();
                }}
                style={{
                  marginTop: 12,
                  padding: "11px 18px",
                  borderRadius: 12,
                  border: "none",
                  background: BLUE,
                  color: WHITE,
                  fontFamily: P,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Learn Again →
              </button>
            </div>
          )}
      </div>
    );
  }

  // ------------------------------------------------------------
  // COMPLETED SCREEN
  // ------------------------------------------------------------

  return (
    <div
      style={{
        width: "100%",
        fontFamily: P,
      }}
    >
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 18,
          padding: "24px 20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        >
          🎉
        </div>

        <div
          style={{
            color: SUCCESS,
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          Great job!
        </div>

        <div
          style={{
            marginTop: 5,
            color: "#166534",
            fontSize: 14,
          }}
        >
          You learned the concept and answered
          the question correctly.
        </div>

        {masteryAfter !== null && (
          <div
            style={{
              marginTop: 10,
              color: "#166534",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Mastery:{" "}
            {Math.round(
              masteryAfter * 100
            )}
            %
          </div>
        )}

        {answerStatus && (
          <div
            style={{
              marginTop: 4,
              color: "#166534",
              fontSize: 12,
            }}
          >
            {answerStatus}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            void loadTeaching();
          }}
          style={{
            marginTop: 16,
            padding: "12px 20px",
            borderRadius: 12,
            border: "none",
            background: BLUE,
            color: WHITE,
            fontFamily: P,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Next Activity →
        </button>
      </div>
    </div>
  );
}

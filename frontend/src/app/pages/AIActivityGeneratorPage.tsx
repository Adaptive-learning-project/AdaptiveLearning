import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";

const PURPLE = "#8B5CF6";
const CYAN = "#06B6D4";
const GREEN = "#22C55E";
const PINK = "#F472B6";
const ORANGE = "#F97316";
const DARK = "#E2E8F0";
const MUTED = "#94A3B8";

/* =========================================================
   GALAXY CSS
========================================================= */

const galaxyCSS = `
@keyframes float {
  0%,100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulseGlow {
  0%,100% {
    box-shadow: 0 0 10px rgba(139,92,246,.15);
  }
  50% {
    box-shadow: 0 0 35px rgba(139,92,246,.4);
  }
}

@keyframes rotatePlanet {
  0% {
    transform: rotate(-5deg);
  }
  50% {
    transform: rotate(5deg);
  }
  100% {
    transform: rotate(-5deg);
  }
}

@keyframes scan {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(500%);
  }
}

.ai-core {
  animation: float 4s ease-in-out infinite,
             pulseGlow 3s ease-in-out infinite;
}

.planet {
  animation: rotatePlanet 5s ease-in-out infinite;
}

.ai-scan {
  animation: scan 2s linear infinite;
}
`;

/* =========================================================
   STAR BACKGROUND
========================================================= */

function Stars() {
  const stars = [
    ["5%", "10%"],
    ["12%", "70%"],
    ["20%", "25%"],
    ["30%", "80%"],
    ["42%", "12%"],
    ["55%", "65%"],
    ["67%", "20%"],
    ["78%", "78%"],
    ["88%", "12%"],
    ["94%", "55%"],
    ["35%", "45%"],
    ["72%", "45%"],
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {stars.map(([left, top], i) => (
        <motion.span
          key={i}
          animate={{
            opacity: [0.15, 0.8, 0.15],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2 + i * 0.25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            left,
            top,
            color: i % 2 === 0 ? "#A78BFA" : "#67E8F9",
            fontSize: i % 3 === 0 ? 15 : 9,
          }}
        >
          {i % 2 === 0 ? "✦" : "✧"}
        </motion.span>
      ))}
    </div>
  );
}

/* =========================================================
   DIFFICULTY
========================================================= */

function DifficultyToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = [
    {
      name: "Easy",
      icon: "🌱",
      color: GREEN,
    },
    {
      name: "Medium",
      icon: "🚀",
      color: CYAN,
    },
    {
      name: "Hard",
      icon: "🔥",
      color: PINK,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8,
      }}
    >
      {options.map((option) => {
        const active = value === option.name;

        return (
          <motion.button
            key={option.name}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(option.name)}
            style={{
              padding: "10px 5px",
              borderRadius: 13,
              border: active
                ? `1px solid ${option.color}`
                : "1px solid rgba(148,163,184,.15)",
              background: active
                ? `${option.color}18`
                : "rgba(255,255,255,.035)",
              color: active ? option.color : MUTED,
              cursor: "pointer",
              fontFamily: P,
            }}
          >
            <div style={{ fontSize: 17 }}>{option.icon}</div>

            <div
              style={{
                marginTop: 3,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {option.name}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* =========================================================
   ACTIVITY CHIPS
========================================================= */

function ActivityChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const types = [
    ["Flashcards", "🃏"],
    ["Quiz", "🧠"],
    ["Story", "📖"],
    ["Matching Game", "🧩"],
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
      }}
    >
      {types.map(([name, icon]) => {
        const active = selected.includes(name);

        return (
          <motion.button
            key={name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onToggle(name)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 11px",
              borderRadius: 13,
              border: active
                ? `1px solid ${PURPLE}`
                : "1px solid rgba(148,163,184,.13)",
              background: active
                ? "rgba(139,92,246,.13)"
                : "rgba(255,255,255,.035)",
              color: active ? "#C4B5FD" : MUTED,
              cursor: "pointer",
              fontFamily: P,
              fontSize: 14,
              fontWeight: 700,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>

            <span style={{ flex: 1 }}>{name}</span>

            {active && (
              <span
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: "50%",
                  background: PURPLE,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                }}
              >
                ✓
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* =========================================================
   AI CORE
========================================================= */

function AICore({
  loading,
  generated,
}: {
  loading: boolean;
  generated: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: 130,
        height: 130,
        display: "grid",
        placeItems: "center",
      }}
    >
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: `1px dashed ${
            generated ? GREEN : PURPLE
          }`,
        }}
      />

      <motion.div
        animate={{
          scale: loading
            ? [1, 1.08, 1]
            : [1, 1.03, 1],
        }}
        transition={{
          duration: loading ? 0.8 : 2.5,
          repeat: Infinity,
        }}
        className="ai-core"
        style={{
          width: 76,
          height: 76,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at 30% 25%,#fff,#A78BFA 18%,#6D28D9 55%,#111936 100%)",
          fontSize: 35,
          border:
            "1px solid rgba(167,139,250,.5)",
        }}
      >
        {generated ? "🚀" : "🤖"}
      </motion.div>

      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            width: 90 + i * 15,
            height: 90 + i * 15,
            borderRadius: "50%",
            border:
              "1px solid rgba(6,182,212,.18)",
          }}
        />
      ))}
    </div>
  );
}

/* =========================================================
   FLASHCARD
========================================================= */

function Flashcard({
  front,
  back,
}: {
  front: string;
  back: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => setFlipped((x) => !x)}
      style={{
        padding: 15,
        borderRadius: 14,
        cursor: "pointer",
        background: flipped
          ? "linear-gradient(135deg,#7C3AED,#06B6D4)"
          : "rgba(255,255,255,.035)",
        border: `1px solid ${
          flipped
            ? "#A78BFA"
            : "rgba(148,163,184,.13)"
        }`,
        color: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: flipped ? "#C4B5FD" : MUTED,
          fontFamily: P,
          fontWeight: 700,
        }}
      >
        {flipped ? "💡 ANSWER" : "❓ QUESTION"}
      </div>

      <div
        style={{
          marginTop: 5,
          fontFamily: P,
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        {flipped ? back : front}
      </div>

      <div
        style={{
          marginTop: 7,
          fontSize: 12,
          color: flipped
            ? "rgba(255,255,255,.55)"
            : "#64748B",
        }}
      >
        Click to flip
      </div>
    </motion.div>
  );
}

/* =========================================================
   MINI QUIZ
========================================================= */

function MiniQuiz() {
  const questions = [
    {
      question: "What colour is the sky?",
      options: ["Blue", "Green", "Red", "Yellow"],
      answer: 0,
    },
    {
      question: "How many legs does a cat have?",
      options: ["2", "4", "6", "8"],
      answer: 1,
    },
    {
      question: "Which is the largest animal?",
      options: ["Dog", "Elephant", "Cat", "Rabbit"],
      answer: 1,
    },
  ];

  const [answers, setAnswers] =
    useState<Record<number, number>>({});

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 13,
      }}
    >
      {questions.map((q, qi) => (
        <div key={qi}>
          <div
            style={{
              fontFamily: P,
              fontSize: 14,
              fontWeight: 700,
              color: DARK,
              marginBottom: 7,
            }}
          >
            {qi + 1}. {q.question}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 5,
            }}
          >
            {q.options.map((option, oi) => {
              const selected =
                answers[qi] === oi;

              const correct =
                oi === q.answer;

              const revealed =
                answers[qi] !== undefined;

              return (
                <button
                  key={option}
                  disabled={revealed}
                  onClick={() =>
                    setAnswers((a) => ({
                      ...a,
                      [qi]: oi,
                    }))
                  }
                  style={{
                    padding: "7px 5px",
                    borderRadius: 9,
                    border:
                      selected && correct
                        ? `1px solid ${GREEN}`
                        : selected
                        ? "1px solid #FB7185"
                        : revealed && correct
                        ? `1px solid ${GREEN}`
                        : "1px solid #E2E8F0",
                    background:
                      selected && correct
                        ? "#DCFCE7"
                        : selected
                        ? "#FFE4E6"
                        : revealed && correct
                        ? "#DCFCE7"
                        : "#F8FAFC",
                    color: "#334155",
                    fontFamily: P,
                    fontSize: 13,
                    cursor: revealed
                      ? "default"
                      : "pointer",
                  }}
                >
                  {revealed && correct
                    ? "✓ "
                    : ""}
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   MATCHING
========================================================= */

function MatchingGame() {
  const pairs = [
    ["🐱", "Cat"],
    ["🐶", "Dog"],
    ["🐘", "Elephant"],
    ["🐦", "Bird"],
  ];

  const labels = ["Dog", "Bird", "Cat", "Elephant"];

  const [selectedEmoji, setSelectedEmoji] =
    useState<number | null>(null);

  const [matched, setMatched] =
    useState<number[]>([]);

  const handleLabel = (label: string) => {
    if (selectedEmoji === null) return;

    if (pairs[selectedEmoji][1] === label) {
      setMatched((m) => [
        ...m,
        selectedEmoji,
      ]);
      setSelectedEmoji(null);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {pairs.map(([emoji, label], i) => {
          const done = matched.includes(i);

          return (
            <button
              key={emoji}
              disabled={done}
              onClick={() =>
                setSelectedEmoji(i)
              }
              style={{
                padding: 7,
                borderRadius: 10,
                border: `1px solid ${
                  done
                    ? GREEN
                    : selectedEmoji === i
                    ? PURPLE
                    : "#E2E8F0"
                }`,
                background: done
                  ? "#DCFCE7"
                  : selectedEmoji === i
                  ? "#F3E8FF"
                  : "#fff",
                fontSize: 18,
                cursor: done
                  ? "default"
                  : "pointer",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {labels.map((label) => {
          const done =
            matched.some(
              (i) => pairs[i][1] === label
            );

          return (
            <button
              key={label}
              disabled={done}
              onClick={() =>
                handleLabel(label)
              }
              style={{
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${
                  done
                    ? GREEN
                    : "#E2E8F0"
                }`,
                background: done
                  ? "#DCFCE7"
                  : "#fff",
                color: "#334155",
                fontFamily: P,
                fontSize: 13,
                fontWeight: 700,
                cursor: done
                  ? "default"
                  : "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   RESULT CARD
========================================================= */

function ResultCard({
  icon,
  title,
  color,
  children,
  approved,
  onApprove,
}: {
  icon: string;
  title: string;
  color: string;
  children: React.ReactNode;
  approved: boolean;
  onApprove: () => void;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -4,
      }}
      transition={{
        duration: 0.35,
      }}
      style={{
        borderRadius: 20,
        overflow: "hidden",
        background: "#fff",
        boxShadow:
          "0 12px 35px rgba(0,0,0,.18)",
      }}
    >
      <div
        style={{
          padding: "13px 16px",
          background: color,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>
          {icon}
        </span>

        <span
          style={{
            flex: 1,
            fontFamily: P,
            fontSize: 16,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {title}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onApprove}
          style={{
            border:
              "1px solid rgba(255,255,255,.45)",
            background: approved
              ? "rgba(255,255,255,.25)"
              : "transparent",
            color: "#fff",
            borderRadius: 20,
            padding: "5px 10px",
            fontFamily: P,
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {approved
            ? "✓ Approved"
            : "Approve"}
        </motion.button>
      </div>

      <div style={{ padding: 16 }}>
        {children}
      </div>

      <div
        style={{
          padding: "0 16px 16px",
        }}
      >
        <motion.button
          whileHover={{
            scale: 1.01,
          }}
          whileTap={{
            scale: 0.97,
          }}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 11,
            border: `1px solid ${color}`,
            background: `${color}10`,
            color,
            fontFamily: P,
            fontSize: 14,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          🚀 Assign to Student
        </motion.button>
      </div>
    </motion.div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AIActivityGeneratorPage() {
  const [age, setAge] = useState(8);
  const [level, setLevel] =
    useState("Basic");
  const [topic, setTopic] =
    useState("Animals");
  const [difficulty, setDifficulty] =
    useState("Easy");

  const [activityTypes, setActivityTypes] =
    useState<string[]>([
      "Flashcards",
    ]);

  const [focus, setFocus] =
    useState("Visual Learning");

  const [loading, setLoading] =
    useState(false);

  const [generated, setGenerated] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [approved, setApproved] =
    useState<Record<string, boolean>>({
      Flashcards: false,
      Quiz: false,
      Story: false,
      "Matching Game": false,
    });

  const toggleType = (type: string) => {
    setActivityTypes((previous) =>
      previous.includes(type)
        ? previous.filter(
            (x) => x !== type
          )
        : [...previous, type]
    );
  };

  const toggleApprove = (
    type: string
  ) => {
    setApproved((previous) => ({
      ...previous,
      [type]: !previous[type],
    }));
  };

  const handleGenerate = () => {
    if (activityTypes.length === 0) {
      return;
    }

    setLoading(true);
    setGenerated(false);
    setProgress(0);

    let current = 0;

    const timer = setInterval(() => {
      current += 10;

      setProgress(current);

      if (current >= 100) {
        clearInterval(timer);

        setTimeout(() => {
          setLoading(false);
          setGenerated(true);
        }, 300);
      }
    }, 180);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    borderRadius: 12,
    border:
      "1px solid rgba(148,163,184,.15)",
    background:
      "rgba(255,255,255,.045)",
    color: "#E2E8F0",
    fontFamily: P,
    fontSize: 14,
    outline: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 75% 0%,rgba(124,58,237,.18),transparent 30%),radial-gradient(circle at 10% 80%,rgba(6,182,212,.08),transparent 28%),#070B24",
        color: "#fff",
        fontFamily: P,
        position: "relative",
      }}
    >
      <style>{galaxyCSS}</style>

      <Stars />

      <div
        style={{
          position: "relative",
          zIndex: 5,
        }}
      >
        <Sidebar active="AI Generator" />
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
        }}
      >
        <TopBar
          title="AI Mission Creator"
          subtitle="Create personalized learning missions with intelligent activity generation"
        />

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "25px 30px 60px",
          }}
        >
          {/* =====================================================
              HERO
          ===================================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            style={{
              borderRadius: 27,
              padding: "25px 30px",
              marginBottom: 20,
              background:
                "linear-gradient(135deg,#312E81,#111936 60%,#0E7490)",
              border:
                "1px solid rgba(167,139,250,.16)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: "#A78BFA",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: ".13em",
                }}
              >
                ✨ ARTIFICIAL INTELLIGENCE LAB
              </div>

              <h1
                style={{
                  margin: "6px 0",
                  fontSize: 25,
                  fontWeight: 800,
                }}
              >
                Build a Learning Mission
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#CBD5E1",
                  fontSize: 14,
                  maxWidth: 600,
                }}
              >
                Configure your learner's needs and
                let the AI create engaging,
                personalized activities.
              </p>
            </div>

            <div className="planet">
              <AICore
                loading={loading}
                generated={generated}
              />
            </div>
          </motion.section>

          {/* =====================================================
              MAIN GRID
          ===================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "340px minmax(0,1fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            {/* =================================================
                CONFIGURATION
            ================================================= */}

            <motion.div
              initial={{
                opacity: 0,
                x: -15,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              style={{
                background:
                  "rgba(15,23,55,.94)",
                border:
                  "1px solid rgba(148,163,184,.10)",
                borderRadius: 22,
                padding: 21,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 20 }}>
                  🧑‍🚀
                </span>

                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    Mission Settings
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginTop: 2,
                    }}
                  >
                    Configure your learner
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {/* AGE */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MUTED,
                      marginBottom: 6,
                    }}
                  >
                    STUDENT AGE
                  </label>

                  <input
                    type="number"
                    min={4}
                    max={18}
                    value={age}
                    onChange={(e) =>
                      setAge(
                        Number(e.target.value)
                      )
                    }
                    style={inputStyle}
                  />
                </div>

                {/* LEVEL */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MUTED,
                      marginBottom: 6,
                    }}
                  >
                    LEARNING LEVEL
                  </label>

                  <select
                    value={level}
                    onChange={(e) =>
                      setLevel(
                        e.target.value
                      )
                    }
                    style={inputStyle}
                  >
                    {[
                      "Pre-Academic",
                      "Basic",
                      "Intermediate",
                      "Advanced",
                    ].map((item) => (
                      <option
                        key={item}
                        style={{
                          background:
                            "#111936",
                        }}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TOPIC */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MUTED,
                      marginBottom: 6,
                    }}
                  >
                    LEARNING GOAL / TOPIC
                  </label>

                  <input
                    value={topic}
                    onChange={(e) =>
                      setTopic(
                        e.target.value
                      )
                    }
                    placeholder="Animals, Numbers..."
                    style={inputStyle}
                  />
                </div>

                {/* DIFFICULTY */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MUTED,
                      marginBottom: 7,
                    }}
                  >
                    DIFFICULTY
                  </label>

                  <DifficultyToggle
                    value={difficulty}
                    onChange={
                      setDifficulty
                    }
                  />
                </div>

                {/* ACTIVITIES */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MUTED,
                      marginBottom: 7,
                    }}
                  >
                    ACTIVITY TYPES
                  </label>

                  <ActivityChips
                    selected={
                      activityTypes
                    }
                    onToggle={toggleType}
                  />

                  {activityTypes.length ===
                    0 && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#FB7185",
                      }}
                    >
                      Select at least one
                      activity.
                    </div>
                  )}
                </div>

                {/* FOCUS */}

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 800,
                      color: MUTED,
                      marginBottom: 6,
                    }}
                  >
                    SPECIAL FOCUS
                  </label>

                  <select
                    value={focus}
                    onChange={(e) =>
                      setFocus(
                        e.target.value
                      )
                    }
                    style={inputStyle}
                  >
                    {[
                      "Visual Learning",
                      "Motor Skills",
                      "Communication",
                      "Memory",
                      "Social Skills",
                    ].map((item) => (
                      <option
                        key={item}
                        style={{
                          background:
                            "#111936",
                        }}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GENERATE */}

                <motion.button
                  whileHover={{
                    scale: 1.02,
                  }}
                  whileTap={{
                    scale: 0.96,
                  }}
                  disabled={
                    loading ||
                    activityTypes.length ===
                      0
                  }
                  onClick={
                    handleGenerate
                  }
                  style={{
                    marginTop: 4,
                    padding: "14px 10px",
                    borderRadius: 15,
                    border: "none",
                    background:
                      loading
                        ? "#334155"
                        : "linear-gradient(135deg,#7C3AED,#06B6D4)",
                    color: "#fff",
                    fontFamily: P,
                    fontSize: 16,
                    fontWeight: 800,
                    cursor:
                      loading
                        ? "wait"
                        : "pointer",
                    boxShadow:
                      loading
                        ? "none"
                        : "0 10px 30px rgba(124,58,237,.3)",
                  }}
                >
                  {loading ? (
                    <>
                      <motion.span
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{
                          display:
                            "inline-block",
                          marginRight: 7,
                        }}
                      >
                        ⚙️
                      </motion.span>

                      AI BUILDING MISSION...
                    </>
                  ) : (
                    <>🚀 GENERATE AI MISSION</>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* =================================================
                RIGHT SIDE
            ================================================= */}

            <AnimatePresence mode="wait">
              {!generated && !loading && (
                <motion.div
                  key="empty"
                  initial={{
                    opacity: 0,
                    scale: 0.97,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  style={{
                    minHeight: 530,
                    borderRadius: 22,
                    border:
                      "1px solid rgba(148,163,184,.09)",
                    background:
                      "rgba(15,23,55,.55)",
                    display: "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    textAlign: "center",
                    padding: 30,
                  }}
                >
                  <AICore
                    loading={false}
                    generated={false}
                  />

                  <h2
                    style={{
                      margin:
                        "20px 0 6px",
                      fontSize: 17,
                      fontWeight: 800,
                    }}
                  >
                    Ready for Launch
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: 360,
                      color: MUTED,
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    Configure the mission
                    settings and let the AI
                    create personalized
                    learning activities.
                  </p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  style={{
                    minHeight: 530,
                    borderRadius: 22,
                    border:
                      "1px solid rgba(139,92,246,.18)",
                    background:
                      "rgba(15,23,55,.75)",
                    display: "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    textAlign: "center",
                  }}
                >
                  <AICore
                    loading
                    generated={false}
                  />

                  <h2
                    style={{
                      margin:
                        "20px 0 5px",
                      fontSize: 17,
                    }}
                  >
                    AI is Building Your Mission
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: MUTED,
                      fontSize: 13,
                    }}
                  >
                    Analyzing learner
                    requirements...
                  </p>

                  <div
                    style={{
                      width: 300,
                      height: 7,
                      borderRadius: 10,
                      background:
                        "rgba(255,255,255,.08)",
                      marginTop: 22,
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      animate={{
                        width: `${progress}%`,
                      }}
                      style={{
                        height: "100%",
                        borderRadius: 10,
                        background:
                          "linear-gradient(90deg,#8B5CF6,#06B6D4)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: "#A78BFA",
                      fontWeight: 800,
                    }}
                  >
                    {progress}%
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 18,
                      marginTop: 25,
                      color: MUTED,
                      fontSize: 12,
                    }}
                  >
                    <span>🧠 Analyze</span>
                    <span>🧩 Create</span>
                    <span>🎯 Adapt</span>
                    <span>🚀 Prepare</span>
                  </div>
                </motion.div>
              )}

              {generated && (
                <motion.div
                  key="results"
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                >
                  {/* RESULT HEADER */}

                  <div
                    style={{
                      padding: 19,
                      borderRadius: 20,
                      marginBottom: 17,
                      background:
                        "linear-gradient(135deg,rgba(34,197,94,.12),rgba(6,182,212,.08))",
                      border:
                        "1px solid rgba(34,197,94,.18)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 13,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius:
                            "50%",
                          display: "grid",
                          placeItems:
                            "center",
                          background:
                            "rgba(34,197,94,.15)",
                          fontSize: 23,
                        }}
                      >
                        🎉
                      </div>

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                          }}
                        >
                          Mission Ready!
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            color:
                              "#86EFAC",
                          }}
                        >
                          AI created{" "}
                          {
                            activityTypes.length
                          }{" "}
                          personalized activity
                          types
                        </div>
                      </div>

                      <motion.button
                        whileHover={{
                          scale: 1.04,
                        }}
                        whileTap={{
                          scale: 0.95,
                        }}
                        onClick={
                          handleGenerate
                        }
                        style={{
                          border:
                            "1px solid rgba(167,139,250,.3)",
                          background:
                            "rgba(139,92,246,.1)",
                          color:
                            "#C4B5FD",
                          borderRadius:
                            11,
                          padding:
                            "8px 12px",
                          fontFamily: P,
                          fontSize: 12,
                          fontWeight: 800,
                          cursor:
                            "pointer",
                        }}
                      >
                        🔄 Regenerate
                      </motion.button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 7,
                        flexWrap:
                          "wrap",
                        marginTop: 14,
                      }}
                    >
                      {[
                        `👤 Age ${age}`,
                        `📚 ${level}`,
                        `🎯 ${topic}`,
                        `⭐ ${difficulty}`,
                        `🧠 ${focus}`,
                      ].map((item) => (
                        <span
                          key={item}
                          style={{
                            padding:
                              "5px 9px",
                            borderRadius:
                              20,
                            background:
                              "rgba(255,255,255,.05)",
                            color:
                              "#94A3B8",
                            fontSize: 12,
                            fontWeight:
                              700,
                          }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* RESULT CARDS */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 17,
                    }}
                  >
                    {activityTypes.includes(
                      "Flashcards"
                    ) && (
                      <ResultCard
                        icon="🃏"
                        title="Flashcard Set"
                        color={PURPLE}
                        approved={
                          approved.Flashcards
                        }
                        onApprove={() =>
                          toggleApprove(
                            "Flashcards"
                          )
                        }
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap: 7,
                          }}
                        >
                          <Flashcard
                            front={`What is a ${
                              topic || "dog"
                            }?`}
                            back="A living thing that can be learned about through observation and practice."
                          />

                          <Flashcard
                            front={`Name something related to ${topic}.`}
                            back="Try identifying its colour, shape, sound or purpose."
                          />

                          <Flashcard
                            front={`Why is ${topic} important?`}
                            back="Understanding topics helps build knowledge and everyday learning skills."
                          />
                        </div>
                      </ResultCard>
                    )}

                    {activityTypes.includes(
                      "Quiz"
                    ) && (
                      <ResultCard
                        icon="🧠"
                        title="Interactive Quiz"
                        color={GREEN}
                        approved={
                          approved.Quiz
                        }
                        onApprove={() =>
                          toggleApprove(
                            "Quiz"
                          )
                        }
                      >
                        <MiniQuiz />
                      </ResultCard>
                    )}

                    {activityTypes.includes(
                      "Story"
                    ) && (
                      <ResultCard
                        icon="📖"
                        title="Learning Story"
                        color="#7C3AED"
                        approved={
                          approved.Story
                        }
                        onApprove={() =>
                          toggleApprove(
                            "Story"
                          )
                        }
                      >
                        <div
                          style={{
                            color:
                              "#334155",
                            fontFamily: P,
                            fontSize: 14,
                            lineHeight: 1.8,
                          }}
                        >
                          <p>
                            🌿 Once upon a
                            time, a curious
                            learner began an
                            exciting journey
                            to discover{" "}
                            <b>
                              {topic}
                            </b>
                            .
                          </p>

                          <p>
                            Along the way,
                            they observed,
                            explored and
                            answered little
                            challenges.
                          </p>

                          <p
                            style={{
                              marginBottom: 0,
                            }}
                          >
                            🚀 Every new
                            discovery made
                            the learner more
                            confident.
                          </p>
                        </div>
                      </ResultCard>
                    )}

                    {activityTypes.includes(
                      "Matching Game"
                    ) && (
                      <ResultCard
                        icon="🧩"
                        title="Matching Mission"
                        color={ORANGE}
                        approved={
                          approved[
                            "Matching Game"
                          ]
                        }
                        onApprove={() =>
                          toggleApprove(
                            "Matching Game"
                          )
                        }
                      >
                        <div
                          style={{
                            fontFamily: P,
                            fontSize: 12,
                            color:
                              "#64748B",
                            marginBottom: 9,
                          }}
                        >
                          Select an emoji and
                          match it with the
                          correct word.
                        </div>

                        <MatchingGame />
                      </ResultCard>
                    )}
                  </div>

                  {/* LAUNCH */}

                  <motion.button
                    whileHover={{
                      scale: 1.015,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    style={{
                      width: "100%",
                      marginTop: 18,
                      padding: 15,
                      borderRadius: 16,
                      border: "none",
                      background:
                        "linear-gradient(135deg,#8B5CF6,#06B6D4)",
                      color: "#fff",
                      fontFamily: P,
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow:
                        "0 12px 35px rgba(139,92,246,.25)",
                    }}
                  >
                    🚀 LAUNCH LEARNING MISSION
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
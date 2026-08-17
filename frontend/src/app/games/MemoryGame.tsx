import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GameShell from "../components/GameShell";
import { saveResult } from "../api/resultApi";

const original = [
  "🍎",
  "🍎",
  "🐶",
  "🐶",
  "🚗",
  "🚗",
  "🌸",
  "🌸",
  "⭐",
  "⭐",
  "🐱",
  "🐱",
];

const shuffle = <T,>(array: T[]) =>
  [...array].sort(
    () => Math.random() - 0.5
  );

const TOTAL_TIME = 90;

export default function MemoryGame() {
  const [studentId, setStudentId] =
    useState("");

  const [cards, setCards] =
    useState(shuffle(original));

  const [flipped, setFlipped] =
    useState<number[]>([]);

  const [matched, setMatched] =
    useState<number[]>([]);

  const [moves, setMoves] =
    useState(0);

  const [time, setTime] =
    useState(TOTAL_TIME);

  const [done, setDone] =
    useState(false);

  const [streak, setStreak] =
    useState(0);

  const [bestStreak, setBestStreak] =
    useState(0);

  const [wrongPair, setWrongPair] =
    useState<number[]>([]);

  /* =====================================================
     TIMER
  ===================================================== */

  useEffect(() => {
    if (done) return;

    if (time <= 0) {
      finish();
      return;
    }

    const timer =
      window.setInterval(() => {
        setTime(
          (value) => value - 1
        );
      }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [time, done]);

  /* =====================================================
     CHECK TWO CARDS
  ===================================================== */

  useEffect(() => {
    if (flipped.length !== 2) {
      return;
    }

    setMoves(
      (value) => value + 1
    );

    const [a, b] = flipped;

    if (cards[a] === cards[b]) {
      const newStreak =
        streak + 1;

      setMatched(
        (value) => [
          ...value,
          a,
          b,
        ]
      );

      setStreak(newStreak);

      setBestStreak(
        (best) =>
          Math.max(
            best,
            newStreak
          )
      );

      setFlipped([]);
    } else {
      setStreak(0);
      setWrongPair(flipped);

      const timer =
        window.setTimeout(() => {
          setFlipped([]);
          setWrongPair([]);
        }, 700);

      return () =>
        window.clearTimeout(
          timer
        );
    }
  }, [flipped]);

  /* =====================================================
     CHECK COMPLETION
  ===================================================== */

  useEffect(() => {
    if (
      matched.length ===
        cards.length &&
      cards.length
    ) {
      const timer =
        window.setTimeout(
          finish,
          500
        );

      return () =>
        window.clearTimeout(
          timer
        );
    }
  }, [matched, cards]);

  /* =====================================================
     FINISH
  ===================================================== */

  const finish = async () => {
    if (done) return;

    setDone(true);

    const correct =
      matched.length / 2;

    const total =
      cards.length / 2;

    const accuracy =
      Math.round(
        (correct / total) *
          100
      );

    if (studentId) {
      await saveResult({
        student: studentId,
        activityName:
          "Memory Matching",
        moduleId:
          "game-memory",
        domain: "Academic",
        level: "Beginner",
        totalQuestions:
          total,
        correctAnswers:
          correct,
        wrongAnswers:
          total - correct,
        score: accuracy,
        accuracy,
        timeTaken:
          TOTAL_TIME - time,
        attempts: 1,
        helpRequests: 0,
      }).catch(() => {});
    }
  };

  /* =====================================================
     RESTART
  ===================================================== */

  const restart = () => {
    setCards(
      shuffle(original)
    );
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTime(TOTAL_TIME);
    setDone(false);
    setStreak(0);
    setBestStreak(0);
    setWrongPair([]);
  };

  /* =====================================================
     CARD CLICK
  ===================================================== */

  const flipCard = (
    index: number
  ) => {
    if (
      flipped.length >= 2 ||
      flipped.includes(index) ||
      matched.includes(index) ||
      wrongPair.length > 0
    ) {
      return;
    }

    setFlipped((value) => [
      ...value,
      index,
    ]);
  };

  /* =====================================================
     PROGRESS
  ===================================================== */

  const progress = useMemo(
    () =>
      (matched.length /
        cards.length) *
      100,
    [matched, cards]
  );

  const matchedPairs =
    matched.length / 2;

  const totalPairs =
    cards.length / 2;

  const accuracy =
    moves > 0
      ? Math.round(
          (matchedPairs /
            moves) *
            100
        )
      : 0;

  /* =====================================================
     RESULT
  ===================================================== */

  if (done) {
    return (
      <GameShell
        title="Memory Matching"
        icon="🧠"
        studentId={studentId}
        onStudentChange={
          setStudentId
        }
      >
        <div
          style={
            styles.resultWrapper
          }
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.7,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 180,
            }}
            style={styles.result}
          >
            <motion.div
              animate={{
                y: [0, -12, 0],
                rotate: [
                  0,
                  5,
                  -5,
                  0,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              style={{
                fontSize: 72,
              }}
            >
              🧠
            </motion.div>

            <h1
              style={
                styles.resultTitle
              }
            >
              {matchedPairs ===
              totalPairs
                ? "Memory Master!"
                : "Great Effort!"}
            </h1>

            <p
              style={
                styles.resultText
              }
            >
              Your memory mission
              is complete.
            </p>

            {/* SCORE PANEL */}

            <div
              style={
                styles.scorePanel
              }
            >
              <div
                style={
                  styles.scoreCircle
                }
              >
                <strong
                  style={
                    styles.scoreNumber
                  }
                >
                  {matchedPairs}
                </strong>

                <span
                  style={
                    styles.scoreLabel
                  }
                >
                  MATCHES
                </span>
              </div>

              <div
                style={
                  styles.resultStats
                }
              >
                <div>
                  <span>
                    Pairs Found
                  </span>

                  <strong>
                    {matchedPairs}/
                    {totalPairs}
                  </strong>
                </div>

                <div>
                  <span>
                    Moves
                  </span>

                  <strong>
                    {moves}
                  </strong>
                </div>

                <div>
                  <span>
                    Best Streak
                  </span>

                  <strong>
                    🔥{" "}
                    {bestStreak}
                  </strong>
                </div>

                <div>
                  <span>
                    Time
                  </span>

                  <strong>
                    {TOTAL_TIME -
                      time}
                    s
                  </strong>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{
                scale: 1.03,
              }}
              whileTap={{
                scale: 0.96,
              }}
              onClick={
                restart
              }
              style={
                styles.primary
              }
            >
              🚀 Play Again
            </motion.button>
          </motion.div>
        </div>
      </GameShell>
    );
  }

  /* =====================================================
     GAME SCREEN
  ===================================================== */

  return (
    <GameShell
      title="Memory Matching"
      icon="🧠"
      studentId={studentId}
      onStudentChange={
        setStudentId
      }
      score={matchedPairs}
      time={time}
      progress={progress}
    >
      <div
        style={
          styles.gameContainer
        }
      >
        {/* =================================================
            TOP STATS
        ================================================= */}

        <div
          style={
            styles.statsRow
          }
        >
          <div
            style={
              styles.statCard
            }
          >
            <span>🧠</span>

            <div>
              <small>
                MATCHES
              </small>

              <strong>
                {matchedPairs}/
                {totalPairs}
              </strong>
            </div>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span>🔄</span>

            <div>
              <small>
                MOVES
              </small>

              <strong>
                {moves}
              </strong>
            </div>
          </div>

          <div
            style={
              styles.statCard
            }
          >
            <span>🔥</span>

            <div>
              <small>
                STREAK
              </small>

              <strong>
                {streak}
              </strong>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor:
                time <= 10
                  ? "#EF4444"
                  : "#D7E1EA",
            }}
          >
            <span>⏱️</span>

            <div>
              <small>
                TIME
              </small>

              <strong
                style={{
                  color:
                    time <= 10
                      ? "#EF4444"
                      : "#1565C0",
                }}
              >
                {time}s
              </strong>
            </div>
          </div>
        </div>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          style={styles.card}
        >
          {/* HEADER */}

          <div
            style={
              styles.gameHeader
            }
          >
            <div>
              <div
                style={
                  styles.eyebrow
                }
              >
                🧠 MEMORY GALAXY
              </div>

              <h2
                style={
                  styles.h2
                }
              >
                Find the matching
                stars
              </h2>

              <p
                style={
                  styles.description
                }
              >
                Flip two cards and
                discover matching
                pictures.
              </p>
            </div>

            <motion.div
              className="memory-planet"
              animate={{
                y: [
                  0,
                  -7,
                  0,
                ],
                rotate: [
                  -4,
                  4,
                  -4,
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              style={
                styles.planet
              }
            >
              🪐
            </motion.div>
          </div>

          {/* PROGRESS */}

          <div
            style={
              styles.progressArea
            }
          >
            <div
              style={
                styles.progressText
              }
            >
              <span>
                Memory Progress
              </span>

              <strong>
                {matchedPairs} /{" "}
                {totalPairs} pairs
              </strong>
            </div>

            <div
              style={
                styles.progressTrack
              }
            >
              <motion.div
                animate={{
                  width: `${progress}%`,
                }}
                transition={{
                  duration: 0.4,
                }}
                style={
                  styles.progressFill
                }
              />
            </div>
          </div>

          {/* =================================================
              MEMORY GRID
          ================================================= */}

          <div
            style={
              styles.grid
            }
          >
            {cards.map(
              (card, index) => {
                const open =
                  flipped.includes(
                    index
                  ) ||
                  matched.includes(
                    index
                  );

                const isMatched =
                  matched.includes(
                    index
                  );

                const isWrong =
                  wrongPair.includes(
                    index
                  );

                return (
                  <motion.button
                    key={index}
                    onClick={() =>
                      flipCard(
                        index
                      )
                    }
                    whileHover={
                      !open
                        ? {
                            y: -5,
                            scale: 1.03,
                          }
                        : {}
                    }
                    whileTap={{
                      scale: 0.95,
                    }}
                    animate={{
                      rotateY:
                        open
                          ? 180
                          : 0,
                      scale:
                        isMatched
                          ? 0.95
                          : isWrong
                          ? [
                              1,
                              1.05,
                              0.96,
                              1,
                            ]
                          : 1,
                      x:
                        isWrong
                          ? [
                              0,
                              -5,
                              5,
                              -4,
                              4,
                              0,
                            ]
                          : 0,
                    }}
                    transition={{
                      rotateY: {
                        duration:
                          0.35,
                      },
                      scale: {
                        duration:
                          isWrong
                            ? 0.4
                            : 0.2,
                      },
                    }}
                    style={{
                      ...styles.tile,
                      background:
                        isMatched
                          ? "linear-gradient(135deg,#DCFCE7,#BBF7D0)"
                          : open
                          ? "#fff"
                          : "linear-gradient(135deg,#172554,#312E81,#0E7490)",
                      borderColor:
                        isMatched
                          ? "#22C55E"
                          : isWrong
                          ? "#EF4444"
                          : open
                          ? "#A78BFA"
                          : "rgba(103,232,249,.22)",
                      boxShadow:
                        isMatched
                          ? "0 0 18px rgba(34,197,94,.22)"
                          : open
                          ? "0 8px 22px rgba(139,92,246,.15)"
                          : "0 6px 18px rgba(7,11,36,.18)",
                    }}
                  >
                    <span
                      style={{
                        transform:
                          open
                            ? "rotateY(180deg)"
                            : "none",
                        display:
                          "block",
                      }}
                    >
                      {open
                        ? card
                        : "✦"}
                    </span>
                  </motion.button>
                );
              }
            )}
          </div>

          {/* FEEDBACK */}

          <AnimatePresence>
            {streak > 0 && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                  scale: 0.9,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                style={
                  styles.streakMessage
                }
              >
                🔥 {streak} match
                {streak > 1
                  ? "es"
                  : ""}{" "}
                in a row!
              </motion.div>
            )}
          </AnimatePresence>

          <p
            style={
              styles.hint
            }
          >
            ✨ Remember the
            pictures and find
            their matching
            stars.
          </p>
        </motion.div>
      </div>
    </GameShell>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles: any = {
  gameContainer: {
    maxWidth: 850,
    margin: "0 auto",
  },

  statsRow: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,1fr)",
    gap: 10,
    marginBottom: 14,
  },

  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "10px 12px",
    borderRadius: 14,
    background: "#fff",
    border:
      "1px solid #D7E1EA",
    boxShadow:
      "0 4px 15px rgba(21,101,192,.06)",
  },

  card: {
    background: "#fff",
    borderRadius: 25,
    padding: 28,
    boxShadow:
      "0 10px 35px rgba(21,101,192,.10)",
    border:
      "1px solid rgba(21,101,192,.07)",
  },

  gameHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 20,
  },

  eyebrow: {
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1.2,
    color: "#8B5CF6",
  },

  h2: {
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: "#0D2137",
    margin:
      "7px 0 4px",
  },

  description: {
    fontFamily:
      "Poppins, sans-serif",
    color: "#4A6580",
    fontSize: 11,
    margin: 0,
  },

  planet: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 40,
    background:
      "radial-gradient(circle at 30% 30%,#E0F2FE,#A78BFA,#312E81)",
    boxShadow:
      "0 0 30px rgba(139,92,246,.25)",
    flexShrink: 0,
  },

  progressArea: {
    marginTop: 22,
    marginBottom: 23,
  },

  progressText: {
    display: "flex",
    justifyContent:
      "space-between",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 9,
    color: "#64748B",
    marginBottom: 6,
  },

  progressTrack: {
    height: 8,
    background: "#E8EEF5",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 10,
    background:
      "linear-gradient(90deg,#1565C0,#8B5CF6,#06B6D4)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,1fr)",
    gap: 13,
    maxWidth: 680,
    margin: "0 auto",
    perspective: 900,
  },

  tile: {
    height: 105,
    borderRadius: 18,
    border:
      "2px solid",
    fontSize: 40,
    cursor: "pointer",
    fontFamily:
      "Poppins, sans-serif",
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    transformStyle:
      "preserve-3d",
    transition:
      "border-color .2s ease, box-shadow .2s ease",
  },

  streakMessage: {
    width: "fit-content",
    margin:
      "18px auto 0",
    padding:
      "8px 14px",
    borderRadius: 12,
    background:
      "#FFF7ED",
    border:
      "1px solid #FED7AA",
    color: "#C2410C",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 9,
    fontWeight: 800,
  },

  hint: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 10,
    margin:
      "16px 0 0",
    fontFamily:
      "Poppins, sans-serif",
  },

  resultWrapper: {
    minHeight: 560,
    display: "grid",
    placeItems: "center",
    padding: 20,
  },

  result: {
    width: "100%",
    maxWidth: 620,
    background: "#fff",
    borderRadius: 26,
    padding: 35,
    textAlign: "center",
    boxShadow:
      "0 12px 40px rgba(21,101,192,.12)",
    border:
      "1px solid rgba(21,101,192,.07)",
  },

  resultTitle: {
    color: "#0D2137",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 27,
    margin:
      "10px 0 4px",
  },

  resultText: {
    color: "#4A6580",
    fontSize: 11,
    fontFamily:
      "Poppins, sans-serif",
  },

  scorePanel: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    gap: 30,
    margin:
      "24px 0",
    padding: 20,
    borderRadius: 19,
    background:
      "linear-gradient(135deg,#F0F6FF,#F7FBFF)",
  },

  scoreCircle: {
    width: 105,
    height: 105,
    borderRadius: "50%",
    background:
      "linear-gradient(135deg,#1565C0,#8B5CF6,#06B6D4)",
    color: "#fff",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    boxShadow:
      "0 8px 25px rgba(21,101,192,.20)",
  },

  scoreNumber: {
    fontSize: 31,
    fontWeight: 800,
    fontFamily:
      "Poppins, sans-serif",
  },

  scoreLabel: {
    fontSize: 8,
    fontWeight: 800,
    opacity: 0.8,
  },

  resultStats: {
    display: "flex",
    flexDirection:
      "column",
    gap: 8,
    textAlign: "left",
  },

  primary: {
    padding:
      "13px 28px",
    border: 0,
    borderRadius: 13,
    background:
      "linear-gradient(135deg,#1565C0,#8B5CF6,#06B6D4)",
    color: "#fff",
    fontFamily:
      "Poppins, sans-serif",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: 12,
    boxShadow:
      "0 8px 20px rgba(21,101,192,.18)",
  },
};
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GameShell from "../components/GameShell";
import { saveResult } from "../api/resultApi";

const items = [
  {
    id: 1,
    name: "🍎 Apple",
    category: "Fruits",
  },
  {
    id: 2,
    name: "🍌 Banana",
    category: "Fruits",
  },
  {
    id: 3,
    name: "🚗 Car",
    category: "Vehicles",
  },
  {
    id: 4,
    name: "🚌 Bus",
    category: "Vehicles",
  },
  {
    id: 5,
    name: "🐶 Dog",
    category: "Animals",
  },
  {
    id: 6,
    name: "🐱 Cat",
    category: "Animals",
  },
];

const cats = [
  "Fruits",
  "Vehicles",
  "Animals",
];

const TOTAL_TIME = 60;

/* =========================================================
   CATEGORY CONFIG
========================================================= */

const categoryConfig: Record<
  string,
  {
    icon: string;
    color: string;
    glow: string;
  }
> = {
  Fruits: {
    icon: "🍎",
    color: "#F97316",
    glow: "rgba(249,115,22,.18)",
  },

  Vehicles: {
    icon: "🚀",
    color: "#06B6D4",
    glow: "rgba(6,182,212,.18)",
  },

  Animals: {
    icon: "🐾",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,.18)",
  },
};

export default function DragDropGame() {
  const [studentId, setStudentId] =
    useState("");

  const [remaining, setRemaining] =
    useState(items);

  const [score, setScore] =
    useState(0);

  const [time, setTime] =
    useState(TOTAL_TIME);

  const [done, setDone] =
    useState(false);

  const [wrong, setWrong] =
    useState<number | null>(null);

  const [dragging, setDragging] =
    useState<number | null>(null);

  const [hoverCategory, setHoverCategory] =
    useState<string | null>(null);

  const [streak, setStreak] =
    useState(0);

  const [bestStreak, setBestStreak] =
    useState(0);

  const [placed, setPlaced] =
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
     FINISH
  ===================================================== */

  const finish = async () => {
    if (done) return;

    setDone(true);

    const correctAnswers =
      score / 10;

    const wrongAnswers =
      6 - correctAnswers;

    const accuracy = Math.round(
      (correctAnswers / 6) * 100
    );

    if (studentId) {
      await saveResult({
        student: studentId,
        activityName:
          "Drag & Drop Sorting",
        moduleId:
          "game-drag-drop",
        domain: "Motor",
        level: "Beginner",
        totalQuestions: 6,
        correctAnswers,
        wrongAnswers,
        score,
        accuracy,
        timeTaken:
          TOTAL_TIME - time,
        attempts: 1,
        helpRequests: 0,
      }).catch(() => {});
    }
  };

  /* =====================================================
     DROP
  ===================================================== */

  const drop = (
    event: React.DragEvent,
    category: string
  ) => {
    event.preventDefault();

    setHoverCategory(null);

    const id = Number(
      event.dataTransfer.getData(
        "id"
      )
    );

    const item = items.find(
      (value) =>
        value.id === id
    );

    if (!item) return;

    if (
      item.category ===
      category
    ) {
      const newScore =
        score + 10;

      const newStreak =
        streak + 1;

      setScore(newScore);
      setStreak(newStreak);

      setBestStreak(
        (best) =>
          Math.max(
            best,
            newStreak
          )
      );

      setPlaced(
        (previous) => [
          ...previous,
          id,
        ]
      );

      setRemaining(
        (previous) => {
          const next =
            previous.filter(
              (value) =>
                value.id !== id
            );

          if (
            next.length === 0
          ) {
            window.setTimeout(
              finish,
              600
            );
          }

          return next;
        }
      );
    } else {
      setWrong(id);
      setStreak(0);

      window.setTimeout(() => {
        setWrong(null);
      }, 700);
    }

    setDragging(null);
  };

  /* =====================================================
     RESET
  ===================================================== */

  const playAgain = () => {
    setRemaining(items);
    setScore(0);
    setTime(TOTAL_TIME);
    setDone(false);
    setWrong(null);
    setDragging(null);
    setHoverCategory(null);
    setStreak(0);
    setBestStreak(0);
    setPlaced([]);
  };

  /* =====================================================
     PROGRESS
  ===================================================== */

  const progress = useMemo(
    () =>
      ((items.length -
        remaining.length) /
        items.length) *
      100,
    [remaining]
  );

  const accuracy = Math.round(
    (score /
      (items.length * 10)) *
      100
  );

  /* =====================================================
     RESULT SCREEN
  ===================================================== */

  if (done) {
    return (
      <GameShell
        title="Drag & Drop Sorting"
        icon="🧩"
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
                y: [
                  0,
                  -12,
                  0,
                ],
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
              {accuracy >= 80
                ? "🏆"
                : accuracy >= 50
                ? "🎉"
                : "🌱"}
            </motion.div>

            <h1
              style={
                styles.resultTitle
              }
            >
              {accuracy >= 80
                ? "Galaxy Master!"
                : accuracy >= 50
                ? "Great Work!"
                : "Keep Exploring!"}
            </h1>

            <p
              style={
                styles.resultText
              }
            >
              Your sorting mission
              has been completed.
            </p>

            {/* SCORE */}

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
                  {score}
                </strong>

                <span
                  style={
                    styles.scoreLabel
                  }
                >
                  XP
                </span>
              </div>

              <div
                style={
                  styles.resultStats
                }
              >
                <div>
                  <span>
                    Accuracy
                  </span>
                  <strong>
                    {accuracy}%
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
                    Items Sorted
                  </span>

                  <strong>
                    {
                      placed.length
                    } / 6
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
                playAgain
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
     GAME
  ===================================================== */

  return (
    <GameShell
      title="Drag & Drop Sorting"
      icon="🧩"
      studentId={studentId}
      onStudentChange={
        setStudentId
      }
      score={score}
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
            <span>⭐</span>

            <div>
              <small>
                SCORE
              </small>

              <strong>
                {score}
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
            style={
              styles.statCard
            }
          >
            <span>🧩</span>

            <div>
              <small>
                SORTED
              </small>

              <strong>
                {placed.length}
                /6
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
            GAME CARD
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
                🚀 GALAXY MISSION
              </div>

              <h2
                style={
                  styles.h2
                }
              >
                Sort the
                objects into
                their planets
              </h2>

              <p
                style={
                  styles.description
                }
              >
                Drag each item
                into the correct
                category.
              </p>
            </div>

            <motion.div
              animate={{
                y: [
                  0,
                  -7,
                  0,
                ],
                rotate: [
                  -3,
                  3,
                  -3,
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              style={
                styles.missionPlanet
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
                Mission Progress
              </span>

              <strong>
                {placed.length} / 6
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
              DROP ZONES
          ================================================= */}

          <div
            style={
              styles.bins
            }
          >
            {cats.map(
              (category) => {
                const config =
                  categoryConfig[
                    category
                  ];

                const isHover =
                  hoverCategory ===
                  category;

                return (
                  <motion.div
                    key={
                      category
                    }
                    onDragOver={(
                      event
                    ) => {
                      event.preventDefault();
                      setHoverCategory(
                        category
                      );
                    }}
                    onDragLeave={() =>
                      setHoverCategory(
                        null
                      )
                    }
                    onDrop={(event) =>
                      drop(
                        event,
                        category
                      )
                    }
                    animate={{
                      scale:
                        isHover
                          ? 1.03
                          : 1,
                    }}
                    style={{
                      ...styles.bin,
                      borderColor:
                        isHover
                          ? config.color
                          : "#D7E1EA",
                      background:
                        isHover
                          ? config.glow
                          : "#F8FBFF",
                      boxShadow:
                        isHover
                          ? `0 0 30px ${config.glow}`
                          : "none",
                    }}
                  >
                    <motion.div
                      animate={{
                        y: isHover
                          ? -5
                          : 0,
                      }}
                      style={{
                        ...styles.binIcon,
                        background:
                          config.glow,
                      }}
                    >
                      {
                        config.icon
                      }
                    </motion.div>

                    <div
                      style={{
                        ...styles.binTitle,
                        color:
                          config.color,
                      }}
                    >
                      {category}
                    </div>

                    <div
                      style={
                        styles.binHint
                      }
                    >
                      {isHover
                        ? "✨ Release here!"
                        : "Drop items here"}
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>

          {/* =================================================
              ITEMS
          ================================================= */}

          <div
            style={
              styles.itemsTitle
            }
          >
            <span>
              🛰️ Objects waiting
              to be sorted
            </span>

            <span>
              {remaining.length}{" "}
              left
            </span>
          </div>

          <div
            style={
              styles.items
            }
          >
            <AnimatePresence>
              {remaining.map(
                (item) => {
                  const isWrong =
                    wrong ===
                    item.id;

                  const isDragging =
                    dragging ===
                    item.id;

                  return (
                    <motion.div
                      key={
                        item.id
                      }
                      layout
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      animate={{
                        opacity: 1,
                        scale:
                          isWrong
                            ? [
                                1,
                                1.08,
                                0.96,
                                1,
                              ]
                            : 1,
                        x:
                          isWrong
                            ? [
                                0,
                                -7,
                                7,
                                -5,
                                5,
                                0,
                              ]
                            : 0,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.5,
                        y: -30,
                      }}
                      transition={{
                        duration:
                          isWrong
                            ? 0.4
                            : 0.25,
                      }}
                      draggable
                      onMouseDown={() =>
                        setDragging(
                          item.id
                        )
                      }
                      onMouseUp={() =>
                        setDragging(
                          null
                        )
                      }
                      whileHover={{
                        y: -6,
                        scale: 1.04,
                      }}
                      whileTap={{
                        scale: 0.95,
                      }}
                      onDragStart={(
                        event: any
                      ) => {
                        if (event.dataTransfer) {
                          event.dataTransfer.setData(
                            "id",
                            String(
                              item.id
                            )
                          );
                        }
                      }}
                      style={{
                        ...styles.item,
                        borderColor:
                          isWrong
                            ? "#EF4444"
                            : isDragging
                            ? "#8B5CF6"
                            : "#D7E1EA",
                        boxShadow:
                          isDragging
                            ? "0 12px 30px rgba(139,92,246,.25)"
                            : "0 4px 12px rgba(21,101,192,.06)",
                      }}
                    >
                      <span
                        style={
                          styles.itemIcon
                        }
                      >
                        {
                          item.name.split(
                            " "
                          )[0]
                        }
                      </span>

                      <span>
                        {
                          item.name.substring(
                            item.name.indexOf(
                              " "
                            ) + 1
                          )
                        }
                      </span>

                      {isDragging && (
                        <span
                          style={
                            styles.dragBadge
                          }
                        >
                          ✦
                        </span>
                      )}
                    </motion.div>
                  );
                }
              )}
            </AnimatePresence>
          </div>

          {/* WRONG MESSAGE */}

          <AnimatePresence>
            {wrong && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -5,
                }}
                style={
                  styles.wrongMessage
                }
              >
                💫 Not quite!
                Try another
                planet.
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={
              styles.tip
            }
          >
            💡 Tip: Drag an
            object and release
            it inside the matching
            category.
          </div>
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
    maxWidth: 900,
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

  missionPlanet: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 42,
    background:
      "radial-gradient(circle at 30% 30%,#E0F2FE,#BFDBFE,#8B5CF6)",
    boxShadow:
      "0 0 30px rgba(139,92,246,.20)",
    flexShrink: 0,
  },

  progressArea: {
    marginTop: 22,
    marginBottom: 22,
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

  bins: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 14,
    marginBottom: 25,
  },

  bin: {
    minHeight: 155,
    border:
      "2px dashed #D7E1EA",
    borderRadius: 19,
    padding: 18,
    textAlign: "center",
    transition:
      "all .2s ease",
    cursor: "default",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
  },

  binIcon: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 28,
    marginBottom: 8,
  },

  binTitle: {
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 14,
    fontWeight: 800,
  },

  binHint: {
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 9,
    color: "#7A91A8",
    marginTop: 5,
  },

  itemsTitle: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 10,
    fontWeight: 800,
    color: "#263B50",
    marginBottom: 10,
  },

  items: {
    display: "flex",
    gap: 10,
    justifyContent:
      "center",
    flexWrap: "wrap",
    minHeight: 65,
  },

  item: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding:
      "11px 15px",
    background: "#fff",
    border:
      "1.5px solid #D5E2EF",
    borderRadius: 14,
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 11,
    fontWeight: 800,
    color: "#263B50",
    cursor: "grab",
    userSelect: "none",
  },

  itemIcon: {
    fontSize: 20,
  },

  dragBadge: {
    position: "absolute",
    right: -5,
    top: -6,
    width: 17,
    height: 17,
    borderRadius: "50%",
    background: "#8B5CF6",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontSize: 9,
  },

  wrongMessage: {
    width: "fit-content",
    margin:
      "15px auto 0",
    padding:
      "8px 13px",
    borderRadius: 10,
    background: "#FFF1F2",
    border:
      "1px solid #FECDD3",
    color: "#BE123C",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 9,
    fontWeight: 800,
  },

  tip: {
    textAlign: "center",
    color: "#64748B",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 10,
    marginTop: 18,
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
    fontSize: 9,
    fontWeight: 800,
    opacity: 0.8,
  },

  resultStats: {
    display: "flex",
    flexDirection:
      "column",
    gap: 9,
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
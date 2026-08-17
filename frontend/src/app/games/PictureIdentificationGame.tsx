import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GameShell from "../components/GameShell";
import { saveResult } from "../api/resultApi";

const questions = [
  {
    image: "🌳",
    answer: "Tree",
    options: ["Tree", "Rock", "Flower", "River"],
  },
  {
    image: "🐶",
    answer: "Dog",
    options: ["Cat", "Dog", "Lion", "Bird"],
  },
  {
    image: "🍎",
    answer: "Apple",
    options: ["Banana", "Apple", "Orange", "Mango"],
  },
  {
    image: "🚗",
    answer: "Car",
    options: ["Bus", "Train", "Car", "Bike"],
  },
  {
    image: "🌸",
    answer: "Flower",
    options: ["Tree", "Flower", "Cloud", "Sun"],
  },
];

const TOTAL_TIME = 15;

export default function PictureIdentificationGame() {
  const [studentId, setStudentId] = useState("");
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [done, setDone] = useState(false);

  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const [lives, setLives] = useState(3);

  const [timeLeft, setTimeLeft] =
    useState(TOTAL_TIME);

  const [answered, setAnswered] =
    useState(false);

  const [correctAnswer, setCorrectAnswer] =
    useState(false);

  const q = questions[i];

  /* =====================================================
     TIMER
  ===================================================== */

  useEffect(() => {
    if (done || answered) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [timeLeft, done, answered]);

  /* =====================================================
     FINISH
  ===================================================== */

  const finish = async (
    finalScore: number
  ) => {
    setDone(true);

    const correctAnswers = Math.round(
      finalScore / 20
    );

    await saveResult({
      student: studentId,
      activityName:
        "Picture Identification",
      moduleId:
        "game-picture-identification",
      domain: "Academic",
      level: "Beginner",
      totalQuestions:
        questions.length,
      correctAnswers,
      wrongAnswers:
        questions.length -
        correctAnswers,
      score: finalScore,
      accuracy: Math.round(
        (finalScore /
          (questions.length * 20)) *
          100
      ),
      timeTaken: 0,
      attempts: 1,
      helpRequests: 0,
    }).catch(() => {});
  };

  /* =====================================================
     TIMEOUT
  ===================================================== */

  const handleTimeout = () => {
    if (answered) return;

    setAnswered(true);
    setCorrectAnswer(false);
    setStreak(0);

    const remainingLives = lives - 1;
    setLives(remainingLives);

    window.setTimeout(() => {
      if (
        i === questions.length - 1 ||
        remainingLives <= 0
      ) {
        finish(score);
      } else {
        nextQuestion();
      }
    }, 900);
  };

  /* =====================================================
     NEXT QUESTION
  ===================================================== */

  const nextQuestion = () => {
    setI((value) => value + 1);
    setSelected("");
    setAnswered(false);
    setCorrectAnswer(false);
    setTimeLeft(TOTAL_TIME);
  };

  /* =====================================================
     ANSWER
  ===================================================== */

  const choose = (answer: string) => {
    if (answered || selected) return;

    const isCorrect =
      answer === q.answer;

    setSelected(answer);
    setAnswered(true);
    setCorrectAnswer(isCorrect);

    if (isCorrect) {
      const newScore =
        score + 20;

      const newStreak =
        streak + 1;

      setScore(newScore);
      setStreak(newStreak);

      setBestStreak((best) =>
        Math.max(best, newStreak)
      );

      window.setTimeout(() => {
        if (
          i === questions.length - 1
        ) {
          finish(newScore);
        } else {
          nextQuestion();
        }
      }, 900);
    } else {
      setStreak(0);

      const remainingLives =
        lives - 1;

      setLives(remainingLives);

      window.setTimeout(() => {
        if (
          i === questions.length - 1 ||
          remainingLives <= 0
        ) {
          finish(score);
        } else {
          nextQuestion();
        }
      }, 1000);
    }
  };

  /* =====================================================
     RESET
  ===================================================== */

  const playAgain = () => {
    setI(0);
    setScore(0);
    setSelected("");
    setDone(false);
    setStreak(0);
    setBestStreak(0);
    setLives(3);
    setTimeLeft(TOTAL_TIME);
    setAnswered(false);
    setCorrectAnswer(false);
  };

  /* =====================================================
     SCORE
  ===================================================== */

  const percentage = useMemo(() => {
    return Math.round(
      (score /
        (questions.length * 20)) *
        100
    );
  }, [score]);

  /* =====================================================
     RESULT SCREEN
  ===================================================== */

  if (done) {
    return (
      <GameShell
        title="Picture Identification"
        icon="🖼️"
        studentId={studentId}
        onStudentChange={setStudentId}
      >
        <div
          style={styles.resultWrapper}
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
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              style={{
                fontSize: 72,
              }}
            >
              {percentage >= 80
                ? "🏆"
                : percentage >= 50
                ? "🎉"
                : "🌱"}
            </motion.div>

            <h1 style={styles.resultTitle}>
              {percentage >= 80
                ? "Amazing Work!"
                : percentage >= 50
                ? "Great Job!"
                : "Good Try!"}
            </h1>

            <p style={styles.resultText}>
              {studentId
                ? "Your learning mission is complete."
                : "Activity completed successfully."}
            </p>

            {/* SCORE */}

            <div
              style={
                styles.scoreContainer
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
                  POINTS
                </span>
              </div>

              <div
                style={
                  styles.resultStats
                }
              >
                <div>
                  <span>Accuracy</span>
                  <strong>
                    {percentage}%
                  </strong>
                </div>

                <div>
                  <span>Best Streak</span>
                  <strong>
                    🔥 {bestStreak}
                  </strong>
                </div>

                <div>
                  <span>Questions</span>
                  <strong>
                    {questions.length}
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
              style={styles.primary}
              onClick={playAgain}
            >
              🔄 Play Again
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
      title="Picture Identification"
      icon="🖼️"
      studentId={studentId}
      onStudentChange={setStudentId}
      score={score}
      progress={
        (i / questions.length) * 100
      }
    >
      <div
        style={
          styles.gameContainer
        }
      >
        {/* =================================================
            TOP STATS
        ================================================= */}

        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <span>⭐</span>
            <div>
              <small>SCORE</small>
              <strong>{score}</strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <span>🔥</span>
            <div>
              <small>STREAK</small>
              <strong>
                {streak}
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <span>❤️</span>
            <div>
              <small>LIVES</small>
              <strong>
                {"❤️".repeat(
                  lives
                )}
                {"🖤".repeat(
                  3 - lives
                )}
              </strong>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor:
                timeLeft <= 5
                  ? "#EF4444"
                  : "#D7E1EA",
            }}
          >
            <span>⏱️</span>
            <div>
              <small>TIME</small>

              <strong
                style={{
                  color:
                    timeLeft <= 5
                      ? "#EF4444"
                      : "#1565C0",
                }}
              >
                {timeLeft}s
              </strong>
            </div>
          </div>
        </div>

        {/* =================================================
            QUESTION
        ================================================= */}

        <AnimatePresence
          mode="wait"
        >
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              x: 40,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -40,
            }}
            transition={{
              duration: 0.3,
            }}
            style={styles.card}
          >
            {/* QUESTION NUMBER */}

            <div style={styles.questionTop}>
              <div>
                <span
                  style={
                    styles.questionNumber
                  }
                >
                  QUESTION {i + 1}
                </span>

                <span
                  style={
                    styles.questionTotal
                  }
                >
                  / {questions.length}
                </span>
              </div>

              <div
                style={
                  styles.questionProgress
                }
              >
                {questions.map(
                  (_, index) => (
                    <span
                      key={index}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius:
                          "50%",
                        background:
                          index < i
                            ? "#27AE60"
                            : index === i
                            ? "#1565C0"
                            : "#D7E1EA",
                      }}
                    />
                  )
                )}
              </div>
            </div>

            <h2 style={styles.h2}>
              What is this?
            </h2>

            {/* IMAGE */}

            <motion.div
              animate={{
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
              }}
              style={
                styles.imageContainer
              }
            >
              <div
                style={{
                  position:
                    "absolute",
                  width: 180,
                  height: 180,
                  borderRadius:
                    "50%",
                  background:
                    "rgba(21,101,192,.06)",
                  filter: "blur(15px)",
                }}
              />

              <motion.span
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                style={
                  styles.imageEmoji
                }
              >
                {q.image}
              </motion.span>
            </motion.div>

            {/* FEEDBACK */}

            <AnimatePresence>
              {answered && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  style={{
                    ...styles.feedback,
                    background:
                      correctAnswer
                        ? "#E8F5E9"
                        : "#FFEBEE",
                    color:
                      correctAnswer
                        ? "#1B7A45"
                        : "#B71C1C",
                    borderColor:
                      correctAnswer
                        ? "#A5D6A7"
                        : "#FFCDD2",
                  }}
                >
                  {correctAnswer
                    ? "🎉 Correct! Amazing!"
                    : `💡 The correct answer is ${q.answer}`}
                </motion.div>
              )}
            </AnimatePresence>

            {/* OPTIONS */}

            <div style={styles.options}>
              {q.options.map(
                (option, index) => {
                  const isSelected =
                    selected ===
                    option;

                  const isCorrect =
                    option ===
                    q.answer;

                  let optionStyle =
                    styles.option;

                  if (
                    answered &&
                    isCorrect
                  ) {
                    optionStyle = {
                      ...styles.option,
                      ...styles.correct,
                    };
                  }

                  if (
                    answered &&
                    isSelected &&
                    !isCorrect
                  ) {
                    optionStyle = {
                      ...styles.option,
                      ...styles.wrong,
                    };
                  }

                  return (
                    <motion.button
                      key={option}
                      initial={{
                        opacity: 0,
                        y: 8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          index * 0.05,
                      }}
                      whileHover={
                        !answered
                          ? {
                              y: -3,
                              scale: 1.015,
                            }
                          : {}
                      }
                      whileTap={
                        !answered
                          ? {
                              scale: 0.97,
                            }
                          : {}
                      }
                      disabled={
                        answered
                      }
                      onClick={() =>
                        choose(
                          option
                        )
                      }
                      style={
                        optionStyle
                      }
                    >
                      <span
                        style={
                          styles.optionLetter
                        }
                      >
                        {String.fromCharCode(
                          65 + index
                        )}
                      </span>

                      <span
                        style={{
                          flex: 1,
                          textAlign:
                            "left",
                        }}
                      >
                        {option}
                      </span>

                      {answered &&
                        isCorrect && (
                          <span>
                            ✓
                          </span>
                        )}

                      {answered &&
                        isSelected &&
                        !isCorrect && (
                          <span>
                            ✕
                          </span>
                        )}
                    </motion.button>
                  );
                }
              )}
            </div>

            <p style={styles.hint}>
              💡 Choose the correct
              picture name
            </p>
          </motion.div>
        </AnimatePresence>
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

  statCardEmoji: {
    fontSize: 19,
  },

  statCardSmall: {
    display: "block",
  },

  card: {
    background: "#fff",
    borderRadius: 24,
    padding: 28,
    boxShadow:
      "0 8px 30px rgba(21,101,192,.09)",
    textAlign: "center",
    border:
      "1px solid rgba(21,101,192,.07)",
  },

  questionTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  questionNumber: {
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 11,
    fontWeight: 800,
    color: "#1565C0",
    letterSpacing: 1,
  },

  questionTotal: {
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 11,
    fontWeight: 700,
    color: "#90A4AE",
  },

  questionProgress: {
    display: "flex",
    gap: 5,
  },

  h2: {
    fontFamily:
      "Poppins, sans-serif",
    color: "#0D2137",
    margin:
      "10px 0 18px",
    fontSize: 22,
    fontWeight: 800,
  },

  imageContainer: {
    height: 230,
    borderRadius: 20,
    background:
      "linear-gradient(135deg,#F6FAFF,#EEF6FF)",
    display: "grid",
    placeItems: "center",
    marginBottom: 17,
    position: "relative",
    overflow: "hidden",
    border:
      "1px solid #E1ECF5",
  },

  imageEmoji: {
    position: "relative",
    zIndex: 2,
    fontSize: 115,
    filter:
      "drop-shadow(0 8px 10px rgba(21,101,192,.12))",
  },

  options: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 10,
    maxWidth: 620,
    margin: "0 auto",
  },

  option: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding:
      "13px 15px",
    borderRadius: 14,
    border:
      "1.5px solid #D7E1EA",
    background: "#fff",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: "#263B50",
    cursor: "pointer",
    transition:
      "all .2s ease",
  },

  optionLetter: {
    width: 27,
    height: 27,
    borderRadius: 9,
    display: "grid",
    placeItems: "center",
    background: "#F0F6FF",
    color: "#1565C0",
    fontSize: 10,
    fontWeight: 800,
  },

  correct: {
    background:
      "#E8F5E9",
    borderColor:
      "#27AE60",
    color: "#1B7A45",
  },

  wrong: {
    background:
      "#FFEBEE",
    borderColor:
      "#E53935",
    color: "#B71C1C",
  },

  feedback: {
    maxWidth: 620,
    margin:
      "0 auto 12px",
    padding:
      "9px 14px",
    borderRadius: 11,
    border:
      "1px solid",
    fontFamily:
      "Poppins, sans-serif",
    fontSize: 10,
    fontWeight: 800,
  },

  hint: {
    color: "#4A6580",
    fontSize: 11,
    margin:
      "15px 0 0",
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

  scoreContainer: {
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
      "linear-gradient(135deg,#1565C0,#27AE60)",
    color: "#fff",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    boxShadow:
      "0 8px 25px rgba(21,101,192,.2)",
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
    gap: 9,
    textAlign: "left",
  },

  primary: {
    padding:
      "13px 28px",
    border: 0,
    borderRadius: 13,
    background:
      "linear-gradient(135deg,#1565C0,#27AE60)",
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
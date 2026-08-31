import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";

/* =========================================================
   CONSTANTS
========================================================= */

const P = "Poppins, sans-serif";

/* =========================================================
   LOADING DOTS
========================================================= */

function LoadingDots() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#67E8F9",
            display: "block",
            boxShadow:
              "0 0 10px rgba(103,232,249,.8)",
          }}
          animate={{
            y: [0, -7, 0],
            opacity: [0.35, 1, 0.35],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* =========================================================
   PROGRESS BAR
========================================================= */

function ProgressBar({
  value,
}: {
  value: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: 7,
        borderRadius: 99,
        overflow: "hidden",
        background:
          "rgba(255,255,255,.08)",
        border:
          "1px solid rgba(255,255,255,.08)",
      }}
    >
      <motion.div
        style={{
          height: "100%",
          borderRadius: 99,
          background:
            "linear-gradient(90deg,#1565C0,#8B5CF6,#06B6D4)",
          boxShadow:
            "0 0 15px rgba(6,182,212,.55)",
        }}
        animate={{
          width: `${value}%`,
        }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
        }}
      />
    </div>
  );
}

/* =========================================================
   BACKGROUND STARS
========================================================= */

function GalaxyStars() {
  const stars = [
    ["7%", "13%", "✦", 14],
    ["14%", "72%", "✧", 9],
    ["23%", "28%", "·", 20],
    ["31%", "82%", "✦", 11],
    ["42%", "11%", "✧", 8],
    ["52%", "76%", "·", 18],
    ["63%", "20%", "✦", 13],
    ["71%", "88%", "✧", 8],
    ["79%", "31%", "·", 17],
    ["88%", "14%", "✦", 12],
    ["94%", "66%", "✧", 9],
    ["97%", "38%", "·", 15],
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {stars.map(
        ([left, top, symbol, size], i) => (
          <motion.span
            key={i}
            style={{
              position: "absolute",
              left,
              top,
              color:
                i % 3 === 0
                  ? "#A78BFA"
                  : i % 3 === 1
                  ? "#67E8F9"
                  : "#FFFFFF",
              fontSize: Number(size),
              opacity:
                i % 3 === 0
                  ? 0.7
                  : 0.4,
              textShadow:
                "0 0 10px currentColor",
            }}
            animate={{
              opacity: [
                0.15,
                0.8,
                0.15,
              ],
              scale: [
                0.8,
                1.15,
                0.8,
              ],
            }}
            transition={{
              duration:
                2.5 + (i % 4),
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut",
            }}
          >
            {symbol}
          </motion.span>
        )
      )}
    </div>
  );
}

/* =========================================================
   GALAXY ORBS
========================================================= */

function GalaxyOrbs() {
  return (
    <>
      <motion.div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(124,58,237,.18),transparent 68%)",
          top: -200,
          right: -120,
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.08, 1],
          rotate: [0, 8, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        style={{
          position: "absolute",
          width: 460,
          height: 460,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(6,182,212,.12),transparent 68%)",
          bottom: -180,
          left: -120,
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, -10, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(139,92,246,.10),transparent 70%)",
          left: "12%",
          top: "35%",
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.18, 1],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </>
  );
}

/* =========================================================
   LOGO
========================================================= */

function GalaxyLogo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
      }}
    >
      <motion.div
        style={{
          width: 48,
          height: 48,
          borderRadius: 15,
          display: "grid",
          placeItems: "center",
          background:
            "linear-gradient(135deg,#7C3AED,#06B6D4)",
          boxShadow:
            "0 0 25px rgba(124,58,237,.4)",
        }}
        animate={{
          rotate: [0, 4, -4, 0],
          scale: [1, 1.03, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span
          style={{
            fontSize: 22,
          }}
        >
          🚀
        </span>
      </motion.div>

      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 17,
            color: "#FFFFFF",
            lineHeight: 1.1,
          }}
        >
          LEARNABLE
        </div>

        <div
          style={{
            fontFamily: P,
            fontSize: 12,
            color:
              "rgba(255,255,255,.48)",
            letterSpacing: 2,
            marginTop: 3,
          }}
        >
          LEARNING UNIVERSE
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GALAXY PLANET
========================================================= */

function GalaxyPlanet() {
  return (
    <motion.div
      style={{
        position: "relative",
        width: 170,
        height: 170,
        display: "grid",
        placeItems: "center",
      }}
      animate={{
        y: [0, -10, 0],
        rotate: [-2, 2, -2],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Orbit */}

      <div
        style={{
          position: "absolute",
          width: 165,
          height: 55,
          borderRadius: "50%",
          border:
            "2px solid rgba(103,232,249,.45)",
          transform:
            "rotate(-18deg)",
          boxShadow:
            "0 0 20px rgba(103,232,249,.18)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 190,
          height: 70,
          borderRadius: "50%",
          border:
            "1px solid rgba(167,139,250,.25)",
          transform:
            "rotate(25deg)",
        }}
      />

      {/* Planet */}

      <div
        style={{
          width: 105,
          height: 105,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 57,
          background:
            "radial-gradient(circle at 30% 25%,#C4B5FD,#7C3AED 45%,#312E81 80%)",
          boxShadow:
            "0 0 45px rgba(124,58,237,.5)",
        }}
      >
        🪐
      </div>
    </motion.div>
  );
}

/* =========================================================
   STAT CHIP
========================================================= */

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding:
          "9px 12px",
        borderRadius: 13,
        background:
          "rgba(255,255,255,.045)",
        border:
          "1px solid rgba(255,255,255,.08)",
        backdropFilter:
          "blur(10px)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          display: "grid",
          placeItems: "center",
          background: `${color}18`,
          color,
          fontSize: 19,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 16,
            color: "#FFFFFF",
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontFamily: P,
            fontSize: 12,
            color:
              "rgba(255,255,255,.42)",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SPLASH PAGE
========================================================= */

export default function SplashPage() {
  const [progress, setProgress] =
    useState(0);

  const [loadingText, setLoadingText] =
    useState(
      "Initializing learning galaxy..."
    );

  const steps = [
    "Initializing learning galaxy...",
    "Loading learning modules...",
    "Calibrating adaptive engine...",
    "Preparing your mission control...",
    "Galaxy ready!",
  ];

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setProgress((p) => {
          const next = Math.min(
            p +
              Math.random() * 16 +
              5,
            100
          );

          const stepIndex =
            Math.floor(
              (next / 100) *
                (steps.length - 1)
            );

          setLoadingText(
            steps[
              Math.min(
                stepIndex,
                steps.length - 1
              )
            ]
          );

          if (next >= 100) {
            window.clearInterval(
              interval
            );
          }

          return next;
        });
      }, 480);

    return () =>
      window.clearInterval(
        interval
      );
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: P,

        background:
          "radial-gradient(circle at 75% 5%,rgba(124,58,237,.18),transparent 30%),radial-gradient(circle at 10% 80%,rgba(6,182,212,.10),transparent 30%),#070B24",

        color: "#FFFFFF",
      }}
    >
      <GalaxyStars />
      <GalaxyOrbs />

      {/* Grid */}

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.35,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)",
          backgroundSize:
            "45px 45px",
        }}
      />

      {/* Main */}

      <motion.div
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.7,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        style={{
          position: "relative",
          zIndex: 5,
          width: 1040,
          maxWidth: "94vw",
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: 18,
          }}
        >
          <GalaxyLogo />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {[
              "About",
              "Contact",
              "Help",
            ].map((item) => (
              <button
                key={item}
                style={{
                  padding:
                    "7px 13px",
                  borderRadius: 99,
                  border:
                    "1px solid rgba(255,255,255,.09)",
                  background:
                    "rgba(255,255,255,.035)",
                  color:
                    "rgba(255,255,255,.65)",
                  fontFamily: P,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            ))}

            <Link
              to="/student"
              style={{
                padding: "8px 15px",
                borderRadius: 99,
                background: "linear-gradient(90deg,#059669,#0891b2)",
                color: "#FFFFFF",
                fontFamily: P,
                fontWeight: 800,
                fontSize: 13,
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(6,182,212,.25)",
              }}
            >
              Student →
            </Link>

            <Link
              to="/teacher"
              style={{
                padding:
                  "8px 15px",
                borderRadius: 99,
                background:
                  "linear-gradient(90deg,#7C3AED,#06B6D4)",
                color: "#FFFFFF",
                fontFamily: P,
                fontWeight: 800,
                fontSize: 13,
                textDecoration:
                  "none",
                boxShadow:
                  "0 0 20px rgba(124,58,237,.25)",
              }}
            >
              Teacher Login →
            </Link>
          </div>
        </div>

        {/* =================================================
            MAIN GLASS CARD
        ================================================= */}

        <div
          style={{
            borderRadius: 28,
            overflow: "hidden",
            background:
              "linear-gradient(135deg,rgba(19,25,61,.92),rgba(10,15,42,.96))",
            border:
              "1px solid rgba(139,92,246,.18)",
            boxShadow:
              "0 35px 90px rgba(0,0,0,.38),0 0 50px rgba(124,58,237,.08)",
            backdropFilter:
              "blur(18px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1.05fr .95fr",
              minHeight: 560,
            }}
          >
            {/* =================================================
                LEFT
            ================================================= */}

            <div
              style={{
                padding: 45,
                display: "flex",
                flexDirection:
                  "column",
                justifyContent:
                  "space-between",
                position: "relative",
              }}
            >
              {/* Mission badge */}

              <motion.div
                initial={{
                  opacity: 0,
                  x: -15,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: 0.2,
                }}
                style={{
                  width:
                    "fit-content",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 7,
                  padding:
                    "7px 11px",
                  borderRadius: 99,
                  background:
                    "rgba(6,182,212,.08)",
                  border:
                    "1px solid rgba(6,182,212,.18)",
                  color: "#67E8F9",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing:
                    1.1,
                }}
              >
                <span>●</span>
                LIVE LEARNING SYSTEM
              </motion.div>

              {/* Heading */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.3,
                }}
              >
                <h1
                  style={{
                    margin:
                      "22px 0 10px",
                    fontFamily: P,
                    fontWeight: 800,
                    fontSize: 42,
                    lineHeight: 1.08,
                    color:
                      "#FFFFFF",
                  }}
                >
                  Learning{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(90deg,#A78BFA,#67E8F9)",
                      WebkitBackgroundClip:
                        "text",
                      WebkitTextFillColor:
                        "transparent",
                    }}
                  >
                    Galaxy
                  </span>{" "}
                  🪐
                </h1>

                <p
                  style={{
                    margin: 0,
                    maxWidth: 430,
                    color:
                      "rgba(255,255,255,.52)",
                    fontSize: 16,
                    lineHeight: 1.7,
                  }}
                >
                  An intelligent adaptive
                  learning universe designed
                  to help every learner
                  discover, grow and succeed.
                </p>
              </motion.div>

              {/* Stats */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.5,
                }}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 9,
                  marginTop: 25,
                }}
              >
                <StatChip
                  icon="👨‍🎓"
                  label="Active Learners"
                  value="2,400+"
                  color="#67E8F9"
                />

                <StatChip
                  icon="🧠"
                  label="Learning Paths"
                  value="120+"
                  color="#A78BFA"
                />

                <StatChip
                  icon="⭐"
                  label="Success Rate"
                  value="94%"
                  color="#FACC15"
                />
              </motion.div>

              {/* =================================================
                  LOADING
              ================================================= */}

              <motion.div
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  delay: 0.7,
                }}
                style={{
                  marginTop: 30,
                  padding: 17,
                  borderRadius: 18,
                  background:
                    "linear-gradient(135deg,rgba(124,58,237,.13),rgba(6,182,212,.08))",
                  border:
                    "1px solid rgba(139,92,246,.15)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color:
                          "#FFFFFF",
                        marginBottom: 3,
                      }}
                    >
                      {loadingText}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "rgba(255,255,255,.38)",
                      }}
                    >
                      Preparing your
                      learning experience
                    </div>
                  </div>

                  <LoadingDots />
                </div>

                <ProgressBar
                  value={progress}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    marginTop: 6,
                    fontSize: 12,
                    color:
                      "rgba(255,255,255,.42)",
                  }}
                >
                  <span>
                    Launch sequence
                  </span>

                  <strong
                    style={{
                      color:
                        "#67E8F9",
                    }}
                  >
                    {Math.round(
                      progress
                    )}
                    %
                  </strong>
                </div>
              </motion.div>

              {/* Tags */}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 7,
                  marginTop: 12,
                }}
              >
                {[
                  "AI Powered",
                  "Accessible",
                  "Inclusive",
                  "Real-time Feedback",
                ].map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding:
                        "5px 9px",
                      borderRadius: 99,
                      background:
                        "rgba(255,255,255,.035)",
                      border:
                        "1px solid rgba(255,255,255,.07)",
                      color:
                        "rgba(255,255,255,.46)",
                      fontSize: 12,
                    }}
                  >
                    ✦ {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* =================================================
                RIGHT GALAXY
            ================================================= */}

            <div
              style={{
                position:
                  "relative",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                overflow:
                  "hidden",
                background:
                  "radial-gradient(circle at center,rgba(124,58,237,.12),transparent 55%)",
                borderLeft:
                  "1px solid rgba(255,255,255,.05)",
              }}
            >
              {/* Orbit circles */}

              <div
                style={{
                  position:
                    "absolute",
                  width: 390,
                  height: 390,
                  borderRadius:
                    "50%",
                  border:
                    "1px solid rgba(139,92,246,.10)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",
                  width: 300,
                  height: 300,
                  borderRadius:
                    "50%",
                  border:
                    "1px solid rgba(6,182,212,.09)",
                }}
              />

              {/* Planet */}

              <GalaxyPlanet />

              {/* Floating achievement */}

              <motion.div
                initial={{
                  opacity: 0,
                  x: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: 0.8,
                }}
                style={{
                  position:
                    "absolute",
                  top: 65,
                  right: 35,
                  padding:
                    "10px 13px",
                  borderRadius: 15,
                  background:
                    "rgba(15,23,55,.88)",
                  border:
                    "1px solid rgba(250,204,21,.18)",
                  boxShadow:
                    "0 10px 30px rgba(0,0,0,.25)",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                  }}
                >
                  🏆
                </span>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color:
                        "#FFFFFF",
                    }}
                  >
                    Achievement
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "rgba(255,255,255,.42)",
                    }}
                  >
                    Level 3 unlocked
                  </div>
                </div>
              </motion.div>

              {/* Progress card */}

              <motion.div
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: 0.95,
                }}
                style={{
                  position:
                    "absolute",
                  bottom: 55,
                  left: 28,
                  padding:
                    "10px 13px",
                  borderRadius: 15,
                  background:
                    "rgba(15,23,55,.88)",
                  border:
                    "1px solid rgba(6,182,212,.16)",
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                  }}
                >
                  📈
                </span>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color:
                        "#FFFFFF",
                    }}
                  >
                    Progress
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color:
                        "rgba(255,255,255,.42)",
                    }}
                  >
                    +78% this week
                  </div>
                </div>
              </motion.div>

              {/* Main message */}

              <div
                style={{
                  position:
                    "absolute",
                  bottom: 25,
                  left: 0,
                  right: 0,
                  textAlign:
                    "center",
                  fontSize: 13,
                  color:
                    "rgba(255,255,255,.38)",
                }}
              >
                Every learner has a
                <span
                  style={{
                    color:
                      "#67E8F9",
                    fontWeight: 800,
                    marginLeft: 3,
                  }}
                >
                  unique journey.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 1,
          }}
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            marginTop: 15,
            padding:
              "0 4px",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color:
                "rgba(255,255,255,.28)",
            }}
          >
            © 2025 GIID Tambaram
          </span>

          <div
            style={{
              display: "flex",
              gap: 15,
            }}
          >
            {[
              "Privacy",
              "Terms",
              "Accessibility",
            ].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: 12,
                  color:
                    "rgba(255,255,255,.28)",
                  cursor: "pointer",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* =================================================
          GLOBAL ANIMATION
      ================================================= */}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #070B24;
        }

        @media (max-width: 800px) {
          .splash-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
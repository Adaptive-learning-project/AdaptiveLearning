import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

const P = "Poppins, sans-serif";

const stars = [
  ["7%", "12%", "✦"],
  ["15%", "72%", "✧"],
  ["24%", "21%", "·"],
  ["32%", "84%", "✦"],
  ["43%", "11%", "✧"],
  ["54%", "77%", "·"],
  ["65%", "18%", "✦"],
  ["75%", "88%", "✧"],
  ["85%", "29%", "·"],
  ["94%", "65%", "✦"],
];

/* =========================================================
   LOGIN PAGE
========================================================= */

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [serverError, setServerError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [focused, setFocused] =
    useState("");

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setServerError("");

    if (!email || !password) {
      setServerError(
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Invalid email or password."
        );
      }

      /* ================================================
         SAVE AUTH DATA
      ================================================= */

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      if (remember) {
        localStorage.setItem(
          "rememberMe",
          "true"
        );
      } else {
        localStorage.removeItem(
          "rememberMe"
        );
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err: any) {
      setServerError(
        err?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INPUT STYLE
  ======================================================= */

  const inputStyle = (
    name: string
  ): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box",
    padding:
      "13px 14px",
    borderRadius: 13,
    border:
      focused === name
        ? "1px solid rgba(103,232,249,.65)"
        : "1px solid rgba(148,163,184,.16)",
    background:
      "rgba(255,255,255,.045)",
    color: "#F8FAFC",
    fontFamily: P,
    fontSize: 15,
    outline: "none",
    transition:
      "all .2s ease",
    boxShadow:
      focused === name
        ? "0 0 0 3px rgba(6,182,212,.08),0 0 20px rgba(6,182,212,.08)"
        : "none",
  });

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 80% 5%,rgba(124,58,237,.18),transparent 30%),radial-gradient(circle at 10% 85%,rgba(6,182,212,.10),transparent 30%),#070B24",
        color: "#fff",
        fontFamily: P,
      }}
    >
      {/* =================================================
          STARS
      ================================================= */}

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {stars.map(
          ([left, top, symbol], i) => (
            <motion.span
              key={i}
              style={{
                position: "absolute",
                left,
                top,
                color:
                  i % 2 === 0
                    ? "#A78BFA"
                    : "#67E8F9",
                fontSize:
                  i % 3 === 0
                    ? 14
                    : 9,
                textShadow:
                  "0 0 12px currentColor",
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
                delay:
                  i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {symbol}
            </motion.span>
          )
        )}
      </div>

      {/* =================================================
          GALAXY ORBS
      ================================================= */}

      <motion.div
        style={{
          position: "fixed",
          width: 520,
          height: 520,
          borderRadius: "50%",
          right: -200,
          top: -200,
          background:
            "radial-gradient(circle,rgba(124,58,237,.18),transparent 68%)",
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        style={{
          position: "fixed",
          width: 450,
          height: 450,
          borderRadius: "50%",
          left: -200,
          bottom: -180,
          background:
            "radial-gradient(circle,rgba(6,182,212,.11),transparent 68%)",
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* =================================================
          MAIN
      ================================================= */}

      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding:
            "30px 22px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* =================================================
            TOP BAR
        ================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            marginBottom: 17,
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              color: "#fff",
            }}
          >
            <motion.div
              whileHover={{
                rotate: 8,
                scale: 1.05,
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg,#7C3AED,#06B6D4)",
                boxShadow:
                  "0 0 23px rgba(124,58,237,.3)",
              }}
            >
              🚀
            </motion.div>

            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                LEARNABLE
              </div>

              <div
                style={{
                  fontSize: 11,
                  color:
                    "rgba(255,255,255,.4)",
                  letterSpacing: 1.6,
                  marginTop: 4,
                }}
              >
                LEARNING UNIVERSE
              </div>
            </div>
          </Link>

          <div
            style={{
              fontSize: 13,
              color:
                "rgba(255,255,255,.5)",
            }}
          >
            New to LearnAble?{" "}
            <Link
              to="/register"
              style={{
                color: "#67E8F9",
                textDecoration:
                  "none",
                fontWeight: 800,
              }}
            >
              Create account →
            </Link>
          </div>
        </div>

        {/* =================================================
            MAIN CARD
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
            scale: 0.98,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.65,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            borderRadius: 27,
            overflow: "hidden",
            background:
              "rgba(12,18,48,.90)",
            border:
              "1px solid rgba(139,92,246,.18)",
            boxShadow:
              "0 35px 90px rgba(0,0,0,.38)",
            backdropFilter:
              "blur(18px)",
          }}
        >
          {/* =================================================
              LEFT
          ================================================= */}

          <div
            style={{
              minHeight: 550,
              position: "relative",
              padding: 42,
              display: "flex",
              flexDirection:
                "column",
              justifyContent:
                "space-between",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 50% 45%,rgba(124,58,237,.13),transparent 58%)",
              borderRight:
                "1px solid rgba(255,255,255,.05)",
            }}
          >
            <div>
              <div
                style={{
                  color: "#67E8F9",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                }}
              >
                ✦ MISSION CONTROL
              </div>

              <h1
                style={{
                  fontSize: 31,
                  lineHeight: 1.12,
                  margin:
                    "13px 0 10px",
                  fontWeight: 800,
                }}
              >
                Welcome back to
                <br />
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
                  your galaxy.
                </span>
              </h1>

              <p
                style={{
                  maxWidth: 330,
                  color: "#94A3B8",
                  fontSize: 14,
                  lineHeight: 1.75,
                  margin: 0,
                }}
              >
                Continue your adaptive
                learning journey and
                discover what comes next.
              </p>
            </div>

            {/* Planet */}

            <motion.div
              style={{
                width: 230,
                height: 230,
                position: "relative",
                display: "grid",
                placeItems: "center",
                margin:
                  "0 auto",
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
              {/* Orbit 1 */}

              <div
                style={{
                  position:
                    "absolute",
                  width: 215,
                  height: 72,
                  borderRadius:
                    "50%",
                  border:
                    "2px solid rgba(103,232,249,.38)",
                  transform:
                    "rotate(-18deg)",
                  boxShadow:
                    "0 0 25px rgba(103,232,249,.12)",
                }}
              />

              {/* Orbit 2 */}

              <div
                style={{
                  position:
                    "absolute",
                  width: 180,
                  height: 60,
                  borderRadius:
                    "50%",
                  border:
                    "1px solid rgba(167,139,250,.28)",
                  transform:
                    "rotate(25deg)",
                }}
              />

              {/* Planet */}

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(124,58,237,.35)",
                    "0 0 55px rgba(124,58,237,.55)",
                    "0 0 30px rgba(124,58,237,.35)",
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 56,
                  background:
                    "radial-gradient(circle at 30% 25%,#C4B5FD,#7C3AED 45%,#312E81 80%)",
                }}
              >
                🪐
              </motion.div>
            </motion.div>

            {/* Features */}

            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {[
                [
                  "auto_awesome",
                  "Personalized learning paths",
                ],
                [
                  "psychology",
                  "Adaptive intelligence",
                ],
                [
                  "insights",
                  "Real-time learner analytics",
                ],
              ].map(
                ([icon, text]) => (
                  <motion.div
                    key={text}
                    whileHover={{
                      x: 5,
                    }}
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 9,
                      padding:
                        "8px 10px",
                      borderRadius:
                        11,
                      background:
                        "rgba(255,255,255,.035)",
                      border:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <span
                      className="material-icons-round"
                      style={{
                        color:
                          "#67E8F9",
                        fontSize: 16,
                      }}
                    >
                      {icon}
                    </span>

                    <span
                      style={{
                        color:
                          "#CBD5E1",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {text}
                    </span>
                  </motion.div>
                )
              )}
            </div>
          </div>

          {/* =================================================
              RIGHT LOGIN
          ================================================= */}

          <div
            style={{
              minHeight: 550,
              padding:
                "42px 45px",
              display: "flex",
              flexDirection:
                "column",
              justifyContent:
                "center",
            }}
          >
            <div
              style={{
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 15,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "rgba(124,58,237,.10)",
                  border:
                    "1px solid rgba(139,92,246,.18)",
                  marginBottom: 15,
                }}
              >
                🔐
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: 23,
                  fontWeight: 800,
                  color: "#F8FAFC",
                }}
              >
                Sign in
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  fontSize: 13,
                  color:
                    "#64748B",
                }}
              >
                Enter your credentials
                to access Mission Control.
              </p>
            </div>

            {/* =================================================
                FORM
            ================================================= */}

            <form
              onSubmit={handleLogin}
              style={{
                display: "grid",
                gap: 17,
              }}
            >
              {/* Email */}

              <div>
                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 6,
                    color:
                      "#CBD5E1",
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 7,
                  }}
                >
                  <span
                    className="material-icons-round"
                    style={{
                      fontSize: 18,
                      color:
                        "#67E8F9",
                    }}
                  >
                    email
                  </span>

                  EMAIL ADDRESS
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  onFocus={() =>
                    setFocused(
                      "email"
                    )
                  }
                  onBlur={() =>
                    setFocused("")
                  }
                  placeholder="teacher@example.com"
                  autoComplete="email"
                  style={inputStyle(
                    "email"
                  )}
                />
              </div>

              {/* Password */}

              <div>
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    marginBottom: 7,
                  }}
                >
                  <label
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 6,
                      color:
                        "#CBD5E1",
                      fontSize: 13,
                      fontWeight:
                        700,
                    }}
                  >
                    <span
                      className="material-icons-round"
                      style={{
                        fontSize: 18,
                        color:
                          "#67E8F9",
                      }}
                    >
                      lock
                    </span>

                    PASSWORD
                  </label>

                  <button
                    type="button"
                    style={{
                      border: 0,
                      background:
                        "transparent",
                      color:
                        "#67E8F9",
                      fontFamily: P,
                      fontSize: 11,
                      cursor:
                        "pointer",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    onFocus={() =>
                      setFocused(
                        "password"
                      )
                    }
                    onBlur={() =>
                      setFocused("")
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{
                      ...inputStyle(
                        "password"
                      ),
                      paddingRight:
                        42,
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (v) => !v
                      )
                    }
                    style={{
                      position:
                        "absolute",
                      right: 10,
                      top: "50%",
                      transform:
                        "translateY(-50%)",
                      border: 0,
                      background:
                        "transparent",
                      color:
                        "#64748B",
                      cursor:
                        "pointer",
                    }}
                  >
                    <span className="material-icons-round">
                      {showPassword
                        ? "visibility_off"
                        : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember */}

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                }}
              >
                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 7,
                    cursor:
                      "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) =>
                      setRemember(
                        e.target.checked
                      )
                    }
                    style={{
                      accentColor:
                        "#8B5CF6",
                    }}
                  />

                  <span
                    style={{
                      color:
                        "#94A3B8",
                      fontSize: 12,
                    }}
                  >
                    Remember me
                  </span>
                </label>

                <span
                  style={{
                    color:
                      "#64748B",
                    fontSize: 11,
                  }}
                >
                  Secure connection 🔒
                </span>
              </div>

              {/* Error */}

              <AnimatePresence>
                {serverError && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    style={{
                      padding:
                        "10px 12px",
                      borderRadius:
                        11,
                      background:
                        "rgba(239,68,68,.08)",
                      border:
                        "1px solid rgba(239,68,68,.18)",
                      color:
                        "#FCA5A5",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠ {serverError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login button */}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={
                  !loading
                    ? {
                        scale: 1.015,
                      }
                    : undefined
                }
                whileTap={
                  !loading
                    ? {
                        scale: 0.98,
                      }
                    : undefined
                }
                style={{
                  width: "100%",
                  padding:
                    "13px 18px",
                  border: 0,
                  borderRadius: 13,
                  background:
                    loading
                      ? "rgba(124,58,237,.4)"
                      : "linear-gradient(90deg,#1565C0,#7C3AED,#06B6D4)",
                  color: "#fff",
                  fontFamily: P,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: loading
                    ? "wait"
                    : "pointer",
                  boxShadow:
                    "0 10px 30px rgba(124,58,237,.22)",
                }}
              >
                {loading ? (
                  <span
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "center",
                      alignItems:
                        "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius:
                          "50%",
                        border:
                          "2px solid rgba(255,255,255,.3)",
                        borderTopColor:
                          "#fff",
                        display:
                          "inline-block",
                        animation:
                          "loginSpin .7s linear infinite",
                      }}
                    />

                    Connecting to
                    Galaxy...
                  </span>
                ) : (
                  <>
                    🚀 Enter Learning
                    Galaxy
                  </>
                )}
              </motion.button>
            </form>

            {/* =================================================
                SUCCESS
            ================================================= */}

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  style={{
                    marginTop: 15,
                    padding: 13,
                    borderRadius: 13,
                    textAlign:
                      "center",
                    background:
                      "rgba(34,197,94,.08)",
                    border:
                      "1px solid rgba(74,222,128,.22)",
                    color:
                      "#4ADE80",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      marginBottom: 4,
                    }}
                  >
                    🌌✨
                  </div>

                  Welcome back!
                  Entering Mission
                  Control...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Register */}

            <div
              style={{
                textAlign:
                  "center",
                marginTop: 20,
                color:
                  "#64748B",
                fontSize: 12,
              }}
            >
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{
                  color:
                    "#67E8F9",
                  textDecoration:
                    "none",
                  fontWeight:
                    800,
                }}
              >
                Create your teacher
                profile
              </Link>
            </div>

            {/* Security */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "center",
                gap: 12,
                marginTop: 20,
                paddingTop: 15,
                borderTop:
                  "1px solid rgba(255,255,255,.05)",
              }}
            >
              {[
                "🔒 Secure",
                "🧠 Adaptive",
                "✦ AI Powered",
              ].map((item) => (
                <span
                  key={item}
                  style={{
                    color:
                      "rgba(255,255,255,.28)",
                    fontSize: 11,
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div
          style={{
            textAlign:
              "center",
            marginTop: 13,
            color:
              "rgba(255,255,255,.24)",
            fontSize: 11,
          }}
        >
          ✦ LearnAble • Adaptive
          Learning Platform • GIID
          Tambaram ✦
        </div>
      </div>

      <style>{`
        @keyframes loginSpin {
          to {
            transform: rotate(360deg);
          }
        }

        input::placeholder {
          color: rgba(148,163,184,.42);
        }

        @media (max-width: 800px) {
          .login-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
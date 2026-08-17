import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import API from "../api/authApi";

const P = "Poppins, sans-serif";

const departments = [
  "Information Technology",
  "Computer Science",
  "Artificial Intelligence",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
];

const stars = [
  ["7%", "12%", "✦"],
  ["15%", "72%", "✧"],
  ["24%", "20%", "·"],
  ["31%", "84%", "✦"],
  ["43%", "11%", "✧"],
  ["54%", "76%", "·"],
  ["65%", "18%", "✦"],
  ["74%", "88%", "✧"],
  ["84%", "29%", "·"],
  ["93%", "63%", "✦"],
];

/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function getPasswordStrength(password: string) {
  if (!password) {
    return {
      score: 0,
      label: "Enter a password",
      color: "#64748B",
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) {
    return {
      score,
      label: "Weak",
      color: "#F87171",
    };
  }

  if (score === 2) {
    return {
      score,
      label: "Fair",
      color: "#FBBF24",
    };
  }

  if (score === 3) {
    return {
      score,
      label: "Good",
      color: "#67E8F9",
    };
  }

  return {
    score,
    label: "Strong",
    color: "#4ADE80",
  };
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#CBD5E1",
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 7,
        }}
      >
        <span
          className="material-icons-round"
          style={{
            fontSize: 18,
            color: "#67E8F9",
          }}
        >
          {icon}
        </span>

        {label}
      </label>

      {children}
    </div>
  );
}

/* =========================================================
   REGISTER PAGE
========================================================= */

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [agree, setAgree] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  const [focused, setFocused] =
    useState("");

  /* =====================================================
     PASSWORD
  ===================================================== */

  const passwordStrength =
    useMemo(
      () =>
        getPasswordStrength(
          form.password
        ),
      [form.password]
    );

  const passwordsMatch =
    form.confirmPassword.length > 0 &&
    form.password ===
      form.confirmPassword;

  /* =====================================================
     FORM PROGRESS
  ===================================================== */

  const completion = useMemo(() => {
    const values = [
      form.name,
      form.email,
      form.password,
      form.confirmPassword,
      form.department,
      agree,
    ];

    const completed =
      values.filter(Boolean).length;

    return Math.round(
      (completed / values.length) * 100
    );
  }, [form, agree]);

  /* =====================================================
     UPDATE
  ===================================================== */

  const update = (
    key: keyof typeof form,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setError("");
  };

  /* =====================================================
     REGISTER
  ===================================================== */

  const register = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.department
    ) {
      setError(
        "Please complete all required fields."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(
        "Your passwords do not match."
      );
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (!agree) {
      setError(
        "Please accept the terms to continue."
      );
      return;
    }

    try {
      setLoading(true);

      await API.post("/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department,
      });

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     INPUT STYLE
  ===================================================== */

  const inputStyle = (
    name: string
  ): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box",
    padding:
      "11px 13px",
    borderRadius: 12,
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
    boxShadow:
      focused === name
        ? "0 0 0 3px rgba(6,182,212,.08), 0 0 18px rgba(6,182,212,.08)"
        : "none",
    transition:
      "all .2s ease",
  });

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at 80% 5%,rgba(124,58,237,.18),transparent 30%),radial-gradient(circle at 10% 85%,rgba(6,182,212,.10),transparent 30%),#070B24",
        color: "#fff",
        fontFamily: P,
        position: "relative",
        overflow: "hidden",
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
                delay: i * 0.2,
                repeat: Infinity,
              }}
            >
              {symbol}
            </motion.span>
          )
        )}
      </div>

      {/* =================================================
          ORB
      ================================================= */}

      <motion.div
        style={{
          position: "fixed",
          width: 500,
          height: 500,
          borderRadius: "50%",
          right: -180,
          top: -180,
          background:
            "radial-gradient(circle,rgba(124,58,237,.17),transparent 68%)",
          pointerEvents: "none",
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
        }}
      />

      <motion.div
        style={{
          position: "fixed",
          width: 430,
          height: 430,
          borderRadius: "50%",
          left: -180,
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
        }}
      />

      {/* =================================================
          MAIN
      ================================================= */}

      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "30px 22px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* =================================================
            TOP
        ================================================= */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg,#7C3AED,#06B6D4)",
                boxShadow:
                  "0 0 22px rgba(124,58,237,.3)",
              }}
            >
              🚀
            </div>

            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                }}
              >
                LEARNABLE
              </div>

              <div
                style={{
                  fontSize: 11,
                  color:
                    "rgba(255,255,255,.4)",
                  letterSpacing: 1.5,
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
            Already registered?{" "}
            <Link
              to="/login"
              style={{
                color: "#67E8F9",
                fontWeight: 800,
                textDecoration:
                  "none",
              }}
            >
              Sign in →
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
            duration: 0.6,
          }}
          style={{
            display: "grid",
            gridTemplateColumns:
              "0.8fr 1.2fr",
            background:
              "rgba(12,18,48,.88)",
            border:
              "1px solid rgba(139,92,246,.18)",
            borderRadius: 27,
            overflow: "hidden",
            boxShadow:
              "0 30px 80px rgba(0,0,0,.35)",
            backdropFilter:
              "blur(18px)",
          }}
        >
          {/* =================================================
              LEFT GALAXY
          ================================================= */}

          <div
            style={{
              position: "relative",
              minHeight: 600,
              padding: 38,
              display: "flex",
              flexDirection:
                "column",
              justifyContent:
                "space-between",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 50% 45%,rgba(124,58,237,.13),transparent 55%)",
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
                  letterSpacing: 1.1,
                }}
              >
                ✦ NEW MISSION
              </div>

              <h1
                style={{
                  fontSize: 30,
                  lineHeight: 1.15,
                  margin:
                    "13px 0 9px",
                  fontWeight: 800,
                }}
              >
                Create your
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
                  learning profile
                </span>
              </h1>

              <p
                style={{
                  color:
                    "#94A3B8",
                  fontSize: 14,
                  lineHeight: 1.7,
                  maxWidth: 310,
                }}
              >
                Join the Learning Galaxy
                and unlock adaptive tools
                designed to support every
                learner.
              </p>
            </div>

            {/* Planet */}

            <motion.div
              style={{
                position: "relative",
                width: 210,
                height: 210,
                margin:
                  "0 auto",
                display: "grid",
                placeItems: "center",
              }}
              animate={{
                y: [0, -9, 0],
                rotate: [-2, 2, -2],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",
                  width: 210,
                  height: 70,
                  borderRadius:
                    "50%",
                  border:
                    "2px solid rgba(103,232,249,.35)",
                  transform:
                    "rotate(-15deg)",
                  boxShadow:
                    "0 0 25px rgba(103,232,249,.12)",
                }}
              />

              <div
                style={{
                  position:
                    "absolute",
                  width: 170,
                  height: 55,
                  borderRadius:
                    "50%",
                  border:
                    "1px solid rgba(167,139,250,.25)",
                  transform:
                    "rotate(25deg)",
                }}
              />

              <div
                style={{
                  width: 105,
                  height: 105,
                  borderRadius:
                    "50%",
                  display:
                    "grid",
                  placeItems:
                    "center",
                  fontSize: 54,
                  background:
                    "radial-gradient(circle at 30% 25%,#C4B5FD,#7C3AED 45%,#312E81 80%)",
                  boxShadow:
                    "0 0 45px rgba(124,58,237,.45)",
                }}
              >
                🪐
              </div>
            </motion.div>

            {/* Benefits */}

            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {[
                [
                  "psychology",
                  "Adaptive learning",
                ],
                [
                  "auto_awesome",
                  "AI-powered activities",
                ],
                [
                  "insights",
                  "Real-time progress",
                ],
              ].map(
                ([icon, text]) => (
                  <div
                    key={text}
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
                        fontWeight:
                          600,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* =================================================
              FORM
          ================================================= */}

          <div
            style={{
              padding:
                "32px 38px",
            }}
          >
            {/* Form header */}

            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                marginBottom:
                  18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color:
                      "#F8FAFC",
                  }}
                >
                  Create account
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color:
                      "#64748B",
                    marginTop: 3,
                  }}
                >
                  Your journey starts
                  here.
                </div>
              </div>

              <div
                style={{
                  textAlign:
                    "right",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color:
                      "#64748B",
                  }}
                >
                  PROFILE READY
                </div>

                <strong
                  style={{
                    fontSize: 17,
                    color:
                      "#67E8F9",
                  }}
                >
                  {completion}%
                </strong>
              </div>
            </div>

            {/* Progress */}

            <div
              style={{
                height: 5,
                borderRadius: 99,
                background:
                  "rgba(255,255,255,.07)",
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  background:
                    "linear-gradient(90deg,#1565C0,#8B5CF6,#06B6D4)",
                  boxShadow:
                    "0 0 14px rgba(6,182,212,.5)",
                }}
                animate={{
                  width: `${completion}%`,
                }}
              />
            </div>

            <form
              onSubmit={register}
              style={{
                display:
                  "grid",
                gap: 14,
              }}
            >
              {/* Name */}

              <Field
                label="FULL NAME"
                icon="person"
              >
                <input
                  value={form.name}
                  onChange={(e) =>
                    update(
                      "name",
                      e.target.value
                    )
                  }
                  onFocus={() =>
                    setFocused("name")
                  }
                  onBlur={() =>
                    setFocused("")
                  }
                  placeholder="Enter your full name"
                  style={
                    inputStyle("name")
                  }
                />
              </Field>

              {/* Email */}

              <Field
                label="EMAIL ADDRESS"
                icon="email"
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    update(
                      "email",
                      e.target.value
                    )
                  }
                  onFocus={() =>
                    setFocused("email")
                  }
                  onBlur={() =>
                    setFocused("")
                  }
                  placeholder="teacher@example.com"
                  style={
                    inputStyle("email")
                  }
                />
              </Field>

              {/* Department */}

              <Field
                label="DEPARTMENT"
                icon="school"
              >
                <select
                  value={
                    form.department
                  }
                  onChange={(e) =>
                    update(
                      "department",
                      e.target.value
                    )
                  }
                  onFocus={() =>
                    setFocused(
                      "department"
                    )
                  }
                  onBlur={() =>
                    setFocused("")
                  }
                  style={{
                    ...inputStyle(
                      "department"
                    ),
                    appearance:
                      "auto",
                  }}
                >
                  <option
                    value=""
                    style={{
                      background:
                        "#111936",
                    }}
                  >
                    Select your department
                  </option>

                  {departments.map(
                    (department) => (
                      <option
                        key={
                          department
                        }
                        value={
                          department
                        }
                        style={{
                          background:
                            "#111936",
                        }}
                      >
                        {department}
                      </option>
                    )
                  )}
                </select>
              </Field>

              {/* Password row */}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field
                  label="PASSWORD"
                  icon="lock"
                >
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
                      value={
                        form.password
                      }
                      onChange={(e) =>
                        update(
                          "password",
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
                      placeholder="Create password"
                      style={{
                        ...inputStyle(
                          "password"
                        ),
                        paddingRight:
                          38,
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
                        right: 9,
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

                  {/* Strength */}

                  {form.password && (
                    <div
                      style={{
                        marginTop: 7,
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          gap: 3,
                        }}
                      >
                        {[1, 2, 3, 4].map(
                          (n) => (
                            <div
                              key={n}
                              style={{
                                height: 3,
                                flex: 1,
                                borderRadius:
                                  99,
                                background:
                                  n <=
                                  passwordStrength.score
                                    ? passwordStrength.color
                                    : "rgba(255,255,255,.08)",
                                transition:
                                  "all .2s",
                              }}
                            />
                          )
                        )}
                      </div>

                      <div
                        style={{
                          color:
                            passwordStrength.color,
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight:
                            700,
                        }}
                      >
                        {passwordStrength.label}
                      </div>
                    </div>
                  )}
                </Field>

                {/* Confirm */}

                <Field
                  label="CONFIRM PASSWORD"
                  icon="verified_user"
                >
                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >
                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        form.confirmPassword
                      }
                      onChange={(e) =>
                        update(
                          "confirmPassword",
                          e.target.value
                        )
                      }
                      onFocus={() =>
                        setFocused(
                          "confirmPassword"
                        )
                      }
                      onBlur={() =>
                        setFocused("")
                      }
                      placeholder="Repeat password"
                      style={{
                        ...inputStyle(
                          "confirmPassword"
                        ),
                        paddingRight:
                          38,
                        borderColor:
                          passwordsMatch
                            ? "rgba(74,222,128,.55)"
                            : undefined,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (v) => !v
                        )
                      }
                      style={{
                        position:
                          "absolute",
                        right: 9,
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
                        {showConfirmPassword
                          ? "visibility_off"
                          : "visibility"}
                      </span>
                    </button>
                  </div>

                  {form.confirmPassword && (
                    <div
                      style={{
                        marginTop: 5,
                        color:
                          passwordsMatch
                            ? "#4ADE80"
                            : "#F87171",
                        fontSize: 11,
                        fontWeight:
                          700,
                      }}
                    >
                      {passwordsMatch
                        ? "✓ Passwords match"
                        : "✕ Passwords do not match"}
                    </div>
                  )}
                </Field>
              </div>

              {/* Terms */}

              <label
                style={{
                  display:
                    "flex",
                  alignItems:
                    "flex-start",
                  gap: 9,
                  cursor:
                    "pointer",
                  marginTop: 2,
                }}
              >
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) =>
                    setAgree(
                      e.target.checked
                    )
                  }
                  style={{
                    marginTop: 2,
                    accentColor:
                      "#8B5CF6",
                  }}
                />

                <span
                  style={{
                    fontSize: 12,
                    color:
                      "#94A3B8",
                    lineHeight: 1.5,
                  }}
                >
                  I agree to the{" "}
                  <span
                    style={{
                      color:
                        "#67E8F9",
                    }}
                  >
                    Terms of Service
                  </span>{" "}
                  and{" "}
                  <span
                    style={{
                      color:
                        "#67E8F9",
                    }}
                  >
                    Privacy Policy
                  </span>
                  .
                </span>
              </label>

              {/* Error */}

              <AnimatePresence>
                {error && (
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
                        "9px 11px",
                      borderRadius:
                        10,
                      background:
                        "rgba(239,68,68,.08)",
                      border:
                        "1px solid rgba(239,68,68,.18)",
                      color:
                        "#FCA5A5",
                      fontSize: 12,
                      fontWeight:
                        600,
                    }}
                  >
                    ⚠ {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Button */}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={
                  !loading
                    ? {
                        scale: 1.01,
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
                      ? "rgba(139,92,246,.45)"
                      : "linear-gradient(90deg,#1565C0,#7C3AED,#06B6D4)",
                  color: "#fff",
                  fontFamily: P,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: loading
                    ? "wait"
                    : "pointer",
                  boxShadow:
                    "0 8px 25px rgba(124,58,237,.20)",
                }}
              >
                {loading ? (
                  <span
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
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
                          "registerSpin .7s linear infinite",
                      }}
                    />

                    Launching profile...
                  </span>
                ) : (
                  <>
                    🚀 Create My
                    Learning Profile
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
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  style={{
                    marginTop: 12,
                    padding: 13,
                    borderRadius: 13,
                    background:
                      "rgba(34,197,94,.08)",
                    border:
                      "1px solid rgba(74,222,128,.2)",
                    textAlign:
                      "center",
                    color:
                      "#4ADE80",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  🎉 Profile created!
                  Entering your learning
                  galaxy...
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}

            <div
              style={{
                textAlign:
                  "center",
                marginTop: 17,
                color:
                  "#64748B",
                fontSize: 12,
              }}
            >
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  color:
                    "#67E8F9",
                  textDecoration:
                    "none",
                  fontWeight: 800,
                }}
              >
                Sign in
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Bottom */}

        <div
          style={{
            textAlign: "center",
            marginTop: 13,
            color:
              "rgba(255,255,255,.25)",
            fontSize: 11,
          }}
        >
          ✦ Adaptive learning •
          AI-powered education •
          Inclusive by design ✦
        </div>
      </div>

      <style>{`
        @keyframes registerSpin {
          to {
            transform: rotate(360deg);
          }
        }

        input::placeholder {
          color: rgba(148,163,184,.42);
        }

        select {
          color: #F8FAFC;
        }

        option {
          color: #F8FAFC;
          background: #111936;
        }

        @media (max-width: 850px) {
          .register-main-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
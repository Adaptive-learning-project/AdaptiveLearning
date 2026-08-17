import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate, useParams } from "react-router";
import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";

/* =========================================================
   STAR RATING
========================================================= */

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "13px 0",
        gap: 15,
      }}
    >
      <span
        style={{
          fontFamily: P,
          fontWeight: 600,
          fontSize: 14,
          color: "#CBD5E1",
          minWidth: 180,
        }}
      >
        {label}
      </span>

      <div
        style={{
          display: "flex",
          gap: 5,
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active =
            star <= (hovered || value);

          return (
            <motion.button
              key={star}
              type="button"
              whileHover={{
                scale: 1.2,
              }}
              whileTap={{
                scale: 0.9,
              }}
              onClick={() =>
                onChange(star)
              }
              onMouseEnter={() =>
                setHovered(star)
              }
              onMouseLeave={() =>
                setHovered(0)
              }
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                fontSize: 21,
                color: active
                  ? "#A78BFA"
                  : "rgba(148,163,184,.2)",
                lineHeight: 1,
                textShadow: active
                  ? "0 0 12px rgba(167,139,250,.7)"
                  : "none",
              }}
              aria-label={`Rate ${star}`}
            >
              ★
            </motion.button>
          );
        })}
      </div>

      <span
        style={{
          fontFamily: P,
          fontWeight: 700,
          fontSize: 13,
          color:
            value > 0
              ? "#67E8F9"
              : "#475569",
          minWidth: 30,
          textAlign: "right",
        }}
      >
        {value > 0
          ? `${value}/5`
          : "—"}
      </span>
    </div>
  );
}

/* =========================================================
   SELECT
========================================================= */

function ObsSelect({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [focused, setFocused] =
    useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 13,
        background: focused
          ? "rgba(6,182,212,.055)"
          : "rgba(255,255,255,.025)",
        border: `1px solid ${
          focused
            ? "rgba(103,232,249,.45)"
            : "rgba(148,163,184,.13)"
        }`,
        boxShadow: focused
          ? "0 0 0 3px rgba(6,182,212,.05)"
          : "none",
        transition:
          "all .2s ease",
      }}
    >
      <div
        style={{
          width: 31,
          height: 31,
          borderRadius: 9,
          display: "grid",
          placeItems: "center",
          background:
            "rgba(124,58,237,.08)",
          border:
            "1px solid rgba(139,92,246,.12)",
          flexShrink: 0,
        }}
      >
        <span
          className="material-icons-round"
          style={{
            fontSize: 19,
            color: focused
              ? "#67E8F9"
              : "#8B5CF6",
          }}
        >
          {icon}
        </span>
      </div>

      <label
        style={{
          fontFamily: P,
          fontWeight: 700,
          fontSize: 13,
          color: "#CBD5E1",
          minWidth: 155,
          flexShrink: 0,
        }}
      >
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        onFocus={() =>
          setFocused(true)
        }
        onBlur={() =>
          setFocused(false)
        }
        style={{
          fontFamily: P,
          fontSize: 13,
          fontWeight: 600,
          color: value
            ? "#F8FAFC"
            : "#64748B",
          background:
            "transparent",
          border: "none",
          outline: "none",
          flex: 1,
          cursor: "pointer",
        }}
      >
        <option
          value=""
          disabled
          style={{
            background:
              "#111936",
          }}
        >
          Select...
        </option>

        {options.map((o) => (
          <option
            key={o}
            value={o}
            style={{
              background:
                "#111936",
              color: "#fff",
            }}
          >
            {o}
          </option>
        ))}
      </select>

      <span
        className="material-icons-round"
        style={{
          fontSize: 19,
          color: "#475569",
        }}
      >
        expand_more
      </span>
    </div>
  );
}

/* =========================================================
   MOCK STUDENT
========================================================= */

const MOCK_STUDENT = {
  id: "1",
  name: "Aarav Kumar",
  age: 10,
  level: "Moderate",
  initials: "AK",
  session: "28 Jul 2025, 10:30 AM",
};

/* =========================================================
   PAGE
========================================================= */

export default function TeacherObservationPage() {
  const { studentId } =
    useParams<{
      studentId: string;
    }>();

  const navigate =
    useNavigate();

  const student =
    MOCK_STUDENT;

  const [overallObs, setOverallObs] =
    useState("");

  const [engagement, setEngagement] =
    useState("");

  const [assistance, setAssistance] =
    useState("");

  const [completion, setCompletion] =
    useState("");

  const [commRating, setCommRating] =
    useState(0);

  const [attnRating, setAttnRating] =
    useState(0);

  const [socialRating, setSocialRating] =
    useState(0);

  const [notes, setNotes] =
    useState("");

  const [notesFocused, setNotesFocused] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [showToast, setShowToast] =
    useState(false);

  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSave() {
    setSaving(true);

    await new Promise((r) =>
      setTimeout(r, 1000)
    );

    setSaving(false);
    setShowToast(true);

    await new Promise((r) =>
      setTimeout(r, 1500)
    );

    navigate(
      `/students/${student.id}`
    );
  }

  const levelColor =
    student.level === "Mild"
      ? "#4ADE80"
      : student.level === "Moderate"
      ? "#FBBF24"
      : "#F87171";

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 80% 5%,rgba(124,58,237,.16),transparent 30%),radial-gradient(circle at 15% 75%,rgba(6,182,212,.08),transparent 30%),#070B24",
        fontFamily: P,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* =====================================================
          GALAXY BACKGROUND
      ===================================================== */}

      <style>{`
        @keyframes observationStar {
          0%,100% {
            opacity:.2;
            transform:scale(.8);
          }
          50% {
            opacity:1;
            transform:scale(1.25);
          }
        }

        @keyframes observationFloat {
          0%,100% {
            transform:translateY(0);
          }
          50% {
            transform:translateY(-8px);
          }
        }

        .observation-star {
          animation:
            observationStar
            3s
            ease-in-out
            infinite;
        }

        .observation-float {
          animation:
            observationFloat
            5s
            ease-in-out
            infinite;
        }

        textarea::placeholder {
          color:rgba(148,163,184,.38);
        }

        select option {
          background:#111936;
          color:#fff;
        }
      `}</style>

      {/* Stars */}

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents:
            "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        {[
          ["8%", "12%", "✦"],
          ["17%", "72%", "✧"],
          ["28%", "20%", "·"],
          ["39%", "84%", "✦"],
          ["51%", "9%", "✧"],
          ["62%", "75%", "·"],
          ["73%", "18%", "✦"],
          ["84%", "88%", "✧"],
          ["94%", "30%", "·"],
        ].map(
          (
            [left, top, symbol],
            index
          ) => (
            <span
              key={index}
              className="observation-star"
              style={{
                position:
                  "absolute",
                left,
                top,
                color:
                  index % 2 === 0
                    ? "#A78BFA"
                    : "#67E8F9",
                fontSize:
                  index % 3 === 0
                    ? 13
                    : 8,
                animationDelay:
                  `${index * .25}s`,
              }}
            >
              {symbol}
            </span>
          )
        )}

        {/* Purple glow */}

        <div
          style={{
            position:
              "absolute",
            right: -180,
            top: 100,
            width: 450,
            height: 450,
            borderRadius:
              "50%",
            background:
              "radial-gradient(circle,rgba(124,58,237,.13),transparent 70%)",
            filter:
              "blur(20px)",
          }}
        />

        {/* Cyan glow */}

        <div
          style={{
            position:
              "absolute",
            left: -180,
            bottom: -150,
            width: 450,
            height: 450,
            borderRadius:
              "50%",
            background:
              "radial-gradient(circle,rgba(6,182,212,.08),transparent 70%)",
            filter:
              "blur(20px)",
          }}
        />
      </div>

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          position: "relative",
          zIndex: 2,
        }}
      >
        <Sidebar active="Students" />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <TopBar
            title="Session Observation"
            subtitle="Record learner progress and session insights"
          />

          {/* =================================================
              SUCCESS TOAST
          ================================================= */}

          <AnimatePresence>
            {showToast && (
              <motion.div
                initial={{
                  y: -60,
                  opacity: 0,
                }}
                animate={{
                  y: 0,
                  opacity: 1,
                }}
                exit={{
                  y: -60,
                  opacity: 0,
                }}
                style={{
                  position:
                    "fixed",
                  top: 15,
                  right: 25,
                  zIndex: 100,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 9,
                  padding:
                    "11px 17px",
                  borderRadius: 13,
                  background:
                    "rgba(15,23,55,.95)",
                  border:
                    "1px solid rgba(74,222,128,.25)",
                  boxShadow:
                    "0 15px 45px rgba(0,0,0,.35)",
                  backdropFilter:
                    "blur(15px)",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                  }}
                >
                  ✓
                </span>

                <span
                  style={{
                    fontFamily: P,
                    fontWeight: 700,
                    fontSize: 13,
                    color:
                      "#4ADE80",
                  }}
                >
                  Observation saved
                  successfully!
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* =================================================
              CONTENT
          ================================================= */}

          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent:
                "center",
              padding:
                "24px 25px 50px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 850,
              }}
            >
              {/* =================================================
                  BREADCRUMB
              ================================================= */}

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 7,
                  marginBottom:
                    15,
                  fontSize: 12,
                }}
              >
                <Link
                  to="/students"
                  style={{
                    color:
                      "#67E8F9",
                    textDecoration:
                      "none",
                    fontWeight: 700,
                  }}
                >
                  Students
                </Link>

                <span
                  style={{
                    color:
                      "#475569",
                  }}
                >
                  /
                </span>

                <span
                  style={{
                    color:
                      "#94A3B8",
                  }}
                >
                  Observation
                </span>
              </div>

              {/* =================================================
                  STUDENT INFO
              ================================================= */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 14,
                  flexWrap:
                    "wrap",
                  padding: 17,
                  marginBottom:
                    14,
                  borderRadius: 19,
                  background:
                    "rgba(15,23,55,.84)",
                  border:
                    "1px solid rgba(139,92,246,.15)",
                  boxShadow:
                    "0 15px 40px rgba(0,0,0,.15)",
                }}
              >
                {/* Avatar */}

                <div
                  className="observation-float"
                  style={{
                    width: 49,
                    height: 49,
                    borderRadius:
                      "50%",
                    display:
                      "grid",
                    placeItems:
                      "center",
                    background:
                      "linear-gradient(135deg,#1565C0,#7C3AED,#06B6D4)",
                    boxShadow:
                      "0 0 25px rgba(124,58,237,.25)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 18,
                    }}
                  >
                    {student.initials}
                  </span>
                </div>

                {/* Student */}

                <div
                  style={{
                    flex: 1,
                    minWidth: 200,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 18,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      {student.name}
                    </span>

                    <span
                      style={{
                        color:
                          "#64748B",
                        fontSize: 13,
                      }}
                    >
                      Age {student.age}
                    </span>

                    <span
                      style={{
                        padding:
                          "3px 8px",
                        borderRadius:
                          99,
                        background:
                          `${levelColor}12`,
                        border:
                          `1px solid ${levelColor}35`,
                        color:
                          levelColor,
                        fontSize: 11,
                        fontWeight:
                          800,
                      }}
                    >
                      {student.level}
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 5,
                      marginTop: 5,
                    }}
                  >
                    <span
                      style={{
                        color:
                          "#64748B",
                        fontSize: 12,
                      }}
                    >
                      ◷
                    </span>

                    <span
                      style={{
                        color:
                          "#64748B",
                        fontSize: 12,
                      }}
                    >
                      Session:{" "}
                      {student.session}
                    </span>
                  </div>
                </div>

                {/* Back */}

                <Link
                  to={`/students/${
                    studentId ??
                    student.id
                  }`}
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding:
                      "8px 12px",
                    borderRadius:
                      10,
                    background:
                      "rgba(6,182,212,.06)",
                    border:
                      "1px solid rgba(103,232,249,.16)",
                    color:
                      "#67E8F9",
                    fontSize: 12,
                    fontWeight:
                      700,
                    textDecoration:
                      "none",
                  }}
                >
                  ← Back
                </Link>
              </motion.div>

              {/* =================================================
                  OBSERVATION CARD
              ================================================= */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 18,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.08,
                }}
                style={{
                  padding: 22,
                  borderRadius: 21,
                  background:
                    "rgba(15,23,55,.88)",
                  border:
                    "1px solid rgba(139,92,246,.16)",
                  boxShadow:
                    "0 20px 55px rgba(0,0,0,.2)",
                }}
              >
                {/* Header */}

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 11,
                    marginBottom:
                      20,
                  }}
                >
                  <div
                    style={{
                      width: 39,
                      height: 39,
                      borderRadius:
                        11,
                      display:
                        "grid",
                      placeItems:
                        "center",
                      background:
                        "linear-gradient(135deg,#1565C0,#7C3AED)",
                      boxShadow:
                        "0 0 20px rgba(124,58,237,.2)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                      }}
                    >
                      📋
                    </span>
                  </div>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 19,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      Session Observation
                    </h2>

                    <p
                      style={{
                        margin:
                          "3px 0 0",
                        fontSize: 12,
                        color:
                          "#64748B",
                      }}
                    >
                      Record observations
                      for this learning
                      session
                    </p>
                  </div>
                </div>

                {/* =================================================
                    OBSERVATION SELECTS
                ================================================= */}

                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: 8,
                    marginBottom:
                      22,
                  }}
                >
                  <ObsSelect
                    label="OVERALL OBSERVATION"
                    icon="star"
                    value={
                      overallObs
                    }
                    onChange={
                      setOverallObs
                    }
                    options={[
                      "Excellent",
                      "Good",
                      "Average",
                      "Needs Improvement",
                    ]}
                  />

                  <ObsSelect
                    label="STUDENT ENGAGEMENT"
                    icon="psychology"
                    value={
                      engagement
                    }
                    onChange={
                      setEngagement
                    }
                    options={[
                      "High",
                      "Medium",
                      "Low",
                    ]}
                  />

                  <ObsSelect
                    label="ASSISTANCE REQUIRED"
                    icon="support_agent"
                    value={
                      assistance
                    }
                    onChange={
                      setAssistance
                    }
                    options={[
                      "Independent",
                      "Minimal Prompting",
                      "Moderate Support",
                      "Full Assistance",
                    ]}
                  />

                  <ObsSelect
                    label="ACTIVITY COMPLETION"
                    icon="task_alt"
                    value={
                      completion
                    }
                    onChange={
                      setCompletion
                    }
                    options={[
                      "Completed All",
                      "Completed Most",
                      "Partial",
                      "Did Not Complete",
                    ]}
                  />
                </div>

                {/* =================================================
                    SKILL RATINGS
                ================================================= */}

                <div
                  style={{
                    marginBottom:
                      22,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 7,
                      marginBottom:
                        9,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 19,
                      }}
                    >
                      ⭐
                    </span>

                    <span
                      style={{
                        fontSize: 14,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      Skill Ratings
                    </span>

                    <span
                      style={{
                        fontSize: 11,
                        color:
                          "#64748B",
                      }}
                    >
                      Rate from 1 to 5
                    </span>
                  </div>

                  <div
                    style={{
                      padding:
                        "3px 15px",
                      borderRadius:
                        14,
                      background:
                        "rgba(255,255,255,.025)",
                      border:
                        "1px solid rgba(148,163,184,.1)",
                    }}
                  >
                    <StarRating
                      label="Communication Skills"
                      value={
                        commRating
                      }
                      onChange={
                        setCommRating
                      }
                    />

                    <div
                      style={{
                        height: 1,
                        background:
                          "rgba(148,163,184,.08)",
                      }}
                    />

                    <StarRating
                      label="Attention & Focus"
                      value={
                        attnRating
                      }
                      onChange={
                        setAttnRating
                      }
                    />

                    <div
                      style={{
                        height: 1,
                        background:
                          "rgba(148,163,184,.08)",
                      }}
                    />

                    <StarRating
                      label="Social Participation"
                      value={
                        socialRating
                      }
                      onChange={
                        setSocialRating
                      }
                    />
                  </div>
                </div>

                {/* =================================================
                    NOTES
                ================================================= */}

                <div
                  style={{
                    marginBottom:
                      22,
                  }}
                >
                  <label
                    htmlFor="teacherNotes"
                    style={{
                      display:
                        "block",
                      marginBottom:
                        7,
                      fontSize: 13,
                      fontWeight:
                        700,
                      color:
                        "#CBD5E1",
                    }}
                  >
                    TEACHER NOTES &
                    OBSERVATIONS
                  </label>

                  <textarea
                    id="teacherNotes"
                    rows={5}
                    value={notes}
                    onChange={(e) =>
                      setNotes(
                        e.target.value
                      )
                    }
                    onFocus={() =>
                      setNotesFocused(
                        true
                      )
                    }
                    onBlur={() =>
                      setNotesFocused(
                        false
                      )
                    }
                    placeholder="Describe the student's behavior, achievements, and areas for improvement during this session..."
                    style={{
                      width:
                        "100%",
                      boxSizing:
                        "border-box",
                      fontFamily: P,
                      fontSize: 13,
                      lineHeight:
                        1.7,
                      color:
                        "#F8FAFC",
                      background:
                        notesFocused
                          ? "rgba(6,182,212,.045)"
                          : "rgba(255,255,255,.025)",
                      border: `1px solid ${
                        notesFocused
                          ? "rgba(103,232,249,.45)"
                          : "rgba(148,163,184,.13)"
                      }`,
                      borderRadius:
                        13,
                      padding:
                        "12px 14px",
                      outline:
                        "none",
                      resize:
                        "vertical",
                      transition:
                        "all .2s",
                      boxShadow:
                        notesFocused
                          ? "0 0 0 3px rgba(6,182,212,.05)"
                          : "none",
                    }}
                  />
                </div>

                {/* =================================================
                    ACTIONS
                ================================================= */}

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "flex-end",
                    gap: 9,
                  }}
                >
                  <motion.button
                    type="button"
                    onClick={() =>
                      navigate(-1)
                    }
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    style={{
                      padding:
                        "10px 16px",
                      borderRadius:
                        11,
                      border:
                        "1px solid rgba(148,163,184,.18)",
                      background:
                        "rgba(255,255,255,.035)",
                      color:
                        "#94A3B8",
                      fontFamily: P,
                      fontSize: 12,
                      fontWeight:
                        700,
                      cursor:
                        "pointer",
                    }}
                  >
                    ✕ Cancel
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={
                      handleSave
                    }
                    disabled={
                      saving
                    }
                    whileHover={
                      !saving
                        ? {
                            scale: 1.02,
                            y: -2,
                          }
                        : undefined
                    }
                    whileTap={
                      !saving
                        ? {
                            scale: 0.97,
                          }
                        : undefined
                    }
                    style={{
                      minWidth: 145,
                      padding:
                        "10px 17px",
                      border: 0,
                      borderRadius:
                        11,
                      background:
                        saving
                          ? "rgba(124,58,237,.4)"
                          : "linear-gradient(90deg,#1565C0,#7C3AED,#06B6D4)",
                      color:
                        "#fff",
                      fontFamily: P,
                      fontSize: 12,
                      fontWeight:
                        800,
                      cursor:
                        saving
                          ? "wait"
                          : "pointer",
                      boxShadow:
                        "0 8px 25px rgba(124,58,237,.2)",
                    }}
                  >
                    {saving ? (
                      <>
                        ⟳ Saving...
                      </>
                    ) : (
                      <>
                        💾 Save Observation
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
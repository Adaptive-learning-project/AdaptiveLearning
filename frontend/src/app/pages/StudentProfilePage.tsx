import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";

import API from "../api/studentApi";
import {
  getAdaptiveSummary,
  getResults,
} from "../api/resultApi";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.01,
      }}
      transition={{
        duration: 0.2,
      }}
      style={{
        background:
          "rgba(15,23,55,.82)",
        border:
          "1px solid rgba(139,92,246,.14)",
        borderRadius: 20,
        padding: 20,
        boxShadow:
          "0 8px 25px rgba(0,0,0,.16)",
      }}
    >
      <div
        style={{
          width: 45,
          height: 45,
          borderRadius: 13,
          display: "grid",
          placeItems: "center",
          background: bg,
          marginBottom: 13,
        }}
      >
        <span
          className="material-icons-round"
          style={{
            color,
            fontSize: 22,
          }}
        >
          {icon}
        </span>
      </div>

      <div
        style={{
          fontFamily: P,
          fontWeight: 800,
          fontSize: 23,
          color: "#F8FAFC",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontFamily: P,
          color: "#94A3B8",
          fontSize: 14,
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

/* =========================================================
   PROGRESS RING
========================================================= */

function ProgressRing({
  value,
}: {
  value: number;
}) {
  const safeValue = Math.min(
    100,
    Math.max(0, Number(value) || 0)
  );

  const radius = 42;
  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (safeValue / 100) *
      circumference;

  return (
    <div
      style={{
        position: "relative",
        width: 120,
        height: 120,
      }}
    >
      <svg
        width="120"
        height="120"
        style={{
          transform:
            "rotate(-90deg)",
        }}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="rgba(148,163,184,.15)"
          strokeWidth="10"
          fill="transparent"
        />

        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          stroke="url(#alpiGradient)"
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={
            circumference
          }
          initial={{
            strokeDashoffset:
              circumference,
          }}
          animate={{
            strokeDashoffset:
              offset,
          }}
          transition={{
            duration: 1,
            ease: "easeOut",
          }}
          strokeLinecap="round"
        />

        <defs>
          <linearGradient
            id="alpiGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="#1565C0"
            />

            <stop
              offset="50%"
              stopColor="#8B5CF6"
            />

            <stop
              offset="100%"
              stopColor="#06B6D4"
            />
          </linearGradient>
        </defs>
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <strong
          style={{
            color: "#F8FAFC",
            fontFamily: P,
            fontSize: 21,
          }}
        >
          {Math.round(
            safeValue
          )}
        </strong>

        <span
          style={{
            color: "#94A3B8",
            fontFamily: P,
            fontSize: 12,
          }}
        >
          ALPI
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   INFO ITEM
========================================================= */

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: any;
  icon?: string;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 13,
        background:
          "rgba(255,255,255,.035)",
        border:
          "1px solid rgba(255,255,255,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#64748B",
          fontFamily: P,
          fontSize: 13,
          marginBottom: 5,
        }}
      >
        {icon && (
          <span
            className="material-icons-round"
            style={{
              fontSize: 18,
              color: "#67E8F9",
            }}
          >
            {icon}
          </span>
        )}

        {label}
      </div>

      <div
        style={{
          fontFamily: P,
          fontWeight: 700,
          fontSize: 16,
          color: "#E2E8F0",
          wordBreak:
            "break-word",
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

/* =========================================================
   STUDENT PROFILE
========================================================= */

export default function StudentProfilePage() {
  const { id } = useParams();

  const [student, setStudent] =
    useState<any>(null);

  const [
    adaptiveSummary,
    setAdaptiveSummary,
  ] = useState<any>(null);

  const [results, setResults] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    fetchStudent();
  }, [id]);

  async function fetchStudent() {
    try {
      const res =
        await API.get(`/${id}`);

      setStudent(res.data);

      try {
        const [
          adaptiveRes,
          resultsRes,
        ] = await Promise.all([
          getAdaptiveSummary(
            id as string
          ),
          getResults(
            id as string
          ),
        ]);

        setAdaptiveSummary(
          adaptiveRes.data
        );

        setResults(
          resultsRes.data || []
        );
      } catch (performanceError) {
        console.error(
          "Unable to load learner performance:",
          performanceError
        );

        setAdaptiveSummary(
          null
        );

        setResults([]);
      }
    } catch (err) {
      console.error(
        "Unable to load student:",
        err
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "#070B24",
          color: "#67E8F9",
          fontFamily: P,
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 45,
              marginBottom: 12,
            }}
          >
            🪐
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            Loading learner galaxy...
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "#070B24",
          color: "#F8FAFC",
          fontFamily: P,
        }}
      >
        <div
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 45,
            }}
          >
            🌌
          </div>

          <h2>
            Student not found
          </h2>

          <Link
            to="/students"
            style={{
              color: "#67E8F9",
              textDecoration:
                "none",
            }}
          >
            ← Back to Students
          </Link>
        </div>
      </div>
    );
  }

  /* =====================================================
     DATA
  ===================================================== */

  const initials =
    student.name
      ?.split(" ")
      .map(
        (x: string) =>
          x[0]
      )
      .join("")
      .substring(0, 2)
      .toUpperCase() || "ST";

  const domainProgress = (
    adaptiveSummary?.domainMastery ||
    []
  ).map((item: any) => ({
    label: item.domain,
    alpi: Number(
      item.mastery || 0
    ),
  }));

  const recentResults =
    results.slice(0, 5);

  const recentProgress =
    results
      .slice(0, 7)
      .reverse()
      .map(
        (
          item: any,
          index: number
        ) => ({
          label:
            item.activityName
              ? item.activityName.slice(
                  0,
                  12
                )
              : `A${index + 1}`,

          alpi: Number(
            item.accuracy || 0
          ),
        })
      );

  const currentALPI = Math.round(
    Number(
      adaptiveSummary?.alpi ??
        student.alpiScore ??
        0
    )
  );

  const totalActivities =
    adaptiveSummary?.totalActivities ??
    results.length;

  /* =====================================================
     LEVEL COLOR
  ===================================================== */

  const levelColor =
    student.learningLevel ===
    "Advanced"
      ? "#A78BFA"
      : student.learningLevel ===
        "Intermediate"
      ? "#67E8F9"
      : "#60A5FA";

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 75% 0%,rgba(124,58,237,.17),transparent 30%),radial-gradient(circle at 10% 70%,rgba(6,182,212,.08),transparent 30%),#070B24",
        color: "#fff",
        fontFamily: P,
      }}
    >
      {/* =================================================
          GALAXY ANIMATIONS
      ================================================= */}

      <style>{`

        @keyframes profileStar {
          0%,100% {
            opacity:.2;
            transform:scale(.8);
          }

          50% {
            opacity:.8;
            transform:scale(1.2);
          }
        }

        @keyframes profilePlanet {
          0%,100% {
            transform:translateY(0) rotate(-4deg);
          }

          50% {
            transform:translateY(-8px) rotate(4deg);
          }
        }

        @keyframes profileGlow {
          0%,100% {
            opacity:.3;
          }

          50% {
            opacity:.7;
          }
        }

        .profile-planet {
          animation:
            profilePlanet
            4s
            ease-in-out
            infinite;
        }

        .profile-star {
          animation:
            profileStar
            3s
            ease-in-out
            infinite;
        }

        .profile-glow {
          animation:
            profileGlow
            5s
            ease-in-out
            infinite;
        }

      `}</style>

      {/* =================================================
          BACKGROUND STARS
      ================================================= */}

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
          ["7%", "15%", "✦"],
          ["15%", "70%", "✧"],
          ["25%", "25%", "✦"],
          ["34%", "85%", "·"],
          ["45%", "12%", "✧"],
          ["55%", "73%", "✦"],
          ["66%", "18%", "·"],
          ["76%", "88%", "✧"],
          ["85%", "30%", "✦"],
          ["94%", "68%", "·"],
        ].map(
          (
            [left, top, symbol],
            i
          ) => (
            <span
              key={i}
              className="profile-star"
              style={{
                position:
                  "absolute",
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
                animationDelay:
                  `${i * .25}s`,
              }}
            >
              {symbol}
            </span>
          )
        )}

        <div
          className="profile-glow"
          style={{
            position:
              "absolute",
            right: -180,
            top: 150,
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
      </div>

      {/* =================================================
          LAYOUT
      ================================================= */}

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
            flexDirection:
              "column",
          }}
        >
          <TopBar
            title="Student Profile"
            subtitle="Explore learner progress, mastery and development"
          />

          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding:
                "25px 30px 60px",
            }}
          >
            <div
              style={{
                maxWidth: 1250,
                margin: "0 auto",
              }}
            >
              {/* =================================================
                  BREADCRUMB
              ================================================= */}

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  marginBottom: 18,
                  fontSize: 14,
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
                      "#64748B",
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
                  {student.name}
                </span>
              </div>

              {/* =================================================
                  HERO CARD
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
                transition={{
                  duration: 0.5,
                }}
                style={{
                  position:
                    "relative",
                  overflow:
                    "hidden",
                  borderRadius: 24,
                  background:
                    "rgba(15,23,55,.84)",
                  border:
                    "1px solid rgba(139,92,246,.16)",
                  boxShadow:
                    "0 15px 40px rgba(0,0,0,.20)",
                  marginBottom: 20,
                }}
              >
                {/* Gradient header */}

                <div
                  style={{
                    height: 115,
                    background:
                      "linear-gradient(135deg,rgba(21,101,192,.85),rgba(124,58,237,.85),rgba(6,182,212,.65))",
                    position:
                      "relative",
                  }}
                >
                  <div
                    style={{
                      position:
                        "absolute",
                      right: 45,
                      top: 18,
                      fontSize: 65,
                      opacity: 0.35,
                    }}
                    className="profile-planet"
                  >
                    🪐
                  </div>

                  <div
                    style={{
                      position:
                        "absolute",
                      left: 40,
                      top: 22,
                      color:
                        "rgba(255,255,255,.7)",
                      fontSize: 16,
                    }}
                  >
                    ✦ &nbsp; LEARNER
                    PROFILE
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      "0 28px 25px",
                    marginTop:
                      -43,
                    position:
                      "relative",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-end",
                      gap: 20,
                    }}
                  >
                    {/* Student */}

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 16,
                        alignItems:
                          "flex-end",
                      }}
                    >
                      <div
                        style={{
                          width: 90,
                          height: 90,
                          flexShrink: 0,
                          borderRadius:
                            "50%",
                          background:
                            "linear-gradient(135deg,#1565C0,#8B5CF6,#06B6D4)",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          border:
                            "4px solid #0F1737",
                          boxShadow:
                            "0 0 25px rgba(124,58,237,.3)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 25,
                            fontWeight:
                              800,
                            color:
                              "#fff",
                          }}
                        >
                          {initials}
                        </span>
                      </div>

                      <div
                        style={{
                          paddingBottom:
                            2,
                        }}
                      >
                        <h2
                          style={{
                            fontFamily:
                              P,
                            fontWeight:
                              800,
                            fontSize: 22,
                            margin:
                              "0 0 5px",
                            color:
                              "#F8FAFC",
                          }}
                        >
                          {student.name}
                        </h2>

                        <div
                          style={{
                            fontSize: 14,
                            color:
                              "#94A3B8",
                          }}
                        >
                          {student.studentCode}
                          {" • "}
                          {student.age}{" "}
                          Years
                          {" • "}
                          {student.gender}
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap: 7,
                            marginTop:
                              9,
                          }}
                        >
                          <span
                            style={{
                              padding:
                                "5px 10px",
                              borderRadius:
                                99,
                              background:
                                `${levelColor}18`,
                              border:
                                `1px solid ${levelColor}40`,
                              color:
                                levelColor,
                              fontSize: 12,
                              fontWeight:
                                800,
                            }}
                          >
                            ✦{" "}
                            {student.learningLevel ||
                              "Beginner"}
                          </span>

                          <span
                            style={{
                              padding:
                                "5px 10px",
                              borderRadius:
                                99,
                              background:
                                "rgba(34,197,94,.10)",
                              border:
                                "1px solid rgba(34,197,94,.2)",
                              color:
                                "#4ADE80",
                              fontSize: 12,
                              fontWeight:
                                800,
                            }}
                          >
                            ●{" "}
                            {student.status ||
                              "Active"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                      }}
                    >
                      <Link
                        to={`/students/edit/${student._id}`}
                        style={{
                          textDecoration:
                            "none",
                        }}
                      >
                        <button
                          style={{
                            padding:
                              "9px 15px",
                            borderRadius:
                              11,
                            border:
                              "1px solid rgba(103,232,249,.18)",
                            background:
                              "rgba(6,182,212,.08)",
                            color:
                              "#67E8F9",
                            fontFamily:
                              P,
                            fontWeight:
                              700,
                            fontSize: 14,
                            cursor:
                              "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </Link>

                      <Link
                        to={`/observation/${student._id}`}
                        style={{
                          textDecoration:
                            "none",
                        }}
                      >
                        <button
                          style={{
                            padding:
                              "9px 15px",
                            borderRadius:
                              11,
                            border:
                              "1px solid rgba(139,92,246,.2)",
                            background:
                              "rgba(139,92,246,.09)",
                            color:
                              "#C4B5FD",
                            fontFamily:
                              P,
                            fontWeight:
                              700,
                            fontSize: 14,
                            cursor:
                              "pointer",
                          }}
                        >
                          👁 Observe
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* =================================================
                  STATISTICS
              ================================================= */}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(4,1fr)",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <StatCard
                  label="FACP Score"
                  value={String(
                    student.facpScore ||
                      0
                  )}
                  icon="assessment"
                  color="#4ADE80"
                  bg="rgba(34,197,94,.10)"
                />

                <StatCard
                  label="Learning Level"
                  value={
                    student.learningLevel ||
                    "Beginner"
                  }
                  icon="school"
                  color="#67E8F9"
                  bg="rgba(6,182,212,.10)"
                />

                <StatCard
                  label="Learning Status"
                  value={
                    student.status ||
                    "Active"
                  }
                  icon="check_circle"
                  color="#FBBF24"
                  bg="rgba(251,191,36,.10)"
                />

                <motion.div
                  whileHover={{
                    y: -4,
                  }}
                  style={{
                    background:
                      "rgba(15,23,55,.82)",
                    border:
                      "1px solid rgba(139,92,246,.14)",
                    borderRadius: 20,
                    padding: 10,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <ProgressRing
                    value={
                      currentALPI
                    }
                  />
                </motion.div>
              </div>

              {/* =================================================
                  GUARDIAN INFORMATION
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
                transition={{
                  delay: 0.1,
                }}
                style={{
                  background:
                    "rgba(15,23,55,.82)",
                  border:
                    "1px solid rgba(139,92,246,.14)",
                  borderRadius: 20,
                  padding: 22,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    marginBottom:
                      15,
                  }}
                >
                  <span
                    style={{
                      fontSize: 21,
                    }}
                  >
                    👨‍👩‍👧
                  </span>

                  <div>
                    <h3
                      style={{
                        margin: 0,
                        color:
                          "#F8FAFC",
                        fontSize: 18,
                        fontWeight:
                          800,
                      }}
                    >
                      Guardian Information
                    </h3>

                    <span
                      style={{
                        color:
                          "#64748B",
                        fontSize: 13,
                      }}
                    >
                      Learner support
                      information
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3,1fr)",
                    gap: 10,
                  }}
                >
                  <Info
                    label="Guardian Name"
                    value={
                      student.guardianName
                    }
                    icon="person"
                  />

                  <Info
                    label="Phone"
                    value={
                      student.guardianPhone
                    }
                    icon="phone"
                  />

                  <Info
                    label="Address"
                    value={
                      student.address ||
                      "-"
                    }
                    icon="location_on"
                  />
                </div>
              </motion.div>

              {/* =================================================
                  CHARTS
              ================================================= */}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 18,
                  marginBottom: 20,
                }}
              >
                {/* Domain Mastery */}

                <motion.div
                  whileHover={{
                    y: -2,
                  }}
                  style={{
                    background:
                      "rgba(15,23,55,.82)",
                    border:
                      "1px solid rgba(139,92,246,.14)",
                    borderRadius: 20,
                    padding: 22,
                  }}
                >
                  <div
                    style={{
                      marginBottom:
                        12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      🪐 Domain Mastery
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color:
                          "#64748B",
                        marginTop: 3,
                      }}
                    >
                      Learning performance
                      by domain
                    </div>
                  </div>

                  {domainProgress.length >
                  0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height={240}
                    >
                      <BarChart
                        data={
                          domainProgress
                        }
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,.12)"
                        />

                        <XAxis
                          dataKey="label"
                          tick={{
                            fill: "#94A3B8",
                            fontSize: 13,
                          }}
                          axisLine={{
                            stroke:
                              "rgba(148,163,184,.15)",
                          }}
                        />

                        <YAxis
                          domain={[
                            0,
                            100,
                          ]}
                          tick={{
                            fill: "#94A3B8",
                            fontSize: 13,
                          }}
                          axisLine={{
                            stroke:
                              "rgba(148,163,184,.15)",
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            background:
                              "#111936",
                            border:
                              "1px solid rgba(139,92,246,.25)",
                            borderRadius:
                              10,
                            color:
                              "#fff",
                            fontSize: 14,
                          }}
                        />

                        <Bar
                          dataKey="alpi"
                          fill="#8B5CF6"
                          radius={[
                            6,
                            6,
                            0,
                            0,
                          ]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        height: 240,
                        display:
                          "grid",
                        placeItems:
                          "center",
                        color:
                          "#64748B",
                        fontSize: 15,
                      }}
                    >
                      No domain data
                      available yet.
                    </div>
                  )}
                </motion.div>

                {/* Recent Activity */}

                <motion.div
                  whileHover={{
                    y: -2,
                  }}
                  style={{
                    background:
                      "rgba(15,23,55,.82)",
                    border:
                      "1px solid rgba(139,92,246,.14)",
                    borderRadius: 20,
                    padding: 22,
                  }}
                >
                  <div
                    style={{
                      marginBottom:
                        12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      📈 Activity Performance
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color:
                          "#64748B",
                        marginTop: 3,
                      }}
                    >
                      Recent learning
                      accuracy
                    </div>
                  </div>

                  {recentProgress.length >
                  0 ? (
                    <ResponsiveContainer
                      width="100%"
                      height={240}
                    >
                      <LineChart
                        data={
                          recentProgress
                        }
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,.12)"
                        />

                        <XAxis
                          dataKey="label"
                          tick={{
                            fill: "#94A3B8",
                            fontSize: 12,
                          }}
                          axisLine={{
                            stroke:
                              "rgba(148,163,184,.15)",
                          }}
                        />

                        <YAxis
                          domain={[
                            0,
                            100,
                          ]}
                          tick={{
                            fill: "#94A3B8",
                            fontSize: 13,
                          }}
                          axisLine={{
                            stroke:
                              "rgba(148,163,184,.15)",
                          }}
                        />

                        <Tooltip
                          contentStyle={{
                            background:
                              "#111936",
                            border:
                              "1px solid rgba(6,182,212,.25)",
                            borderRadius:
                              10,
                            color:
                              "#fff",
                            fontSize: 14,
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="alpi"
                          stroke="#06B6D4"
                          strokeWidth={
                            3
                          }
                          dot={{
                            fill:
                              "#06B6D4",
                            strokeWidth:
                              0,
                            r: 4,
                          }}
                          activeDot={{
                            r: 6,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      style={{
                        height: 240,
                        display:
                          "grid",
                        placeItems:
                          "center",
                        color:
                          "#64748B",
                        fontSize: 15,
                      }}
                    >
                      No activity results
                      yet.
                    </div>
                  )}
                </motion.div>
              </div>

              {/* =================================================
                  ALPI EXPLANATION
              ================================================= */}

              <motion.div
                whileHover={{
                  scale: 1.005,
                }}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 15,
                  padding: 17,
                  borderRadius: 17,
                  marginBottom: 20,
                  background:
                    "linear-gradient(90deg,rgba(124,58,237,.10),rgba(6,182,212,.07))",
                  border:
                    "1px solid rgba(139,92,246,.15)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius:
                      13,
                    display:
                      "grid",
                    placeItems:
                      "center",
                    background:
                      "rgba(139,92,246,.13)",
                    fontSize: 20,
                  }}
                >
                  🧠
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight:
                        800,
                      color:
                        "#C4B5FD",
                      letterSpacing:
                        0.5,
                    }}
                  >
                    ADAPTIVE LEARNING
                    PERFORMANCE INDEX
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color:
                        "#94A3B8",
                      marginTop: 3,
                    }}
                  >
                    ALPI is calculated
                    from the average
                    accuracy of completed
                    learning activities.
                    Current activities:
                    {" "}
                    <strong
                      style={{
                        color:
                          "#67E8F9",
                      }}
                    >
                      {totalActivities}
                    </strong>
                  </div>
                </div>
              </motion.div>

              {/* =================================================
                  STUDENT INFORMATION
              ================================================= */}

              <motion.div
                whileHover={{
                  y: -2,
                }}
                style={{
                  background:
                    "rgba(15,23,55,.82)",
                  border:
                    "1px solid rgba(139,92,246,.14)",
                  borderRadius: 20,
                  padding: 22,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    marginBottom:
                      15,
                  }}
                >
                  <span
                    style={{
                      fontSize: 21,
                    }}
                  >
                    👨‍🎓
                  </span>

                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      Student Information
                    </h3>

                    <span
                      style={{
                        fontSize: 13,
                        color:
                          "#64748B",
                      }}
                    >
                      Learner profile
                      details
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4,1fr)",
                    gap: 10,
                  }}
                >
                  <Info
                    label="Student Code"
                    value={
                      student.studentCode
                    }
                    icon="badge"
                  />

                  <Info
                    label="Gender"
                    value={
                      student.gender
                    }
                    icon="wc"
                  />

                  <Info
                    label="Age"
                    value={`${student.age || "-"} Years`}
                    icon="cake"
                  />

                  <Info
                    label="Disability Level"
                    value={
                      student.disabilityLevel
                    }
                    icon="psychology"
                  />

                  <Info
                    label="Learning Level"
                    value={
                      student.learningLevel
                    }
                    icon="school"
                  />

                  <Info
                    label="Guardian"
                    value={
                      student.guardianName
                    }
                    icon="person"
                  />

                  <Info
                    label="Guardian Phone"
                    value={
                      student.guardianPhone
                    }
                    icon="phone"
                  />

                  <Info
                    label="Address"
                    value={
                      student.address ||
                      "-"
                    }
                    icon="location_on"
                  />
                </div>
              </motion.div>

              {/* =================================================
                  RECENT RESULTS
              ================================================= */}

              <motion.div
                style={{
                  background:
                    "rgba(15,23,55,.82)",
                  border:
                    "1px solid rgba(139,92,246,.14)",
                  borderRadius: 20,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    marginBottom:
                      15,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      🎯 Recent Learning
                      Results
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color:
                          "#64748B",
                        marginTop: 3,
                      }}
                    >
                      Latest completed
                      activities
                    </div>
                  </div>

                  <span
                    style={{
                      padding:
                        "5px 9px",
                      borderRadius:
                        99,
                      background:
                        "rgba(6,182,212,.08)",
                      color:
                        "#67E8F9",
                      fontSize: 12,
                      fontWeight:
                        800,
                    }}
                  >
                    {recentResults.length}{" "}
                    RESULTS
                  </span>
                </div>

                {recentResults.length >
                0 ? (
                  <div
                    style={{
                      overflowX:
                        "auto",
                    }}
                  >
                    <table
                      style={{
                        width:
                          "100%",
                        borderCollapse:
                          "collapse",
                        fontSize: 14,
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            "Activity",
                            "Domain",
                            "Accuracy",
                            "Score",
                            "Level",
                          ].map(
                            (header) => (
                              <th
                                key={
                                  header
                                }
                                style={{
                                  textAlign:
                                    "left",
                                  padding:
                                    "9px 8px",
                                  color:
                                    "#64748B",
                                  borderBottom:
                                    "1px solid rgba(255,255,255,.07)",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {header}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {recentResults.map(
                          (
                            result: any,
                            index: number
                          ) => (
                            <tr
                              key={
                                result._id ||
                                index
                              }
                            >
                              <td
                                style={{
                                  padding:
                                    "11px 8px",
                                  color:
                                    "#E2E8F0",
                                  fontWeight:
                                    700,
                                }}
                              >
                                {result.activityName ||
                                  "Learning Activity"}
                              </td>

                              <td
                                style={{
                                  padding:
                                    "11px 8px",
                                  color:
                                    "#94A3B8",
                                }}
                              >
                                {result.domain ||
                                  "Academic"}
                              </td>

                              <td
                                style={{
                                  padding:
                                    "11px 8px",
                                }}
                              >
                                <span
                                  style={{
                                    color:
                                      Number(
                                        result.accuracy
                                      ) >=
                                      80
                                        ? "#4ADE80"
                                        : Number(
                                            result.accuracy
                                          ) >=
                                          50
                                        ? "#FBBF24"
                                        : "#F87171",
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {result.accuracy ??
                                    0}
                                  %
                                </span>
                              </td>

                              <td
                                style={{
                                  padding:
                                    "11px 8px",
                                  color:
                                    "#C4B5FD",
                                  fontWeight:
                                    800,
                                }}
                              >
                                {result.score ??
                                  0}
                              </td>

                              <td
                                style={{
                                  padding:
                                    "11px 8px",
                                  color:
                                    "#94A3B8",
                                }}
                              >
                                {result.level ||
                                  "Beginner"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding:
                        "35px 20px",
                      textAlign:
                        "center",
                      color:
                        "#64748B",
                      fontSize: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 30,
                        marginBottom:
                          8,
                      }}
                    >
                      🌱
                    </div>

                    No completed
                    learning activities
                    yet.
                  </div>
                )}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
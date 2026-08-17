import { useEffect, useMemo, useState } from "react";
import { Sidebar, TopBar } from "./DashboardPage";
import { getAnalytics } from "../api/resultApi";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const P = "Poppins, sans-serif";

const colors = [
  "#8b5cf6",
  "#22d3ee",
  "#facc15",
  "#fb7185",
  "#4ade80",
  "#60a5fa",
];

const panel = {
  background: "rgba(255,255,255,.035)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 24,
  boxShadow: "0 20px 60px rgba(0,0,0,.12)",
};

export default function ALPIDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedStudent, setSelectedStudent] =
    useState<any>(null);

  const [studentSearch, setStudentSearch] =
    useState("");

  const [levelFilter, setLevelFilter] =
    useState("All");

  const [hoveredStudent, setHoveredStudent] =
    useState<string | null>(null);

  const [selectedDomain, setSelectedDomain] =
    useState<string | null>(null);

  const [hoveredStat, setHoveredStat] =
    useState<string | null>(null);

  useEffect(() => {
    getAnalytics()
      .then((r) => setData(r.data))
      .catch((e) =>
        setError(
          e?.response?.data?.message ||
            "Unable to load analytics"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const students = data?.studentProgress || [];
  const domain = data?.domainMastery || [];
  const activities = data?.activityDistribution || [];
  const timeline = data?.timeline || [];

  const avg = data?.avgAccuracy || 0;

  const best = useMemo(
    () =>
      students.length
        ? Math.max(
            ...students.map(
              (s: any) => Number(s.alpi) || 0
            )
          )
        : 0,
    [students]
  );

  const bestStudent = useMemo(
    () =>
      students.length
        ? students.reduce(
            (best: any, student: any) =>
              Number(student.alpi) >
              Number(best.alpi)
                ? student
                : best,
            students[0]
          )
        : null,
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student: any) => {
      const name =
        student.name?.toLowerCase() || "";

      const matchesSearch = name.includes(
        studentSearch.toLowerCase()
      );

      const studentLevel =
        student.learningLevel || "Beginner";

      const matchesLevel =
        levelFilter === "All" ||
        studentLevel === levelFilter;

      return (
        matchesSearch && matchesLevel
      );
    });
  }, [
    students,
    studentSearch,
    levelFilter,
  ]);

  const selectedDomainData = useMemo(() => {
    if (!selectedDomain) return null;

    return (
      domain.find(
        (item: any) =>
          item.domain === selectedDomain
      ) || null
    );
  }, [domain, selectedDomain]);

  const getPerformanceLabel = (
    accuracy: number
  ) => {
    if (accuracy >= 85)
      return {
        label: "Excellent",
        color: "#4ade80",
        icon: "🌟",
      };

    if (accuracy >= 70)
      return {
        label: "Growing",
        color: "#22d3ee",
        icon: "🚀",
      };

    if (accuracy >= 50)
      return {
        label: "Developing",
        color: "#facc15",
        icon: "🌱",
      };

    return {
      label: "Needs Focus",
      color: "#fb7185",
      icon: "💡",
    };
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 75% 0%, rgba(124,58,237,.16), transparent 30%), radial-gradient(circle at 10% 60%, rgba(6,182,212,.07), transparent 28%), #070b24",
        color: "#fff",
        fontFamily: P,
      }}
    >
      <Sidebar active="Analytics" />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopBar
          title="Learning Galaxy"
          subtitle="Explore learner progress, mastery and performance"
        />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 24px 70px",
            position: "relative",
          }}
        >
          <style>{`
            @keyframes saturnFloat {
              0% {
                transform: translateY(0px) rotate(-3deg);
              }

              25% {
                transform: translateY(-7px) rotate(2deg);
              }

              50% {
                transform: translateY(0px) rotate(4deg);
              }

              75% {
                transform: translateY(7px) rotate(-2deg);
              }

              100% {
                transform: translateY(0px) rotate(-3deg);
              }
            }

            .saturn-orbit {
              animation: saturnGlow 4s ease-in-out infinite;
            }

            @keyframes saturnGlow {
              0%, 100% {
                box-shadow: 0 0 0 rgba(124,58,237,0);
              }

              50% {
                box-shadow: 0 0 35px rgba(124,58,237,.18);
              }
            }
          `}</style>
  
          {/* =====================================================
              BACKGROUND STARS
          ===================================================== */}

          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              overflow: "hidden",
              zIndex: 0,
            }}
          >
            {[
              ["8%", "12%"],
              ["18%", "72%"],
              ["32%", "18%"],
              ["48%", "83%"],
              ["63%", "10%"],
              ["78%", "66%"],
              ["91%", "25%"],
              ["96%", "82%"],
            ].map(
              ([left, top], i) => (
                <span
                  key={i}
                  style={{
                    position:
                      "absolute",
                    left,
                    top,
                    color:
                      i % 2 === 0
                        ? "#a78bfa"
                        : "#67e8f9",
                    opacity:
                      i % 3 === 0
                        ? 0.5
                        : 0.25,
                    fontSize:
                      i % 2 === 0
                        ? 14
                        : 9,
                  }}
                >
                  {i % 2 === 0
                    ? "✦"
                    : "✧"}
                </span>
              )
            )}
          </div>

          <div
            style={{
              position:
                "relative",
              zIndex: 2,
            }}
          >
            {/* =====================================================
                HERO
            ===================================================== */}

            <section
              style={{
                ...panel,
                position:
                  "relative",
                overflow: "hidden",
                padding: 30,
                marginBottom: 22,
                background:
                  "linear-gradient(135deg,rgba(124,58,237,.15),rgba(6,182,212,.05),rgba(255,255,255,.025))",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",
                  right: -25,
                  top: -65,
                  fontSize: 180,
                  opacity: 0.025,
                }}
              >
                🌌
              </div>

              <div
                style={{
                  position:
                    "relative",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: 25,
                }}
              >
                <div>
                  <div
                    style={{
                      display:
                        "inline-flex",
                      padding:
                        "6px 11px",
                      borderRadius: 999,
                      background:
                        "rgba(34,211,238,.08)",
                      border:
                        "1px solid rgba(34,211,238,.14)",
                      color:
                        "#67e8f9",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing:
                        ".15em",
                    }}
                  >
                    ● LIVE LEARNING DATA
                  </div>

                  <h1
                    style={{
                      margin:
                        "14px 0 7px",
                      fontSize:
                        "clamp(26px,4vw,40px)",
                      fontWeight: 900,
                      letterSpacing:
                        "-.04em",
                    }}
                  >
                    Learning{" "}
                    <span
                      style={{
                        background:
                          "linear-gradient(90deg,#a78bfa,#22d3ee)",
                        WebkitBackgroundClip:
                          "text",
                        WebkitTextFillColor:
                          "transparent",
                      }}
                    >
                      Galaxy
                    </span>{" "}
                    🌌
                  </h1>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: 620,
                      color:
                        "#64748b",
                      fontSize: 15,
                      lineHeight: 1.8,
                    }}
                  >
                    Explore how learners
                    are growing, discover
                    their strengths and
                    identify the next skills
                    to unlock.
                  </p>
                </div>

               <div
  className="saturn-orbit"
  style={{
    width: 125,
    height: 125,
    flexShrink: 0,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle,rgba(124,58,237,.3),rgba(6,182,212,.08),transparent 70%)",
    border:
      "1px solid rgba(167,139,250,.18)",
    position: "relative",
  }}
>
  <span
    style={{
      fontSize: 54,
      display: "inline-block",
      animation: "saturnFloat 3s ease-in-out infinite",
      filter:
        "drop-shadow(0 0 15px rgba(250,204,21,.35))",
    }}
  >
    🪐
  </span>
</div>
              </div>
            </section>

            {/* =====================================================
                LOADING / ERROR
            ===================================================== */}

            {loading ? (
              <div
                style={{
                  ...panel,
                  padding: 60,
                  textAlign:
                    "center",
                  color:
                    "#64748b",
                }}
              >
                <div
                  style={{
                    fontSize: 42,
                    marginBottom: 12,
                  }}
                >
                  🛰️
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Scanning the learning
                  galaxy...
                </div>
              </div>
            ) : error ? (
              <div
                style={{
                  ...panel,
                  padding: 30,
                  color:
                    "#fb7185",
                }}
              >
                ⚠️ {error}
              </div>
            ) : (
              <>
                {/* =================================================
                    STAT CARDS
                ================================================= */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4,minmax(0,1fr))",
                    gap: 16,
                    marginBottom: 22,
                  }}
                >
                  {[
                    {
                      title:
                        "Learners",
                      value:
                        data?.totalStudents ||
                        0,
                      sub:
                        "explorers",
                      icon: "🧑‍🚀",
                      color:
                        "#22d3ee",
                    },
                    {
                      title:
                        "Activities",
                      value:
                        data?.totalActivities ||
                        0,
                      sub:
                        "missions completed",
                      icon: "🚀",
                      color:
                        "#a78bfa",
                    },
                    {
                      title:
                        "Accuracy",
                      value: `${avg}%`,
                      sub:
                        "overall performance",
                      icon: "🎯",
                      color:
                        "#4ade80",
                    },
                    {
                      title:
                        "Highest ALPI",
                      value:
                        best,
                      sub:
                        "mastery score",
                      icon: "🏆",
                      color:
                        "#facc15",
                    },
                  ].map(
                    (item) => (
                      <div
                        key={
                          item.title
                        }
                        onMouseEnter={() =>
                          setHoveredStat(
                            item.title
                          )
                        }
                        onMouseLeave={() =>
                          setHoveredStat(
                            null
                          )
                        }
                        style={{
                          ...panel,
                          padding: 20,
                          position:
                            "relative",
                          overflow:
                            "hidden",
                          cursor:
                            "default",
                          transform:
                            hoveredStat ===
                            item.title
                              ? "translateY(-5px)"
                              : "translateY(0)",
                          borderColor:
                            hoveredStat ===
                            item.title
                              ? `${item.color}55`
                              : "rgba(255,255,255,.08)",
                          boxShadow:
                            hoveredStat ===
                            item.title
                              ? `0 18px 45px ${item.color}18`
                              : "0 20px 60px rgba(0,0,0,.12)",
                          transition:
                            "all .25s ease",
                        }}
                      >
                        <div
                          style={{
                            position:
                              "absolute",
                            right: 15,
                            top: 15,
                            fontSize: 26,
                            opacity:
                              hoveredStat ===
                              item.title
                                ? 1
                                : 0.55,
                            transform:
                              hoveredStat ===
                              item.title
                                ? "scale(1.15) rotate(5deg)"
                                : "scale(1)",
                            transition:
                              "all .25s ease",
                          }}
                        >
                          {
                            item.icon
                          }
                        </div>

                        <div
                          style={{
                            color:
                              "#64748b",
                            fontSize: 13,
                            fontWeight:
                              900,
                            letterSpacing:
                              ".1em",
                          }}
                        >
                          {item.title.toUpperCase()}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 32,
                            fontWeight:
                              900,
                            color:
                              item.color,
                          }}
                        >
                          {
                            item.value
                          }
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            color:
                              "#475569",
                            fontSize: 13,
                          }}
                        >
                          {
                            item.sub
                          }
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* =================================================
                    GALAXY LEADER
                ================================================= */}

                {bestStudent && (
                  <div
                    style={{
                      ...panel,
                      marginBottom: 22,
                      padding: 22,
                      background:
                        "linear-gradient(135deg,rgba(250,204,21,.07),rgba(124,58,237,.06))",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: 20,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 16,
                      }}
                    >
                      <div
                        style={{
                          width: 55,
                          height: 55,
                          borderRadius: 18,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          background:
                            "rgba(250,204,21,.1)",
                          fontSize: 28,
                        }}
                      >
                        🏆
                      </div>

                      <div>
                        <div
                          style={{
                            color:
                              "#64748b",
                            fontSize: 12,
                            fontWeight:
                              900,
                            letterSpacing:
                              ".16em",
                          }}
                        >
                          GALAXY LEADER
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 16,
                            fontWeight:
                              900,
                          }}
                        >
                          {
                            bestStudent.name
                          }
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            color:
                              "#64748b",
                            fontSize: 13,
                          }}
                        >
                          Highest current
                          ALPI mastery
                        </div>
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
                          color:
                            "#facc15",
                          fontSize: 30,
                          fontWeight:
                            900,
                        }}
                      >
                        {
                          bestStudent.alpi
                        }
                      </div>

                      <div
                        style={{
                          color:
                            "#64748b",
                          fontSize: 12,
                          fontWeight:
                            800,
                        }}
                      >
                        ALPI
                      </div>
                    </div>
                  </div>
                )}

                {/* =================================================
                    LEARNER CONSTELLATION
                ================================================= */}

                <section
                  style={{
                    ...panel,
                    padding: 22,
                    marginBottom: 22,
                  }}
                >
                  <SectionTitle
                    icon="🧑‍🚀"
                    title="Learner Constellation"
                    subtitle="Every learner is on their own journey"
                  />

                  {/* SEARCH + FILTER */}

                  <div
                    style={{
                      display:
                        "flex",
                      gap: 10,
                      marginBottom:
                        18,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 220,
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                        padding:
                          "10px 14px",
                        borderRadius:
                          14,
                        background:
                          "rgba(255,255,255,.035)",
                        border:
                          "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      <span>
                        🔭
                      </span>

                      <input
                        value={
                          studentSearch
                        }
                        onChange={(e) =>
                          setStudentSearch(
                            e.target
                              .value
                          )
                        }
                        placeholder="Search learners..."
                        style={{
                          flex: 1,
                          background:
                            "transparent",
                          border:
                            "none",
                          outline:
                            "none",
                          color:
                            "#fff",
                          fontFamily:
                            P,
                          fontSize: 14,
                        }}
                      />

                      {studentSearch && (
                        <button
                          onClick={() =>
                            setStudentSearch(
                              ""
                            )
                          }
                          style={{
                            border:
                              "none",
                            background:
                              "transparent",
                            color:
                              "#64748b",
                            cursor:
                              "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {[
                      "All",
                      "Beginner",
                      "Intermediate",
                      "Advanced",
                    ].map(
                      (level) => (
                        <button
                          key={
                            level
                          }
                          onClick={() =>
                            setLevelFilter(
                              level
                            )
                          }
                          style={{
                            border:
                              "1px solid rgba(255,255,255,.08)",
                            borderRadius:
                              12,
                            padding:
                              "9px 13px",
                            background:
                              levelFilter ===
                              level
                                ? "linear-gradient(135deg,#7c3aed,#0891b2)"
                                : "rgba(255,255,255,.035)",
                            color:
                              levelFilter ===
                              level
                                ? "#fff"
                                : "#64748b",
                            fontSize: 13,
                            fontWeight:
                              800,
                            cursor:
                              "pointer",
                            transition:
                              "all .2s ease",
                          }}
                        >
                          {level}
                        </button>
                      )
                    )}
                  </div>

                  {filteredStudents.length ? (
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill,minmax(190px,1fr))",
                        gap: 14,
                      }}
                    >
                      {filteredStudents.map(
                        (
                          s: any,
                          i: number
                        ) => {
                          const color =
                            colors[
                              i %
                                colors.length
                            ];

                          const accuracy =
                            Number(
                              s.accuracy
                            ) || 0;

                          const performance =
                            getPerformanceLabel(
                              accuracy
                            );

                          const isHovered =
                            hoveredStudent ===
                            s.id;

                          return (
                            <div
                              key={s.id}
                              onClick={() =>
                                setSelectedStudent(
                                  s
                                )
                              }
                              onMouseEnter={() =>
                                setHoveredStudent(
                                  s.id
                                )
                              }
                              onMouseLeave={() =>
                                setHoveredStudent(
                                  null
                                )
                              }
                              style={{
                                padding:
                                  18,
                                borderRadius:
                                  20,
                                background:
                                  isHovered
                                    ? "linear-gradient(135deg,rgba(124,58,237,.16),rgba(34,211,238,.08))"
                                    : "rgba(255,255,255,.025)",
                                border:
                                  isHovered
                                    ? `1px solid ${color}55`
                                    : "1px solid rgba(255,255,255,.07)",
                                cursor:
                                  "pointer",
                                transform:
                                  isHovered
                                    ? "translateY(-6px) scale(1.02)"
                                    : "translateY(0)",
                                boxShadow:
                                  isHovered
                                    ? `0 18px 40px ${color}18`
                                    : "none",
                                transition:
                                  "all .25s ease",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems:
                                    "center",
                                }}
                              >
                                <div
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius:
                                      14,
                                    background:
                                      `${color}15`,
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    fontSize:
                                      21,
                                    transform:
                                      isHovered
                                        ? "scale(1.12) rotate(-3deg)"
                                        : "scale(1)",
                                    transition:
                                      "all .25s ease",
                                  }}
                                >
                                  {
                                    [
                                      "🧑‍🚀",
                                      "👩‍🚀",
                                      "🧒",
                                      "👦",
                                      "👧",
                                    ][
                                      i %
                                        5
                                    ]
                                  }
                                </div>

                                <div
                                  style={{
                                    padding:
                                      "5px 8px",
                                    borderRadius:
                                      999,
                                    background:
                                      `${performance.color}12`,
                                    color:
                                      performance.color,
                                    fontSize: 11,
                                    fontWeight:
                                      900,
                                  }}
                                >
                                  {
                                    performance.icon
                                  }{" "}
                                  {
                                    performance.label
                                  }
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    13,
                                  fontSize: 16,
                                  fontWeight:
                                    900,
                                }}
                              >
                                {
                                  s.name
                                }
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    4,
                                  color:
                                    "#64748b",
                                  fontSize: 12,
                                }}
                              >
                                {s.learningLevel ||
                                  "Beginner"}{" "}
                                ·{" "}
                                {s.activities ||
                                  0}{" "}
                                missions
                              </div>

                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems:
                                    "end",
                                  marginTop:
                                    14,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      color:
                                        "#475569",
                                      fontSize: 11,
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    ALPI
                                  </div>

                                  <div
                                    style={{
                                      marginTop:
                                        2,
                                      color:
                                        color,
                                      fontSize:
                                        22,
                                      fontWeight:
                                        900,
                                    }}
                                  >
                                    {
                                      s.alpi
                                    }
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
                                      color:
                                        "#475569",
                                      fontSize: 11,
                                    }}
                                  >
                                    ACCURACY
                                  </div>

                                  <div
                                    style={{
                                      marginTop:
                                        2,
                                      color:
                                        "#e2e8f0",
                                      fontSize: 16,
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    {
                                      s.accuracy
                                    }%
                                  </div>
                                </div>
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    12,
                                  height: 5,
                                  borderRadius:
                                    999,
                                  background:
                                    "rgba(255,255,255,.06)",
                                  overflow:
                                    "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(
                                      Number(
                                        s.alpi
                                      ) || 0,
                                      100
                                    )}%`,
                                    height:
                                      "100%",
                                    borderRadius:
                                      999,
                                    background:
                                      `linear-gradient(90deg,${color},#22d3ee)`,
                                    transition:
                                      "width .5s ease",
                                  }}
                                />
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    10,
                                  textAlign:
                                    "center",
                                  color:
                                    isHovered
                                      ? "#a78bfa"
                                      : "#475569",
                                  fontSize: 12,
                                  fontWeight:
                                    800,
                                  transition:
                                    "color .2s ease",
                                }}
                              >
                                Click to explore →
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <EmptyState text="No learners match your search or filter." />
                  )}
                </section>

                {/* =================================================
                    CHART ROW
                ================================================= */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 20,
                    marginBottom:
                      22,
                  }}
                >
                  {/* =================================================
                      DOMAIN MASTERY
                  ================================================= */}

                  <section
                    style={{
                      ...panel,
                      padding: 22,
                    }}
                  >
                    <SectionTitle
                      icon="🧠"
                      title="Skill Mastery"
                      subtitle="Click a domain to explore it"
                    />

                    {domain.length ? (
                      <>
                        <ResponsiveContainer
                          width="100%"
                          height={290}
                        >
                          <BarChart
                            data={domain}
                            margin={{
                              top: 10,
                              right: 10,
                              left: -20,
                              bottom: 5,
                            }}
                            onClick={(
                              state: any
                            ) => {
                              const domainName =
                                state?.activePayload?.[0]?.payload?.domain;

                              if (
                                domainName
                              ) {
                                setSelectedDomain(
                                  domainName
                                );
                              }
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="rgba(255,255,255,.06)"
                            />

                            <XAxis
                              dataKey="domain"
                              tick={{
                                fontSize: 13,
                                fill: "#64748b",
                              }}
                              axisLine={
                                false
                              }
                              tickLine={
                                false
                              }
                            />

                            <YAxis
                              domain={[
                                0,
                                100,
                              ]}
                              tick={{
                                fontSize: 13,
                                fill: "#64748b",
                              }}
                              axisLine={
                                false
                              }
                              tickLine={
                                false
                              }
                            />

                            <Tooltip
                              contentStyle={{
                                background:
                                  "#101532",
                                border:
                                  "1px solid rgba(255,255,255,.1)",
                                borderRadius:
                                  12,
                                color:
                                  "#fff",
                                fontSize: 14,
                              }}
                            />

                            <Bar
                              dataKey="mastery"
                              fill="#8b5cf6"
                              radius={[
                                8,
                                8,
                                0,
                                0,
                              ]}
                              cursor="pointer"
                            />
                          </BarChart>
                        </ResponsiveContainer>

                        {selectedDomainData && (
                          <div
                            style={{
                              marginTop:
                                5,
                              padding:
                                15,
                              borderRadius:
                                16,
                              background:
                                "linear-gradient(135deg,rgba(124,58,237,.1),rgba(34,211,238,.05))",
                              border:
                                "1px solid rgba(167,139,250,.14)",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "center",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    color:
                                      "#64748b",
                                    fontSize: 11,
                                    fontWeight:
                                      900,
                                    letterSpacing:
                                      ".12em",
                                  }}
                                >
                                  SELECTED SKILL
                                </div>

                                <div
                                  style={{
                                    marginTop:
                                      4,
                                    fontSize: 18,
                                    fontWeight:
                                      900,
                                  }}
                                >
                                  {
                                    selectedDomainData.domain
                                  }
                                </div>
                              </div>

                              <div
                                style={{
                                  color:
                                    "#a78bfa",
                                  fontSize:
                                    23,
                                  fontWeight:
                                    900,
                                }}
                              >
                                {
                                  selectedDomainData.mastery
                                }%
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop:
                                  10,
                                height: 6,
                                borderRadius:
                                  999,
                                background:
                                  "rgba(255,255,255,.06)",
                                overflow:
                                  "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(
                                    Number(
                                      selectedDomainData.mastery
                                    ) || 0,
                                    100
                                  )}%`,
                                  height:
                                    "100%",
                                  borderRadius:
                                    999,
                                  background:
                                    "linear-gradient(90deg,#8b5cf6,#22d3ee)",
                                }}
                              />
                            </div>

                            <div
                              style={{
                                marginTop:
                                  8,
                                color:
                                  "#64748b",
                                fontSize: 12,
                              }}
                            >
                              Click another
                              bar to switch
                              skill focus.
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState text="No mastery data available." />
                    )}
                  </section>

                  {/* =================================================
                      ACTIVITY DISTRIBUTION
                  ================================================= */}

                  <section
                    style={{
                      ...panel,
                      padding: 22,
                    }}
                  >
                    <SectionTitle
                      icon="🚀"
                      title="Mission Distribution"
                      subtitle="Where learning time is being spent"
                    />

                    {activities.length ? (
                      <>
                        <ResponsiveContainer
                          width="100%"
                          height={225}
                        >
                          <PieChart>
                            <Pie
                              data={
                                activities
                              }
                              dataKey="value"
                              nameKey="name"
                              innerRadius={
                                55
                              }
                              outerRadius={
                                85
                              }
                              paddingAngle={
                                3
                              }
                              stroke="none"
                            >
                              {activities.map(
                                (
                                  _: any,
                                  i: number
                                ) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      colors[
                                        i %
                                          colors.length
                                      ]
                                    }
                                  />
                                )
                              )}
                            </Pie>

                            <Tooltip
                              contentStyle={{
                                background:
                                  "#101532",
                                border:
                                  "1px solid rgba(255,255,255,.1)",
                                borderRadius:
                                  12,
                                color:
                                  "#fff",
                                fontSize: 14,
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: 8,
                          }}
                        >
                          {activities.map(
                            (
                              a: any,
                              i: number
                            ) => (
                              <div
                                key={
                                  a.name
                                }
                                style={{
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  gap: 5,
                                  color:
                                    "#64748b",
                                  fontSize: 13,
                                }}
                              >
                                <span
                                  style={{
                                    width: 7,
                                    height: 7,
                                    borderRadius:
                                      "50%",
                                    background:
                                      colors[
                                        i %
                                          colors.length
                                      ],
                                  }}
                                />

                                {
                                  a.name
                                }
                                :{" "}
                                {
                                  a.value
                                }
                              </div>
                            )
                          )}
                        </div>
                      </>
                    ) : (
                      <EmptyState text="No completed missions yet." />
                    )}
                  </section>
                </div>

                {/* =================================================
                    TIMELINE
                ================================================= */}

                <section
                  style={{
                    ...panel,
                    padding: 22,
                    marginBottom:
                      22,
                  }}
                >
                  <SectionTitle
                    icon="📈"
                    title="Learning Trajectory"
                    subtitle="Average accuracy over time"
                  />

                  {timeline.length ? (
                    <ResponsiveContainer
                      width="100%"
                      height={300}
                    >
                      <LineChart
                        data={timeline}
                        margin={{
                          top: 10,
                          right: 20,
                          left: -20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,.06)"
                        />

                        <XAxis
                          dataKey="month"
                          tick={{
                            fontSize: 13,
                            fill: "#64748b",
                          }}
                          axisLine={
                            false
                          }
                          tickLine={
                            false
                          }
                        />

                        <YAxis
                          domain={[
                            0,
                            100,
                          ]}
                          tick={{
                            fontSize: 13,
                            fill: "#64748b",
                          }}
                          axisLine={
                            false
                          }
                          tickLine={
                            false
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            background:
                              "#101532",
                            border:
                              "1px solid rgba(255,255,255,.1)",
                            borderRadius:
                              12,
                            color:
                              "#fff",
                            fontSize: 14,
                          }}
                        />

                        <Legend
                          wrapperStyle={{
                            fontSize: 13,
                          }}
                        />

                        <Line
                          type="monotone"
                          dataKey="accuracy"
                          name="Average Accuracy"
                          stroke="#22d3ee"
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: "#22d3ee",
                          }}
                          activeDot={{
                            r: 7,
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState text="No timeline data available." />
                  )}
                </section>

                {/* =================================================
                    LEARNER OBSERVATORY
                ================================================= */}

                <section
                  style={{
                    ...panel,
                    padding: 22,
                    marginBottom:
                      30,
                  }}
                >
                  <SectionTitle
                    icon="📋"
                    title="Learner Observatory"
                    subtitle="Click a learner to inspect their journey"
                  />

                  {students.length ? (
                    <div
                      style={{
                        overflowX:
                          "auto",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse:
                            "collapse",
                          fontSize: 14,
                        }}
                      >
                        <thead>
                          <tr>
                            {[
                              "Learner",
                              "Code",
                              "Missions",
                              "Accuracy",
                              "ALPI",
                              "Level",
                            ].map(
                              (h) => (
                                <th
                                  key={
                                    h
                                  }
                                  style={{
                                    textAlign:
                                      "left",
                                    padding:
                                      "12px 10px",
                                    color:
                                      "#64748b",
                                    borderBottom:
                                      "1px solid rgba(255,255,255,.07)",
                                    fontSize: 12,
                                    fontWeight:
                                      900,
                                    letterSpacing:
                                      ".08em",
                                  }}
                                >
                                  {h.toUpperCase()}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {students.map(
                            (
                              s: any,
                              i: number
                            ) => {
                              const color =
                                colors[
                                  i %
                                    colors.length
                                ];

                              return (
                                <tr
                                  key={
                                    s.id
                                  }
                                  onClick={() =>
                                    setSelectedStudent(
                                      s
                                    )
                                  }
                                  style={{
                                    cursor:
                                      "pointer",
                                    transition:
                                      "background .2s ease",
                                  }}
                                >
                                  <td
                                    style={{
                                      padding:
                                        12,
                                      borderBottom:
                                        "1px solid rgba(255,255,255,.04)",
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        alignItems:
                                          "center",
                                        gap: 9,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 30,
                                          height: 30,
                                          borderRadius:
                                            10,
                                          display:
                                            "flex",
                                          alignItems:
                                            "center",
                                          justifyContent:
                                            "center",
                                          background:
                                            `${color}12`,
                                        }}
                                      >
                                        🧑‍🚀
                                      </span>

                                      {
                                        s.name
                                      }
                                    </div>
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        12,
                                      color:
                                        "#64748b",
                                    }}
                                  >
                                    {
                                      s.studentCode
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        12,
                                    }}
                                  >
                                    {
                                      s.activities
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        12,
                                    }}
                                  >
                                    {
                                      s.accuracy
                                    }
                                    %
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        12,
                                      color:
                                        "#a78bfa",
                                      fontWeight:
                                        900,
                                    }}
                                  >
                                    {
                                      s.alpi
                                    }
                                  </td>

                                  <td
                                    style={{
                                      padding:
                                        12,
                                    }}
                                  >
                                    <span
                                      style={{
                                        padding:
                                          "5px 9px",
                                        borderRadius:
                                          999,
                                        background:
                                          "rgba(34,211,238,.07)",
                                        color:
                                          "#67e8f9",
                                        fontSize: 12,
                                        fontWeight:
                                          800,
                                      }}
                                    >
                                      {s.learningLevel ||
                                        "Beginner"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState text="No learner records available." />
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* =====================================================
          LEARNER DETAIL MODAL
      ===================================================== */}

      {selectedStudent && (
        <LearnerModal
          student={selectedStudent}
          onClose={() =>
            setSelectedStudent(null)
          }
          getPerformanceLabel={
            getPerformanceLabel
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 18,
          }}
        >
          {icon}
        </span>

        <span
          style={{
            fontSize: 19,
            fontWeight: 900,
          }}
        >
          {title}
        </span>
      </div>

      <div
        style={{
          marginTop: 4,
          marginLeft: 27,
          color: "#64748b",
          fontSize: 13,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div
      style={{
        padding: 55,
        textAlign: "center",
        color: "#475569",
        fontSize: 14,
      }}
    >
      <div
        style={{
          fontSize: 34,
          marginBottom: 8,
        }}
      >
        🌑
      </div>

      {text}
    </div>
  );
}

/* =========================================================
   LEARNER MODAL
========================================================= */

function LearnerModal({
  student,
  onClose,
  getPerformanceLabel,
}: {
  student: any;
  onClose: () => void;
  getPerformanceLabel: (
    accuracy: number
  ) => {
    label: string;
    color: string;
    icon: string;
  };
}) {
  const accuracy =
    Number(student.accuracy) || 0;

  const alpi =
    Number(student.alpi) || 0;

  const performance =
    getPerformanceLabel(
      accuracy
    );

  const circumference =
    2 * Math.PI * 48;

  const offset =
    circumference -
    (accuracy / 100) *
      circumference;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background:
          "rgba(0,0,0,.72)",
        backdropFilter:
          "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent:
          "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) =>
          e.stopPropagation()
        }
        style={{
          width: "100%",
          maxWidth: 500,
          maxHeight:
            "calc(100vh - 40px)",
          overflowY:
            "auto",
          background:
            "linear-gradient(145deg,#101532,#0b102d)",
          border:
            "1px solid rgba(167,139,250,.2)",
          borderRadius: 28,
          padding: 28,
          boxShadow:
            "0 35px 120px rgba(0,0,0,.55)",
        }}
      >
        {/* Header */}

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
          }}
        >
          <div>
            <div
              style={{
                color:
                  "#67e8f9",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing:
                  ".17em",
              }}
            >
              LEARNER PROFILE
            </div>

            <h2
              style={{
                margin:
                  "7px 0 0",
                fontSize: 21,
                fontWeight: 900,
              }}
            >
              {student.name}
            </h2>

            <div
              style={{
                marginTop: 4,
                color:
                  "#64748b",
                fontSize: 13,
              }}
            >
              {student.studentCode ||
                "Learner"}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border:
                "none",
              background:
                "rgba(255,255,255,.06)",
              color:
                "#94a3b8",
              borderRadius: 11,
              width: 34,
              height: 34,
              cursor:
                "pointer",
              fontSize: 17,
            }}
          >
            ✕
          </button>
        </div>

        {/* Main profile */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "150px 1fr",
            gap: 20,
            alignItems:
              "center",
            marginTop: 25,
          }}
        >
          {/* Accuracy ring */}

          <div
            style={{
              position:
                "relative",
              width: 140,
              height: 140,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <svg
              width="140"
              height="140"
              viewBox="0 0 120 120"
              style={{
                transform:
                  "rotate(-90deg)",
              }}
            >
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="rgba(255,255,255,.06)"
                strokeWidth="9"
              />

              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke={
                  performance.color
                }
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={
                  circumference
                }
                strokeDashoffset={
                  offset
                }
                style={{
                  transition:
                    "stroke-dashoffset .8s ease",
                  filter:
                    `drop-shadow(0 0 8px ${performance.color}66)`,
                }}
              />
            </svg>

            <div
              style={{
                position:
                  "absolute",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  fontSize: 25,
                  fontWeight: 900,
                  color:
                    performance.color,
                }}
              >
                {accuracy}%
              </div>

              <div
                style={{
                  marginTop: 2,
                  color:
                    "#64748b",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing:
                    ".12em",
                }}
              >
                ACCURACY
              </div>
            </div>
          </div>

          {/* Performance */}

          <div>
            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  16,
                background:
                  `${performance.color}0d`,
                border:
                  `1px solid ${performance.color}25`,
              }}
            >
              <div
                style={{
                  fontSize: 21,
                }}
              >
                {
                  performance.icon
                }
              </div>

              <div
                style={{
                  marginTop: 7,
                  color:
                    performance.color,
                  fontSize: 19,
                  fontWeight:
                    900,
                }}
              >
                {
                  performance.label
                }
              </div>

              <div
                style={{
                  marginTop: 4,
                  color:
                    "#64748b",
                  fontSize: 12,
                  lineHeight:
                    1.6,
                }}
              >
                Current learning
                performance
                status.
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(3,1fr)",
            gap: 9,
            marginTop: 22,
          }}
        >
          {[
            [
              "🏆",
              "ALPI",
              alpi,
            ],
            [
              "🚀",
              "MISSIONS",
              student.activities ||
                0,
            ],
            [
              "📚",
              "LEVEL",
              student.learningLevel ||
                "Beginner",
            ],
          ].map(
            (item) => (
              <div
                key={
                  item[1]
                }
                style={{
                  padding:
                    14,
                  borderRadius:
                    16,
                  background:
                    "rgba(255,255,255,.035)",
                  border:
                    "1px solid rgba(255,255,255,.06)",
                  textAlign:
                    "center",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                  }}
                >
                  {
                    item[0]
                  }
                </div>

                <div
                  style={{
                    marginTop: 6,
                    color:
                      "#64748b",
                    fontSize: 11,
                    fontWeight:
                      900,
                  }}
                >
                  {
                    item[1]
                  }
                </div>

                <div
                  style={{
                    marginTop: 4,
                    color:
                      "#a78bfa",
                    fontSize: 16,
                    fontWeight:
                      900,
                  }}
                >
                  {
                    item[2]
                  }
                </div>
              </div>
            )
          )}
        </div>

        {/* ALPI progress */}

        <div
          style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 18,
            background:
              "rgba(255,255,255,.025)",
            border:
              "1px solid rgba(255,255,255,.06)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
            }}
          >
            <span
              style={{
                color:
                  "#64748b",
                fontSize: 12,
                fontWeight:
                  900,
              }}

              
            >
              MASTERY PROGRESS
            </span>

            <span
              style={{
                color:
                  "#a78bfa",
                fontSize: 12,
                fontWeight:
                  900,
              }}
            >
              {alpi}%
            </span>
          </div>

          <div
            style={{
              marginTop: 9,
              height: 7,
              borderRadius:
                999,
              background:
                "rgba(255,255,255,.06)",
              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(
                  alpi,
                  100
                )}%`,
                height:
                  "100%",
                borderRadius:
                  999,
                background:
                  "linear-gradient(90deg,#8b5cf6,#22d3ee)",
                transition:
                  "width .8s ease",
              }}
            />
          </div>
        </div>

        {/* Recommendation */}

        <div
          style={{
            marginTop: 14,
            padding: 16,
            borderRadius: 18,
            background:
              "linear-gradient(135deg,rgba(34,211,238,.06),rgba(124,58,237,.07))",
            border:
              "1px solid rgba(34,211,238,.1)",
          }}
        >
          <div
            style={{
              color:
                "#67e8f9",
              fontSize: 12,
              fontWeight:
                900,
              letterSpacing:
                ".12em",
            }}
          >
            💡 LEARNING INSIGHT
          </div>

          <div
            style={{
              marginTop: 7,
              color:
                "#94a3b8",
              fontSize: 13,
              lineHeight:
                1.7,
            }}
          >
            {accuracy >= 85
              ? "Excellent progress! Consider introducing more challenging missions to keep the learner engaged."
              : accuracy >= 70
              ? "The learner is progressing well. Continue practising consistently to strengthen mastery."
              : accuracy >= 50
              ? "The learner is developing. Repetition and guided activities can help build confidence."
              : "Consider additional guided practice and simpler missions to strengthen foundational skills."}
          </div>
        </div>

        {/* Close */}

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 18,
            border: "none",
            borderRadius: 13,
            padding:
              "11px",
            background:
              "linear-gradient(135deg,#7c3aed,#0891b2)",
            color: "#fff",
            fontFamily: P,
            fontSize: 14,
            fontWeight: 900,
            cursor:
              "pointer",
          }}
        >
          ✨ CLOSE PROFILE
        </button>
      </div>
    </div>
  );
}

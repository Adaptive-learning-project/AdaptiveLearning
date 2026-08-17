import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";
import API from "../api/studentApi";

const P = "Poppins, sans-serif";

const levelColor: Record<
  string,
  { bg: string; color: string; glow: string }
> = {
  Mild: {
    bg: "rgba(34,197,94,.12)",
    color: "#4ade80",
    glow: "rgba(34,197,94,.25)",
  },
  Moderate: {
    bg: "rgba(250,204,21,.12)",
    color: "#facc15",
    glow: "rgba(250,204,21,.25)",
  },
  Severe: {
    bg: "rgba(248,113,113,.12)",
    color: "#f87171",
    glow: "rgba(248,113,113,.25)",
  },
};

const avatars = [
  "🧑‍🚀",
  "👩‍🚀",
  "👨‍🚀",
  "🧒",
  "👧",
  "👦",
  "🧑‍🎓",
  "👩‍🎓",
];

const avatarColors = [
  "#7c3aed",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#14b8a6",
  "#f97316",
];

function AlpiBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  const color =
    safeValue >= 80
      ? "#4ade80"
      : safeValue >= 65
      ? "#fbbf24"
      : "#fb7185";

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 overflow-hidden rounded-full"
        style={{
          height: 9,
          background: "rgba(148,163,184,.15)",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeValue}%` }}
          transition={{
            duration: 1,
            ease: "easeOut",
          }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            borderRadius: 999,
            boxShadow: `0 0 12px ${color}55`,
          }}
        />
      </div>

      <span
        style={{
          fontFamily: P,
          fontWeight: 800,
          fontSize: 18,
          color,
          minWidth: 32,
        }}
      >
        {safeValue}
      </span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: string;
  label: string;
  value: number;
  accent: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      whileHover={{
        y: -5,
        scale: 1.015,
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: 20,
        background:
          "linear-gradient(145deg, rgba(20,29,72,.95), rgba(12,18,50,.95))",
        border: "1px solid rgba(148,163,184,.12)",
        boxShadow: "0 12px 30px rgba(0,0,0,.18)",
        cursor: "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 90,
          height: 90,
          right: -35,
          top: -35,
          borderRadius: "50%",
          background: accent,
          opacity: 0.08,
          filter: "blur(5px)",
        }}
      />

      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: `${accent}18`,
            border: `1px solid ${accent}35`,
            fontSize: 23,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              fontFamily: P,
              fontSize: 30,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            {value}
          </div>

          <div
            style={{
              marginTop: 6,
              fontFamily: P,
              fontSize: 17,
              color: "#cbd5e1",
              fontWeight: 600,
            }}
          >
            {label}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StudentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const isAdmin = user.role === "admin";

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);

      const res = await API.get("/");

      setList(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  async function confirmDelete(id: string) {
    try {
      await API.delete(`/${id}`);

      loadStudents();
    } catch (err) {
      console.log(err);
    }

    setDeleteId(null);
  }

  const filtered = list.filter((s) => {
    const matchSearch = (s.name ?? "")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchFilter =
      filter === "All" ||
      s.disabilityLevel === filter;

    return matchSearch && matchFilter;
  });

  const totalStudents = list.length;

  const mildCount = list.filter(
    (s) => s.disabilityLevel === "Mild"
  ).length;

  const moderateCount = list.filter(
    (s) => s.disabilityLevel === "Moderate"
  ).length;

  const severeCount = list.filter(
    (s) => s.disabilityLevel === "Severe"
  ).length;

  const averageAlpi =
    list.length > 0
      ? Math.round(
          list.reduce(
            (sum, s) =>
              sum + (Number(s.alpiScore) || 0),
            0
          ) / list.length
        )
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background:
          "radial-gradient(circle at 80% 0%, rgba(124,58,237,.18), transparent 30%), radial-gradient(circle at 10% 70%, rgba(6,182,212,.08), transparent 28%), #070b24",
        color: "#fff",
        fontFamily: P,
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
          title="Student Explorer"
          subtitle="Explore learner progress, achievements and growth"
        />

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "30px 32px 60px",
            position: "relative",
          }}
        >
          {/* Background stars */}
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
              ["7%", "15%"],
              ["18%", "80%"],
              ["32%", "20%"],
              ["49%", "86%"],
              ["65%", "12%"],
              ["78%", "72%"],
              ["91%", "30%"],
              ["95%", "88%"],
            ].map(([left, top], i) => (
              <motion.span
                key={i}
                animate={{
                  opacity: [0.15, 0.55, 0.15],
                  scale: [0.8, 1.15, 0.8],
                }}
                transition={{
                  duration: 3 + i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  left,
                  top,
                  color:
                    i % 2 === 0
                      ? "#a78bfa"
                      : "#67e8f9",
                  fontSize:
                    i % 2 === 0 ? 15 : 9,
                }}
              >
                {i % 2 === 0 ? "✦" : "✧"}
              </motion.span>
            ))}
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Hero */}
            <motion.section
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 28,
                padding: "32px 34px",
                marginBottom: 26,
                background:
                  "linear-gradient(135deg, rgba(49,46,129,.95), rgba(15,23,66,.96))",
                border:
                  "1px solid rgba(167,139,250,.18)",
                boxShadow:
                  "0 20px 50px rgba(0,0,0,.22)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 220,
                  height: 220,
                  right: -60,
                  top: -100,
                  borderRadius: "50%",
                  background:
                    "rgba(124,58,237,.18)",
                  filter: "blur(4px)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  width: 150,
                  height: 150,
                  right: 130,
                  bottom: -100,
                  borderRadius: "50%",
                  background:
                    "rgba(6,182,212,.10)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#a78bfa",
                      letterSpacing: ".12em",
                    }}
                  >
                    🚀 LEARNING CREW
                  </div>

                  <h1
                    style={{
                      margin: "8px 0 6px",
                      fontSize: 32,
                      fontWeight: 800,
                      letterSpacing: "-.03em",
                    }}
                  >
                    Meet Your Explorers 🌌
                  </h1>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: 680,
                      fontSize: 18,
                      color: "#cbd5e1",
                      lineHeight: 1.8,
                    }}
                  >
                    Track every learner's journey,
                    discover their strengths and
                    help them reach their next
                    learning milestone.
                  </p>
                </div>

                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotate: [-3, 3, -3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    fontSize: 68,
                    filter:
                      "drop-shadow(0 0 18px rgba(167,139,250,.4))",
                  }}
                >
                  🧑‍🚀
                </motion.div>
              </div>
            </motion.section>

            {/* Statistics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4,minmax(0,1fr))",
                gap: 16,
                marginBottom: 26,
              }}
            >
              <StatCard
                icon="👨‍🚀"
                label="Total Explorers"
                value={totalStudents}
                accent="#8b5cf6"
                delay={0.05}
              />

              <StatCard
                icon="🌱"
                label="Mild Support"
                value={mildCount}
                accent="#4ade80"
                delay={0.1}
              />

              <StatCard
                icon="🚀"
                label="Moderate Support"
                value={moderateCount}
                accent="#facc15"
                delay={0.15}
              />

              <StatCard
                icon="⭐"
                label="Average ALPI"
                value={averageAlpi}
                accent="#22d3ee"
                delay={0.2}
              />
            </div>

            {/* Search + filters */}
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
                delay: 0.2,
              }}
              style={{
                padding: 20,
                borderRadius: 22,
                background:
                  "rgba(15,23,55,.82)",
                border:
                  "1px solid rgba(148,163,184,.10)",
                marginBottom: 26,
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {/* Search */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 230,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "13px 16px",
                    borderRadius: 15,
                    background:
                      "rgba(255,255,255,.05)",
                    border:
                      "1px solid rgba(148,163,184,.12)",
                  }}
                >
                  <span
                    className="material-icons-round"
                    style={{
                      color: "#94a3b8",
                      fontSize: 21,
                    }}
                  >
                    search
                  </span>

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search your explorers..."
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#fff",
                      fontFamily: P,
                      fontSize: 18,
                    }}
                  />

                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    "All",
                    "Mild",
                    "Moderate",
                    "Severe",
                  ].map((f) => {
                    const active = filter === f;

                    return (
                      <motion.button
                        key={f}
                        whileHover={{
                          scale: 1.04,
                        }}
                        whileTap={{
                          scale: 0.96,
                        }}
                        onClick={() =>
                          setFilter(f)
                        }
                        style={{
                          border: "none",
                          cursor: "pointer",
                          padding:
                            "11px 16px",
                          borderRadius: 12,
                          fontFamily: P,
                          fontSize: 17,
                          fontWeight: 600,
                          color: active
                            ? "#fff"
                            : "#94a3b8",
                          background: active
                            ? "linear-gradient(135deg,#7c3aed,#06b6d4)"
                            : "rgba(255,255,255,.05)",
                          boxShadow: active
                            ? "0 5px 18px rgba(124,58,237,.25)"
                            : "none",
                        }}
                      >
                        {f === "All"
                          ? "🌌 All"
                          : f === "Mild"
                          ? "🌱 Mild"
                          : f === "Moderate"
                          ? "🚀 Moderate"
                          : "🛸 Severe"}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Add */}
                {isAdmin && (
                  <Link
                    to="/students/add"
                    style={{
                      textDecoration: "none",
                    }}
                  >
                    <motion.button
                      whileHover={{
                        scale: 1.04,
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.97,
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding:
                          "12px 18px",
                        borderRadius: 13,
                        border: "none",
                        cursor: "pointer",
                        color: "#fff",
                        fontFamily: P,
                        fontSize: 17,
                        fontWeight: 700,
                        background:
                          "linear-gradient(135deg,#7c3aed,#06b6d4)",
                        boxShadow:
                          "0 8px 22px rgba(124,58,237,.25)",
                      }}
                    >
                      <span
                        className="material-icons-round"
                        style={{
                          fontSize: 19,
                        }}
                      >
                        person_add
                      </span>
                      Add Explorer
                    </motion.button>
                  </Link>
                )}
              </div>
            </motion.div>

            {/* Section heading */}
            <div
              className="flex items-center justify-between"
              style={{
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 21,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  Your Learning Crew
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 16,
                    color: "#94a3b8",
                  }}
                >
                  {filtered.length} explorer
                  {filtered.length !== 1
                    ? "s"
                    : ""}{" "}
                  found
                </div>
              </div>

              <div
                style={{
                  padding:
                    "8px 13px",
                  borderRadius: 999,
                  background:
                    "rgba(34,197,94,.10)",
                  color: "#4ade80",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                ✨ Learning Together
              </div>
            </div>

            {/* Student cards */}
            {loading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 80,
                  color: "#94a3b8",
                }}
              >
                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    fontSize: 32,
                  }}
                >
                  🌌
                </motion.div>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                style={{
                  textAlign: "center",
                  padding: 70,
                  borderRadius: 24,
                  background:
                    "rgba(15,23,55,.75)",
                  border:
                    "1px solid rgba(148,163,184,.10)",
                }}
              >
                <div
                  style={{
                    fontSize: 54,
                    marginBottom: 12,
                  }}
                >
                  🔭
                </div>

                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  No explorers found
                </div>

                <div
                  style={{
                    marginTop: 7,
                    fontSize: 17,
                    color: "#94a3b8",
                  }}
                >
                  Try another search or
                  learning level.
                </div>
              </motion.div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(290px,1fr))",
                  gap: 18,
                }}
              >
                {filtered.map((s, i) => {
                  const score = Math.max(
                    0,
                    Math.min(
                      100,
                      Number(s.alpiScore) || 0
                    )
                  );

                  const level =
                    levelColor[
                      s.disabilityLevel
                    ] ||
                    levelColor.Mild;

                  const avatar =
                    avatars[
                      i % avatars.length
                    ];

                  const avatarColor =
                    avatarColors[
                      i %
                        avatarColors.length
                    ];

                  return (
                    <motion.div
                      key={s._id}
                      initial={{
                        opacity: 0,
                        y: 25,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay: i * 0.05,
                      }}
                      whileHover={{
                        y: -8,
                        scale: 1.015,
                      }}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 24,
                        padding: 20,
                        background:
                          "linear-gradient(145deg, rgba(20,29,72,.96), rgba(10,16,46,.96))",
                        border:
                          "1px solid rgba(148,163,184,.11)",
                        boxShadow:
                          "0 12px 35px rgba(0,0,0,.18)",
                      }}
                    >
                      {/* Glow */}
                      <div
                        style={{
                          position:
                            "absolute",
                          width: 110,
                          height: 110,
                          right: -55,
                          top: -55,
                          borderRadius:
                            "50%",
                          background:
                            avatarColor,
                          opacity: 0.07,
                          filter: "blur(4px)",
                        }}
                      />

                      {/* Top */}
                      <div
                        className="flex items-start justify-between"
                      >
                        <motion.div
                          whileHover={{
                            rotate: 8,
                            scale: 1.08,
                          }}
                          style={{
                            width: 58,
                            height: 58,
                            borderRadius: 19,
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background: `${avatarColor}18`,
                            border: `1px solid ${avatarColor}45`,
                            fontSize: 29,
                            boxShadow: `0 0 24px ${avatarColor}18`,
                          }}
                        >
                          {avatar}
                        </motion.div>

                        <span
                          style={{
                            padding:
                              "7px 11px",
                            borderRadius: 999,
                            background:
                              level.bg,
                            color:
                              level.color,
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          {s.disabilityLevel ||
                            "Learner"}
                        </span>
                      </div>

                      {/* Name */}
                      <div
                        style={{
                          marginTop: 17,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 19,
                            fontWeight: 800,
                            color: "#fff",
                          }}
                        >
                          {s.name}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 15,
                            color: "#64748b",
                          }}
                        >
                          Explorer ID ·{" "}
                          {s.studentCode ||
                            "—"}
                        </div>
                      </div>

                      {/* ALPI */}
                      <div
                        style={{
                          marginTop: 18,
                          padding: 15,
                          borderRadius: 16,
                          background:
                            "rgba(255,255,255,.035)",
                        }}
                      >
                        <div
                          className="flex items-center justify-between"
                          style={{
                            marginBottom: 10,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 15,
                              color:
                                "#94a3b8",
                              fontWeight: 600,
                            }}
                          >
                            LEARNING MASTERY
                          </span>

                          <span
                            style={{
                              fontSize: 15,
                              color:
                                "#67e8f9",
                              fontWeight: 700,
                            }}
                          >
                            🎯 ALPI
                          </span>
                        </div>

                        <AlpiBar
                          value={score}
                        />
                      </div>

                      {/* Details */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        <div
                          style={{
                            padding: 11,
                            borderRadius: 13,
                            background:
                              "rgba(255,255,255,.035)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              color:
                                "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            AGE
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 17,
                              fontWeight: 700,
                              color:
                                "#e2e8f0",
                            }}
                          >
                            {Number.isFinite(
                              Number(s.age)
                            ) &&
                            Number(s.age) >
                              0
                              ? `${Number(
                                  s.age
                                )} yrs`
                              : "—"}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: 11,
                            borderRadius: 13,
                            background:
                              "rgba(255,255,255,.035)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              color:
                                "#64748b",
                              fontWeight: 600,
                            }}
                          >
                            FACP
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 17,
                              fontWeight: 700,
                              color:
                                "#e2e8f0",
                            }}
                          >
                            {s.facpScore ??
                              "—"}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            isAdmin
                              ? "1fr 1fr 1fr"
                              : "1fr 1fr",
                          gap: 7,
                          marginTop: 16,
                        }}
                      >
                        <Link
                          to={`/students/${s._id}`}
                          style={{
                            textDecoration:
                              "none",
                          }}
                        >
                          <motion.button
                            whileHover={{
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.96,
                            }}
                            style={{
                              width: "100%",
                              padding:
                                "10px 7px",
                              borderRadius: 11,
                              border:
                                "1px solid rgba(103,232,249,.14)",
                              background:
                                "rgba(6,182,212,.08)",
                              color:
                                "#67e8f9",
                              fontFamily: P,
                              fontSize: 16,
                              fontWeight: 700,
                              cursor:
                                "pointer",
                            }}
                          >
                            👁 View
                          </motion.button>
                        </Link>

                        <Link
                          to={`/students/edit/${s._id}`}
                          style={{
                            textDecoration:
                              "none",
                          }}
                        >
                          <motion.button
                            whileHover={{
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.96,
                            }}
                            style={{
                              width: "100%",
                              padding:
                                "10px 7px",
                              borderRadius: 11,
                              border:
                                "1px solid rgba(74,222,128,.14)",
                              background:
                                "rgba(34,197,94,.08)",
                              color:
                                "#4ade80",
                              fontFamily: P,
                              fontSize: 16,
                              fontWeight: 700,
                              cursor:
                                "pointer",
                            }}
                          >
                            ✏️ Edit
                          </motion.button>
                        </Link>

                        {isAdmin && (
                          <motion.button
                            whileHover={{
                              y: -2,
                            }}
                            whileTap={{
                              scale: 0.96,
                            }}
                            onClick={() =>
                              setDeleteId(
                                s._id
                              )
                            }
                            style={{
                              width: "100%",
                              padding:
                                "10px 7px",
                              borderRadius: 11,
                              border:
                                "1px solid rgba(248,113,113,.14)",
                              background:
                                "rgba(248,113,113,.08)",
                              color:
                                "#f87171",
                              fontFamily: P,
                              fontSize: 16,
                              fontWeight: 700,
                              cursor:
                                "pointer",
                            }}
                          >
                            🗑 Delete
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "rgba(2,6,23,.72)",
              backdropFilter:
                "blur(10px)",
              padding: 20,
            }}
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.85,
                y: 30,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.85,
                y: 30,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              style={{
                width: "100%",
                maxWidth: 390,
                borderRadius: 28,
                padding: 30,
                textAlign: "center",
                background:
                  "linear-gradient(145deg,#151d48,#0b1234)",
                border:
                  "1px solid rgba(248,113,113,.18)",
                boxShadow:
                  "0 30px 80px rgba(0,0,0,.45)",
              }}
            >
              <motion.div
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                style={{
                  fontSize: 52,
                  marginBottom: 10,
                }}
              >
                🛸
              </motion.div>

              <div
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                Remove Explorer?
              </div>

              <p
                style={{
                  marginTop: 10,
                  color: "#94a3b8",
                  fontSize: 17,
                  lineHeight: 1.8,
                }}
              >
                This will permanently
                remove this learner and
                their associated data.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 10,
                  marginTop: 22,
                }}
              >
                <button
                  onClick={() =>
                    setDeleteId(null)
                  }
                  style={{
                    padding: 13,
                    borderRadius: 13,
                    border:
                      "1px solid rgba(148,163,184,.15)",
                    background:
                      "rgba(255,255,255,.05)",
                    color: "#cbd5e1",
                    fontFamily: P,
                    fontSize: 17,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <motion.button
                  whileHover={{
                    scale: 1.02,
                  }}
                  whileTap={{
                    scale: 0.97,
                  }}
                  onClick={() =>
                    confirmDelete(deleteId)
                  }
                  style={{
                    padding: 13,
                    borderRadius: 13,
                    border: "none",
                    background:
                      "linear-gradient(135deg,#ef4444,#f97316)",
                    color: "#fff",
                    fontFamily: P,
                    fontSize: 17,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Delete Explorer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
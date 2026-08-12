  import { useState, useEffect } from "react";
  import { motion } from "motion/react";
  import { Sidebar, TopBar } from "./DashboardPage";
  import studentAPI from "../api/studentApi";
  import { getResults, getAllResults } from "../api/resultApi";
  import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
  } from "recharts";

  const P = "Poppins, sans-serif";

  const REPORT_PURPLE = "#8B5CF6";
  const CYAN = "#06B6D4";
  const GREEN = "#22C55E";
  const YELLOW = "#FACC15";
  const RED = "#FB7185";

  type ReportType = "weekly" | "monthly" | "custom";
  type Format = "pdf" | "excel";

  const stars = [
    ["6%", "12%"],
    ["14%", "72%"],
    ["25%", "20%"],
    ["38%", "84%"],
    ["51%", "13%"],
    ["65%", "70%"],
    ["78%", "25%"],
    ["91%", "82%"],
  ];

  function ReportTypeCard({
    icon,
    label,
    description,
    selected,
    onClick,
  }: {
    icon: string;
    label: string;
    description: string;
    selected: boolean;
    onClick: () => void;
  }) {
    return (
      <motion.button
        type="button"
        whileHover={{ x: 4, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: "15px",
          borderRadius: 17,
          border: selected
            ? `1px solid ${REPORT_PURPLE}80`
            : "1px solid rgba(148,163,184,.12)",
          background: selected
            ? "linear-gradient(135deg,rgba(139,92,246,.16),rgba(6,182,212,.07))"
            : "rgba(255,255,255,.035)",
          color: "#fff",
          textAlign: "left",
          cursor: "pointer",
          boxShadow: selected
            ? "0 0 25px rgba(139,92,246,.12)"
            : "none",
          fontFamily: P,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            background: selected
              ? "rgba(139,92,246,.18)"
              : "rgba(255,255,255,.06)",
            border: selected
              ? "1px solid rgba(139,92,246,.25)"
              : "1px solid rgba(148,163,184,.10)",
            fontSize: 20,
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: selected ? "#C4B5FD" : "#E2E8F0",
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontSize: 14,
              color: "#94A3B8",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>

        {selected && (
          <div
            style={{
              color: "#A78BFA",
              fontSize: 17,
            }}
          >
            ✓
          </div>
        )}
      </motion.button>
    );
  }

  function Checkbox({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
  }) {
    return (
      <button
        type="button"
        onClick={onChange}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "none",
          border: "none",
          color: "#CBD5E1",
          cursor: "pointer",
          fontFamily: P,
          fontSize: 16,
          padding: 0,
        }}
      >
        <motion.div
          animate={{
            scale: checked ? [0.9, 1.08, 1] : 1,
          }}
          style={{
            width: 19,
            height: 19,
            borderRadius: 6,
            display: "grid",
            placeItems: "center",
            background: checked
              ? "linear-gradient(135deg,#8B5CF6,#06B6D4)"
              : "rgba(255,255,255,.04)",
            border: checked
              ? "none"
              : "1px solid rgba(148,163,184,.25)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {checked ? "✓" : ""}
        </motion.div>

        {label}
      </button>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          borderRadius: 999,
          background: "rgba(34,197,94,.10)",
          color: "#4ADE80",
          fontSize: 13,
          fontWeight: 800,
          fontFamily: P,
        }}
      >
        ● {status}
      </span>
    );
  }

  function MetricCard({
    icon,
    label,
    value,
    accent,
    delay,
  }: {
    icon: string;
    label: string;
    value: string;
    accent: string;
    delay: number;
  }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        whileHover={{
          y: -4,
          scale: 1.01,
        }}
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 16,
          borderRadius: 19,
          background:
            "linear-gradient(145deg,rgba(20,29,72,.96),rgba(10,16,46,.96))",
          border: "1px solid rgba(148,163,184,.10)",
          boxShadow: "0 12px 30px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 80,
            height: 80,
            right: -30,
            top: -35,
            borderRadius: "50%",
            background: accent,
            opacity: 0.08,
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
              background: `${accent}18`,
              border: `1px solid ${accent}30`,
              fontSize: 19,
            }}
          >
            {icon}
          </div>

          <div>
            <div
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: accent,
              }}
            >
              {value}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#94A3B8",
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  export default function ReportsPage() {
    const [selectedType, setSelectedType] =
      useState<ReportType>("monthly");

    const [student, setStudent] =
      useState("All Students");

    const [format, setFormat] =
      useState<Format>("pdf");

    const [dateFrom, setDateFrom] =
      useState("2025-07-01");

    const [dateTo, setDateTo] =
      useState("2025-07-31");

    const [checks, setChecks] = useState({
      performanceCharts: true,
      activityLog: true,
      teacherNotes: false,
      alpiSummary: true,
    });

    const [students, setStudents] =
      useState<any[]>([]);

    const [reportResults, setReportResults] =
      useState<any[]>([]);

    const [loadingData, setLoadingData] =
      useState(true);

    useEffect(() => {
      studentAPI
        .get("/")
        .then((r) => setStudents(r.data || []))
        .catch(() => {})
        .finally(() => setLoadingData(false));
    }, []);

    useEffect(() => {
      if (student === "All Students") {
        getAllResults()
          .then((r) =>
            setReportResults(r.data || [])
          )
          .catch(() => setReportResults([]));
      } else {
        const selected = students.find(
          (s) => s.name === student
        );

        if (selected) {
          getResults(selected._id)
            .then((r) =>
              setReportResults(r.data || [])
            )
            .catch(() =>
              setReportResults([])
            );
        } else {
          setReportResults([]);
        }
      }
    }, [student, students]);

    const selectedStudent = students.find(
      (s) => s.name === student
    );

    const reportAccuracy =
      reportResults.length
        ? Math.round(
            reportResults.reduce(
              (a, r) =>
                a + Number(r.accuracy || 0),
              0
            ) / reportResults.length
          )
        : 0;

    const reportALPI = selectedStudent
      ? Number(selectedStudent.alpiScore || 0)
      : reportAccuracy;

    const previewBarData = reportResults
      .slice()
      .reverse()
      .slice(-8)
      .map((r, i) => ({
        week: `W${i + 1}`,
        ALPI: Number(r.accuracy || 0),
      }));

    const activityLog = reportResults
      .slice(0, 8)
      .map((r) => ({
        date: new Date(
          r.completedAt || r.createdAt
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        activity: r.activityName,
        score: `${Number(r.accuracy || 0)}%`,
        duration: `${Math.round(
          Number(r.timeTaken || 0) / 60
        )} min`,
        status: "Completed",
      }));

    const STUDENTS_LIST = [
      "All Students",
      ...students.map((s) => s.name),
    ];

    const toggleCheck = (
      key: keyof typeof checks
    ) => {
      setChecks((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    };

    const inputStyle: React.CSSProperties = {
      width: "100%",
      padding: "11px 13px",
      borderRadius: 12,
      border:
        "1px solid rgba(148,163,184,.15)",
      fontSize: 16,
      fontFamily: P,
      color: "#E2E8F0",
      outline: "none",
      background: "rgba(255,255,255,.045)",
      boxSizing: "border-box",
    };

    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 75% 0%,rgba(124,58,237,.18),transparent 30%),radial-gradient(circle at 10% 75%,rgba(6,182,212,.08),transparent 28%),#070B24",
          color: "#fff",
          fontFamily: P,
        }}
      >
        {/* Animated stars */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          {stars.map(([left, top], i) => (
            <motion.span
              key={i}
              animate={{
                opacity: [0.15, 0.7, 0.15],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2.5 + i * 0.35,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                left,
                top,
                color:
                  i % 2 === 0
                    ? "#A78BFA"
                    : "#67E8F9",
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
            zIndex: 5,
          }}
        >
          <Sidebar active="Reports" />
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 2,
          }}
        >
          <TopBar
            title="Mission Control"
            subtitle="Learning reports, performance insights and learner progress"
          />

          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "26px 30px 60px",
            }}
          >
            {/* HERO */}
            <motion.section
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 28,
                padding: "28px 30px",
                marginBottom: 22,
                background:
                  "linear-gradient(135deg,#312E81,#111936 65%,#0E7490)",
                border:
                  "1px solid rgba(167,139,250,.18)",
                boxShadow:
                  "0 20px 55px rgba(0,0,0,.22)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 200,
                  height: 200,
                  right: -60,
                  top: -100,
                  borderRadius: "50%",
                  background:
                    "rgba(139,92,246,.18)",
                  filter: "blur(4px)",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      color: "#A78BFA",
                      fontWeight: 800,
                      letterSpacing: ".12em",
                    }}
                  >
                    📡 REPORT CENTER
                  </div>

                  <h1
                    style={{
                      margin:
                        "7px 0 5px",
                      fontSize: 27,
                      fontWeight: 800,
                    }}
                  >
                    Learning Mission Reports
                  </h1>

                  <p
                    style={{
                      margin: 0,
                      maxWidth: 650,
                      fontSize: 16,
                      color: "#CBD5E1",
                      lineHeight: 1.7,
                    }}
                  >
                    Turn learner activity into
                    clear insights, progress
                    stories and actionable
                    performance reports.
                  </p>
                </div>

                <motion.div
                  animate={{
                    y: [0, -9, 0],
                    rotate: [-4, 4, -4],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    fontSize: 58,
                    filter:
                      "drop-shadow(0 0 18px rgba(167,139,250,.35))",
                  }}
                >
                  🛰️
                </motion.div>
              </div>
            </motion.section>

            {/* METRICS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4,minmax(0,1fr))",
                gap: 14,
                marginBottom: 22,
              }}
            >
              <MetricCard
                icon="👨‍🚀"
                label="Learners"
                value={String(students.length)}
                accent={REPORT_PURPLE}
                delay={0.05}
              />

              <MetricCard
                icon="🎯"
                label="Average Accuracy"
                value={`${reportAccuracy}%`}
                accent={CYAN}
                delay={0.1}
              />

              <MetricCard
                icon="🏆"
                label="ALPI Score"
                value={String(reportALPI)}
                accent={GREEN}
                delay={0.15}
              />

              <MetricCard
                icon="🧩"
                label="Completed Missions"
                value={String(
                  reportResults.length
                )}
                accent={YELLOW}
                delay={0.2}
              />
            </div>

            {/* BUILDER + PREVIEW */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(300px,380px) minmax(0,1fr)",
                gap: 20,
                alignItems: "start",
              }}
            >
              {/* LEFT BUILDER */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {/* Report type */}
                <motion.section
                  initial={{
                    opacity: 0,
                    x: -15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  style={{
                    padding: 20,
                    borderRadius: 23,
                    background:
                      "rgba(15,23,55,.88)",
                    border:
                      "1px solid rgba(148,163,184,.10)",
                    backdropFilter:
                      "blur(12px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#94A3B8",
                      letterSpacing: ".1em",
                      marginBottom: 12,
                    }}
                  >
                    REPORT MISSION
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 9,
                    }}
                  >
                    <ReportTypeCard
                      icon="📅"
                      label="Weekly Report"
                      description="Summary of this week's sessions"
                      selected={
                        selectedType ===
                        "weekly"
                      }
                      onClick={() =>
                        setSelectedType(
                          "weekly"
                        )
                      }
                    />

                    <ReportTypeCard
                      icon="🗓️"
                      label="Monthly Report"
                      description="Detailed monthly performance"
                      selected={
                        selectedType ===
                        "monthly"
                      }
                      onClick={() =>
                        setSelectedType(
                          "monthly"
                        )
                      }
                    />

                    <ReportTypeCard
                      icon="🎛️"
                      label="Custom Report"
                      description="Choose your own date range"
                      selected={
                        selectedType ===
                        "custom"
                      }
                      onClick={() =>
                        setSelectedType(
                          "custom"
                        )
                      }
                    />
                  </div>
                </motion.section>

                {/* Filters */}
                <motion.section
                  initial={{
                    opacity: 0,
                    x: -15,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    delay: 0.08,
                  }}
                  style={{
                    padding: 20,
                    borderRadius: 23,
                    background:
                      "rgba(15,23,55,.88)",
                    border:
                      "1px solid rgba(148,163,184,.10)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#94A3B8",
                      letterSpacing: ".1em",
                      marginBottom: 15,
                    }}
                  >
                    MISSION SETTINGS
                  </div>

                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      color: "#94A3B8",
                      marginBottom: 7,
                    }}
                  >
                    STUDENT
                  </label>

                  <select
                    value={student}
                    onChange={(e) =>
                      setStudent(
                        e.target.value
                      )
                    }
                    style={{
                      ...inputStyle,
                      marginBottom: 16,
                    }}
                  >
                    {STUDENTS_LIST.map(
                      (s) => (
                        <option
                          key={s}
                          value={s}
                          style={{
                            background:
                              "#111936",
                          }}
                        >
                          {s}
                        </option>
                      )
                    )}
                  </select>

                  {selectedType ===
                    "custom" && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        height: 0,
                      }}
                      animate={{
                        opacity: 1,
                        height: "auto",
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 9,
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display:
                              "block",
                            fontSize: 14,
                            color:
                              "#94A3B8",
                            marginBottom:
                              6,
                          }}
                        >
                          FROM
                        </label>

                        <input
                          type="date"
                          value={
                            dateFrom
                          }
                          onChange={(e) =>
                            setDateFrom(
                              e.target
                                .value
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display:
                              "block",
                            fontSize: 14,
                            color:
                              "#94A3B8",
                            marginBottom:
                              6,
                          }}
                        >
                          TO
                        </label>

                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) =>
                            setDateTo(
                              e.target
                                .value
                            )
                          }
                          style={
                            inputStyle
                          }
                        />
                      </div>
                    </motion.div>
                  )}

                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      color: "#94A3B8",
                      marginBottom: 7,
                    }}
                  >
                    EXPORT FORMAT
                  </label>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 8,
                      marginBottom: 17,
                    }}
                  >
                    {(
                      ["pdf", "excel"] as Format[]
                    ).map((f) => {
                      const active =
                        format === f;

                      return (
                        <motion.button
                          key={f}
                          whileHover={{
                            y: -2,
                          }}
                          whileTap={{
                            scale: 0.97,
                          }}
                          onClick={() =>
                            setFormat(f)
                          }
                          style={{
                            padding:
                              "10px",
                            borderRadius: 12,
                            border: active
                              ? "1px solid #8B5CF6"
                              : "1px solid rgba(148,163,184,.12)",
                            background:
                              active
                                ? "rgba(139,92,246,.13)"
                                : "rgba(255,255,255,.035)",
                            color: active
                              ? "#C4B5FD"
                              : "#94A3B8",
                            fontFamily: P,
                            fontSize: 15,
                            fontWeight: 800,
                            cursor:
                              "pointer",
                          }}
                        >
                          {f === "pdf"
                            ? "📄 PDF"
                            : "📊 EXCEL"}
                        </motion.button>
                      );
                    })}
                  </div>

                  <label
                    style={{
                      display: "block",
                      fontSize: 14,
                      color: "#94A3B8",
                      marginBottom: 10,
                    }}
                  >
                    INCLUDE SECTIONS
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: 11,
                    }}
                  >
                    <Checkbox
                      checked={
                        checks.performanceCharts
                      }
                      onChange={() =>
                        toggleCheck(
                          "performanceCharts"
                        )
                      }
                      label="Performance Charts"
                    />

                    <Checkbox
                      checked={
                        checks.activityLog
                      }
                      onChange={() =>
                        toggleCheck(
                          "activityLog"
                        )
                      }
                      label="Activity Log"
                    />

                    <Checkbox
                      checked={
                        checks.teacherNotes
                      }
                      onChange={() =>
                        toggleCheck(
                          "teacherNotes"
                        )
                      }
                      label="Teacher Notes"
                    />

                    <Checkbox
                      checked={
                        checks.alpiSummary
                      }
                      onChange={() =>
                        toggleCheck(
                          "alpiSummary"
                        )
                      }
                      label="ALPI Summary"
                    />
                  </div>
                </motion.section>

                {/* Actions */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: 9,
                  }}
                >
                  <motion.button
                    whileHover={{
                      y: -3,
                      scale: 1.01,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    style={{
                      gridColumn:
                        "1 / -1",
                      padding: 14,
                      border: "none",
                      borderRadius: 15,
                      background:
                        "linear-gradient(135deg,#7C3AED,#06B6D4)",
                      color: "#fff",
                      fontFamily: P,
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow:
                        "0 10px 30px rgba(124,58,237,.25)",
                    }}
                  >
                    🚀 Generate Mission Report
                  </motion.button>

                  <motion.button
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    style={{
                      padding: 11,
                      borderRadius: 13,
                      border:
                        "1px solid rgba(239,68,68,.2)",
                      background:
                        "rgba(239,68,68,.06)",
                      color: "#FCA5A5",
                      fontFamily: P,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📄 PDF
                  </motion.button>

                  <motion.button
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.97,
                    }}
                    style={{
                      padding: 11,
                      borderRadius: 13,
                      border:
                        "1px solid rgba(34,197,94,.2)",
                      background:
                        "rgba(34,197,94,.06)",
                      color: "#86EFAC",
                      fontFamily: P,
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📊 Excel
                  </motion.button>
                </div>
              </div>

              {/* REPORT PREVIEW */}
              <motion.section
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.1,
                }}
                style={{
                  minWidth: 0,
                  borderRadius: 25,
                  overflow: "hidden",
                  background:
                    "linear-gradient(145deg,rgba(20,29,72,.97),rgba(10,16,46,.97))",
                  border:
                    "1px solid rgba(148,163,184,.11)",
                  boxShadow:
                    "0 20px 55px rgba(0,0,0,.25)",
                }}
              >
                {/* Preview header */}
                <div
                  style={{
                    padding:
                      "14px 19px",
                    display: "flex",
                    alignItems:
                      "center",
                    borderBottom:
                      "1px solid rgba(148,163,184,.10)",
                    background:
                      "rgba(255,255,255,.025)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      🛰️ Live Report Preview
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        marginTop: 2,
                      }}
                    >
                      Your selected settings
                      are reflected here
                    </div>
                  </div>

                  <span
                    style={{
                      marginLeft: "auto",
                      padding:
                        "5px 9px",
                      borderRadius: 999,
                      background:
                        "rgba(34,197,94,.10)",
                      color: "#4ADE80",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    ● LIVE
                  </span>
                </div>

                <div
                  style={{
                    padding:
                      "24px 25px 28px",
                  }}
                >
                  {/* Document heading */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      paddingBottom: 18,
                      borderBottom:
                        "1px solid rgba(139,92,246,.22)",
                      gap: 20,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        GIID Learning Report
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "#64748B",
                        }}
                      >
                        Intelligent Adaptive
                        Learning Platform
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
                          fontSize: 13,
                          color: "#94A3B8",
                        }}
                      >
                        REPORT TYPE
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 15,
                          fontWeight: 800,
                          color:
                            "#A78BFA",
                        }}
                      >
                        {selectedType.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Student */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3,1fr)",
                      gap: 9,
                      marginTop: 18,
                    }}
                  >
                    {[
                      {
                        label:
                          "EXPLORER",
                        value:
                          student,
                        icon: "👨‍🚀",
                      },
                      {
                        label:
                          "LEVEL",
                        value:
                          selectedStudent?.learningLevel ||
                          "All Learners",
                        icon: "🌱",
                      },
                      {
                        label:
                          "FORMAT",
                        value:
                          format.toUpperCase(),
                        icon: "📄",
                      },
                    ].map(
                      (item) => (
                        <div
                          key={
                            item.label
                          }
                          style={{
                            padding: 12,
                            borderRadius: 14,
                            background:
                              "rgba(255,255,255,.035)",
                            border:
                              "1px solid rgba(148,163,184,.08)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              color:
                                "#64748B",
                            }}
                          >
                            {item.icon}{" "}
                            {item.label}
                          </div>

                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 15,
                              fontWeight: 700,
                              color:
                                "#E2E8F0",
                              whiteSpace:
                                "nowrap",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* KPI */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3,1fr)",
                      gap: 10,
                      marginTop: 16,
                    }}
                  >
                    <MetricCard
                      icon="🎯"
                      label="ALPI"
                      value={String(
                        reportALPI
                      )}
                      accent={
                        REPORT_PURPLE
                      }
                      delay={0}
                    />

                    <MetricCard
                      icon="🧩"
                      label="ACTIVITIES"
                      value={String(
                        reportResults.length
                      )}
                      accent={CYAN}
                      delay={0}
                    />

                    <MetricCard
                      icon="⭐"
                      label="ACCURACY"
                      value={`${reportAccuracy}%`}
                      accent={GREEN}
                      delay={0}
                    />
                  </div>

                  {/* Chart */}
                  {checks.performanceCharts && (
                    <div
                      style={{
                        marginTop: 22,
                        padding: 16,
                        borderRadius: 17,
                        background:
                          "rgba(255,255,255,.025)",
                        border:
                          "1px solid rgba(148,163,184,.08)",
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
                              fontSize: 16,
                              fontWeight: 800,
                              color:
                                "#E2E8F0",
                            }}
                          >
                            📈 Performance
                            Journey
                          </div>

                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 13,
                              color:
                                "#64748B",
                            }}
                          >
                            Recent learning
                            accuracy
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color:
                              "#67E8F9",
                          }}
                        >
                          LIVE DATA
                        </span>
                      </div>

                      <ResponsiveContainer
                        width="100%"
                        height={210}
                      >
                        <BarChart
                          data={
                            previewBarData
                          }
                          margin={{
                            top: 5,
                            right: 5,
                            left: -25,
                            bottom: 0,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(148,163,184,.08)"
                          />

                          <XAxis
                            dataKey="week"
                            tick={{
                              fontSize: 13,
                              fill: "#64748B",
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            domain={[
                              0,
                              100,
                            ]}
                            tick={{
                              fontSize: 13,
                              fill: "#64748B",
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            contentStyle={{
                              background:
                                "#111936",
                              border:
                                "1px solid rgba(139,92,246,.25)",
                              borderRadius: 10,
                              color:
                                "#fff",
                              fontFamily:
                                P,
                              fontSize: 14,
                            }}
                          />

                          <Bar
                            dataKey="ALPI"
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
                    </div>
                  )}

                  {/* Activity log */}
                  {checks.activityLog && (
                    <div
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color:
                            "#E2E8F0",
                          marginBottom: 9,
                        }}
                      >
                        🧩 Recent Missions
                      </div>

                      {activityLog.length ===
                      0 ? (
                        <div
                          style={{
                            padding: 25,
                            textAlign:
                              "center",
                            borderRadius: 15,
                            background:
                              "rgba(255,255,255,.025)",
                            color:
                              "#64748B",
                            fontSize: 14,
                          }}
                        >
                          🔭 No completed
                          missions yet.
                        </div>
                      ) : (
                        <div
                          style={{
                            overflowX:
                              "auto",
                            borderRadius:
                              15,
                            border:
                              "1px solid rgba(148,163,184,.08)",
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
                              <tr
                                style={{
                                  background:
                                    "rgba(255,255,255,.035)",
                                }}
                              >
                                {[
                                  "Date",
                                  "Mission",
                                  "Score",
                                  "Time",
                                  "Status",
                                ].map(
                                  (h) => (
                                    <th
                                      key={h}
                                      style={{
                                        padding:
                                          "9px 10px",
                                        textAlign:
                                          "left",
                                        color:
                                          "#64748B",
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {h}
                                    </th>
                                  )
                                )}
                              </tr>
                            </thead>

                            <tbody>
                              {activityLog.map(
                                (
                                  row,
                                  i
                                ) => (
                                  <motion.tr
                                    key={
                                      i
                                    }
                                    initial={{
                                      opacity: 0,
                                    }}
                                    animate={{
                                      opacity: 1,
                                    }}
                                    transition={{
                                      delay:
                                        i *
                                        0.04,
                                    }}
                                    style={{
                                      borderTop:
                                        "1px solid rgba(148,163,184,.06)",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding:
                                          "9px 10px",
                                        color:
                                          "#64748B",
                                      }}
                                    >
                                      {
                                        row.date
                                      }
                                    </td>

                                    <td
                                      style={{
                                        padding:
                                          "9px 10px",
                                        color:
                                          "#E2E8F0",
                                        fontWeight:
                                          700,
                                      }}
                                    >
                                      {
                                        row.activity
                                      }
                                    </td>

                                    <td
                                      style={{
                                        padding:
                                          "9px 10px",
                                        color:
                                          "#67E8F9",
                                        fontWeight:
                                          800,
                                      }}
                                    >
                                      {
                                        row.score
                                      }
                                    </td>

                                    <td
                                      style={{
                                        padding:
                                          "9px 10px",
                                        color:
                                          "#94A3B8",
                                      }}
                                    >
                                      {
                                        row.duration
                                      }
                                    </td>

                                    <td
                                      style={{
                                        padding:
                                          "9px 10px",
                                      }}
                                    >
                                      <StatusBadge
                                        status={
                                          row.status
                                        }
                                      />
                                    </td>
                                  </motion.tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ALPI */}
                  {checks.alpiSummary && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      style={{
                        marginTop: 18,
                        padding: 17,
                        borderRadius: 17,
                        background:
                          "linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.06))",
                        border:
                          "1px solid rgba(139,92,246,.16)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          color:
                            "#A78BFA",
                          fontWeight: 800,
                          letterSpacing:
                            ".08em",
                        }}
                      >
                        🧠 ALPI SUMMARY
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 15,
                          marginTop: 9,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color:
                              "#C4B5FD",
                          }}
                        >
                          {reportALPI}
                        </div>

                        <div
                          style={{
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              color:
                                "#CBD5E1",
                              marginBottom:
                                7,
                            }}
                          >
                            Current learner
                            mastery
                          </div>

                          <div
                            style={{
                              height: 7,
                              borderRadius:
                                999,
                              overflow:
                                "hidden",
                              background:
                                "rgba(255,255,255,.08)",
                            }}
                          >
                            <motion.div
                              initial={{
                                width: 0,
                              }}
                              animate={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    reportALPI
                                  )
                                )}%`,
                              }}
                              transition={{
                                duration: 1,
                              }}
                              style={{
                                height:
                                  "100%",
                                borderRadius:
                                  999,
                                background:
                                  "linear-gradient(90deg,#8B5CF6,#06B6D4,#22C55E)",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 13,
                      borderTop:
                        "1px solid rgba(148,163,184,.08)",
                      textAlign:
                        "center",
                      fontSize: 12,
                      color: "#475569",
                    }}
                  >
                    Generated by GIID
                    Intelligent Adaptive
                    Learning Platform •
                    Confidential
                  </div>
                </div>
              </motion.section>
            </div>
          </main>
        </div>
      </div>
    );
  }
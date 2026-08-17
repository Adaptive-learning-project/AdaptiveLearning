import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "motion/react";

const P = "Poppins, sans-serif";

/* ─── Shared sidebar nav ─── */
export function Sidebar({ active }: { active: string }) {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const nav = [
    {
      label: "Mission Control",
      icon: "🚀",
      to: "/dashboard",
    },
    {
      label: "Explore Students",
      icon: "🧑‍🚀",
      to: "/students",
    },
    {
      label: "Learning Missions",
      icon: "🪐",
      to: "/activities",
    },
    {
      label: "Analytics",
      icon: "📡",
      to: "/analytics",
    },
    {
      label: "Mission Reports",
      icon: "📜",
      to: "/reports",
    },
    {
      label: "AI Navigator",
      icon: "🤖",
      to: "/ai-generator",
    },
    ...(user.role === "admin"
      ? [
          {
            label: "Admin Command",
            icon: "🛰️",
            to: "/admin",
          },
        ]
      : []),
    {
      label: "Settings",
      icon: "⚙️",
      to: "/settings",
    },
  ];

  return (
    <aside
      className="sticky top-0 flex h-screen flex-col"
      style={{
        width: 270,
        minHeight: "100vh",
        flexShrink: 0,
        background:
          "radial-gradient(circle at 20% 10%, rgba(124,58,237,.22), transparent 30%), #070b24",
        borderRight: "1px solid rgba(255,255,255,.08)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* STAR DECORATIONS */}

      <div
        style={{
          position: "absolute",
          top: 80,
          right: 20,
          fontSize: 15,
          color: "#a78bfa",
          opacity: 0.7,
        }}
      >
        ✦
      </div>

      <div
        style={{
          position: "absolute",
          top: 240,
          left: 18,
          fontSize: 14,
          color: "#67e8f9",
          opacity: 0.6,
        }}
      >
        ✧
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 180,
          right: 25,
          fontSize: 17,
          color: "#facc15",
          opacity: 0.6,
        }}
      >
        ✦
      </div>

      {/* LOGO */}

      <Link
        to="/"
        style={{
          textDecoration: "none",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{
            borderBottom: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 46,
              height: 46,
              background:
                "linear-gradient(135deg,#7c3aed,#c026d3)",
              boxShadow:
                "0 0 25px rgba(124,58,237,.35)",
              fontSize: 23,
            }}
          >
            🚀
          </div>

          <div>
            <div
              style={{
                fontFamily: P,
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: "-0.02em",
                color: "#fff",
              }}
            >
              LEARN<span style={{ color: "#a78bfa" }}>ABLE</span>
            </div>

            <div
              style={{
                fontFamily: P,
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "0.18em",
                color: "#64748b",
                marginTop: 2,
              }}
            >
              LEARNING UNIVERSE
            </div>
          </div>
        </div>
      </Link>

      {/* USER / EXPLORER */}

      <div
        className="mx-4 mt-5 rounded-2xl p-3"
        style={{
          background: "rgba(255,255,255,.045)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              background:
                "linear-gradient(135deg,#06b6d4,#7c3aed)",
              fontFamily: P,
              fontWeight: 900,
              fontSize: 19,
              boxShadow:
                "0 0 18px rgba(6,182,212,.25)",
            }}
          >
            {(user.name || "A").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div
              style={{
                fontFamily: P,
                fontWeight: 700,
                fontSize: 17,
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name || "Explorer"}
            </div>

            <div
              style={{
                fontFamily: P,
                fontSize: 14,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginTop: 2,
              }}
            >
              {user.role || "student"}
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}

      <nav
        className="flex flex-1 flex-col gap-1 px-3 py-5"
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: P,
            fontSize: 14,
            fontWeight: 800,
            color: "#475569",
            letterSpacing: ".18em",
            paddingLeft: 12,
            marginBottom: 8,
          }}
        >
          YOUR UNIVERSE
        </div>

        {nav.map(({ label, icon, to }) => {
          const oldLabelMap: Record<string, string> = {
            Dashboard: "Mission Control",
            Students: "Explore Students",
            Activities: "Learning Missions",
            Analytics: "Analytics",
            Reports: "Mission Reports",
            "AI Generator": "AI Navigator",
            Admin: "Admin Command",
            Settings: "Settings",
          };

          const isActive =
            active === label ||
            oldLabelMap[active] === label;

          return (
            <Link
              key={label}
              to={to}
              style={{
                textDecoration: "none",
              }}
            >
              <div
                className="group flex items-center gap-3 rounded-2xl px-3 py-3"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: isActive
                    ? "linear-gradient(135deg,rgba(124,58,237,.28),rgba(6,182,212,.12))"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(167,139,250,.18)"
                    : "1px solid transparent",
                  transition: "all .2s ease",
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: 99,
                      background:
                        "linear-gradient(#a78bfa,#22d3ee)",
                      boxShadow:
                        "0 0 12px rgba(167,139,250,.8)",
                    }}
                  />
                )}

                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: 38,
                    height: 38,
                    background: isActive
                      ? "rgba(124,58,237,.22)"
                      : "rgba(255,255,255,.035)",
                    fontSize: 19,
                    transition:
                      "transform .2s ease",
                  }}
                >
                  {icon}
                </div>

                <span
                  style={{
                    fontFamily: P,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 17,
                    color: isActive
                      ? "#fff"
                      : "#94a3b8",
                  }}
                >
                  {label}
                </span>

                {isActive && (
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "#a78bfa",
                      fontSize: 16,
                    }}
                  >
                    ✦
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* SPACE STATUS */}

      <div
        className="mx-4 mb-4 rounded-2xl p-4"
        style={{
          background:
            "linear-gradient(135deg,rgba(124,58,237,.12),rgba(6,182,212,.06))",
          border:
            "1px solid rgba(124,58,237,.18)",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            style={{
              fontFamily: P,
              fontSize: 14,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: ".12em",
            }}
          >
            SPACE STATUS
          </span>

          <span
            style={{
              fontSize: 14,
              color: "#22d3ee",
              fontWeight: 800,
            }}
          >
            ● ONLINE
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div className="text-base">
              ⭐
            </div>

            <div
              style={{
                fontFamily: P,
                fontWeight: 800,
                fontSize: 19,
                color: "#facc15",
              }}
            >
              120
            </div>

            <div
              style={{
                fontFamily: P,
                fontSize: 14,
                color: "#64748b",
              }}
            >
              STAR POINTS
            </div>
          </div>

          <div>
            <div className="text-base">
              🔥
            </div>

            <div
              style={{
                fontFamily: P,
                fontWeight: 800,
                fontSize: 19,
                color: "#fb923c",
              }}
            >
              4
            </div>

            <div
              style={{
                fontFamily: P,
                fontSize: 14,
                color: "#64748b",
              }}
            >
              DAY STREAK
            </div>
          </div>
        </div>
      </div>

      {/* LOGOUT */}

      <div
        className="px-3 pb-5"
        style={{
          borderTop:
            "1px solid rgba(255,255,255,.07)",
          paddingTop: 12,
        }}
      >
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5"
          style={{
            background: "transparent",
            color: "#64748b",
            border: "none",
            cursor: "pointer",
            fontFamily: P,
            fontSize: 17,
            transition: "all .2s ease",
          }}
        >
          <span style={{ fontSize: 17 }}>
            🚪
          </span>

          <span>
            Exit Universe
          </span>
        </button>
      </div>
    </aside>
  );
}


/* ─── Top bar ─── */

export function TopBar({
  title,
  subtitle,
  user,
}: {
  title: string;
  subtitle?: string;
  user?: { name: string; role: string };
}) {
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const storedUser = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("user") || "null"
      );
    } catch {
      return null;
    }
  })();

  const currentUser =
    user ||
    storedUser || {
      name: "Explorer",
      role: "teacher",
    };

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "EX";

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-4 px-6 py-4 md:px-8"
      style={{
        background: "rgba(7,11,36,0.94)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}
    >
      {/* TITLE */}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#22d3ee",
              boxShadow: "0 0 10px #22d3ee",
            }}
          />

          <span
            style={{
              fontFamily: P,
              fontSize: 14,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: ".16em",
              textTransform: "uppercase",
            }}
          >
            Mission Control
          </span>
        </div>

        <h1
          className="mt-1 truncate"
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 24,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className="hidden md:block"
            style={{
              fontFamily: P,
              fontWeight: 400,
              fontSize: 17,
              color: "#64748b",
              marginTop: 3,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* SEARCH */}

      <div
        className="hidden items-center gap-2 rounded-2xl px-3 md:flex"
        style={{
          width: 220,
          height: 42,
          background: "rgba(255,255,255,.045)",
          border: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <span
          style={{
            fontSize: 17,
            color: "#64748b",
          }}
        >
          🔭
        </span>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the universe..."
          className="flex-1 bg-transparent outline-none"
          style={{
            fontFamily: P,
            fontSize: 17,
            color: "#fff",
          }}
        />

        <span
          style={{
            fontFamily: P,
            fontSize: 14,
            color: "#475569",
            border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 6,
            padding: "2px 5px",
          }}
        >
          /
        </span>
      </div>

      {/* XP */}

      <div
        className="hidden items-center gap-2 rounded-2xl px-3 lg:flex"
        style={{
          height: 42,
          background: "rgba(250,204,21,.07)",
          border: "1px solid rgba(250,204,21,.12)",
        }}
      >
        <span style={{ fontSize: 18 }}>
          ⭐
        </span>

        <div>
          <div
            style={{
              fontFamily: P,
              fontSize: 17,
              fontWeight: 800,
              color: "#facc15",
            }}
          >
            120
          </div>

          <div
            style={{
              fontFamily: P,
              fontSize: 14,
              color: "#64748b",
              letterSpacing: ".08em",
            }}
          >
            STAR XP
          </div>
        </div>
      </div>

      {/* NOTIFICATION */}

      <button
        type="button"
        className="relative flex items-center justify-center rounded-2xl transition hover:scale-105"
        style={{
          width: 42,
          height: 42,
          background: "rgba(255,255,255,.045)",
          border: "1px solid rgba(255,255,255,.08)",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 19 }}>
          🔔
        </span>

        <span
          style={{
            position: "absolute",
            top: 9,
            right: 9,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#f43f5e",
            boxShadow:
              "0 0 8px rgba(244,63,94,.8)",
          }}
        />
      </button>

      {/* PROFILE */}

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() =>
            setProfileOpen((v) => !v)
          }
          className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,.045)",
            border: "1px solid rgba(255,255,255,.08)",
            cursor: "pointer",
          }}
        >
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              width: 34,
              height: 34,
              background:
                "linear-gradient(135deg,#7c3aed,#06b6d4)",
              color: "#fff",
              fontFamily: P,
              fontWeight: 900,
              fontSize: 16,
              boxShadow:
                "0 0 18px rgba(124,58,237,.3)",
            }}
          >
            {initials}
          </div>

          <div className="hidden text-left lg:block">
            <div
              style={{
                fontFamily: P,
                fontWeight: 700,
                fontSize: 16,
                color: "#fff",
              }}
            >
              {currentUser?.name || "Explorer"}
            </div>

            <div
              style={{
                fontFamily: P,
                fontSize: 14,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginTop: 1,
              }}
            >
              {currentUser?.role || "teacher"}
            </div>
          </div>

          <span
            style={{
              fontSize: 16,
              color: "#64748b",
            }}
          >
            ▼
          </span>
        </button>

        {/* PROFILE DROPDOWN */}

        {profileOpen && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 10px)",
              width: 230,
              background: "#101532",
              border:
                "1px solid rgba(167,139,250,.18)",
              borderRadius: 18,
              boxShadow:
                "0 20px 60px rgba(0,0,0,.45)",
              padding: 8,
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            {/* Profile header */}

            <div
              style={{
                padding: "12px",
                borderBottom:
                  "1px solid rgba(255,255,255,.07)",
              }}
            >
              <div
                style={{
                  fontFamily: P,
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#fff",
                }}
              >
                {currentUser?.name}
              </div>

              <div
                style={{
                  fontFamily: P,
                  fontSize: 14,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginTop: 3,
                }}
              >
                {currentUser?.role}
              </div>
            </div>

            {/* Settings */}

            <button
              type="button"
              onClick={() =>
                (window.location.href = "/settings")
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/5"
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontFamily: P,
                fontSize: 16,
                color: "#cbd5e1",
              }}
            >
              ⚙️
              <span>Profile & Settings</span>
            </button>

            {/* Logout */}

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-rose-500/10"
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontFamily: P,
                fontSize: 16,
                color: "#fb7185",
              }}
            >
              🚪
              <span>Exit Universe</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}


/* ─── Stat card ─── */

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-6 flex flex-col gap-3"
      style={{
        background: "#fff",
        boxShadow:
          "0 2px 16px rgba(21,101,192,0.09)",
        border:
          "1.5px solid rgba(21,101,192,0.08)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: 44,
            height: 44,
            background: bg,
          }}
        >
          <span
            className="material-icons-round"
            style={{
              fontSize: 22,
              color,
            }}
          >
            {icon}
          </span>
        </div>

        <span
          className="text-sm px-2 py-1 rounded-full"
          style={{
            background: bg,
            color,
            fontFamily: P,
            fontWeight: 600,
          }}
        >
          +12%
        </span>
      </div>

      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 700,
            fontSize: 28,
            color: "#0D2137",
            lineHeight: 1,
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontFamily: P,
            fontWeight: 500,
            fontSize: 18,
            color: "#0D2137",
            marginTop: 4,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontFamily: P,
            fontWeight: 400,
            fontSize: 16,
            color: "#4A6580",
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      </div>
    </motion.div>
  );
}


/* ─── Data ─── */

const weeklyData = [
  { day: "Mon", alpi: 62, sessions: 8 },
  { day: "Tue", alpi: 68, sessions: 11 },
  { day: "Wed", alpi: 65, sessions: 9 },
  { day: "Thu", alpi: 74, sessions: 13 },
  { day: "Fri", alpi: 71, sessions: 12 },
  { day: "Sat", alpi: 78, sessions: 7 },
  { day: "Sun", alpi: 76, sessions: 5 },
];

const barData = [
  { name: "Aarav", score: 82 },
  { name: "Priya", score: 74 },
  { name: "Ravi", score: 91 },
  { name: "Sneha", score: 67 },
  { name: "Kiran", score: 88 },
  { name: "Meena", score: 79 },
];

const activities = [
  {
    student: "Aarav Kumar",
    activity: "Shape Matching",
    level: "Level 2",
    score: "9/10",
    time: "10:30 AM",
    status: "Completed",
  },
  {
    student: "Priya Sharma",
    activity: "Colour Matching",
    level: "Level 1",
    score: "7/10",
    time: "11:00 AM",
    status: "Completed",
  },
  {
    student: "Ravi Raj",
    activity: "Animal Matching",
    level: "Level 3",
    score: "10/10",
    time: "11:30 AM",
    status: "Completed",
  },
  {
    student: "Sneha Patel",
    activity: "Alphabet Matching",
    level: "Level 1",
    score: "6/10",
    time: "12:00 PM",
    status: "In Progress",
  },
  {
    student: "Kiran M.",
    activity: "Fruit Matching",
    level: "Level 2",
    score: "–",
    time: "2:00 PM",
    status: "Upcoming",
  },
];

const upcoming = [
  {
    title: "Shape Matching",
    students: 4,
    time: "2:00 PM",
    color: "#1565C0",
    bg: "#E3F2FD",
  },
  {
    title: "Colour Sorting",
    students: 3,
    time: "3:00 PM",
    color: "#27ae60",
    bg: "#E8F5E9",
  },
  {
    title: "Alphabet Quiz",
    students: 6,
    time: "4:00 PM",
    color: "#AB47BC",
    bg: "#F3E5F5",
  },
];

const statusColor: Record<
  string,
  { bg: string; color: string }
> = {
  Completed: {
    bg: "#E8F5E9",
    color: "#27ae60",
  },
  "In Progress": {
    bg: "#FFF9C4",
    color: "#F9A825",
  },
  Upcoming: {
    bg: "#E3F2FD",
    color: "#4F7CFF",
  },
};


export default function DashboardPage() {
  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  return (
    <div
      className="flex"
      style={{
        minHeight: "100vh",
        background: "#070b24",
        color: "#fff",
      }}
    >
      <Sidebar active="Dashboard" />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title="Mission Control"
          subtitle={`Welcome back, ${
            user.name || "Commander"
          } — here's your learning universe.`}
          user={user}
        />

        <main
          className="relative flex-1 overflow-hidden p-5 md:p-8"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, rgba(124,58,237,.12), transparent 30%), #070b24",
          }}
        >
          {/* BACKGROUND STARS */}

          <div
            className="pointer-events-none absolute right-[10%] top-10 text-2xl"
            style={{
              color: "#a78bfa",
              opacity: 0.5,
            }}
          >
            ✦
          </div>

          <div
            className="pointer-events-none absolute left-[40%] top-[25%] text-sm"
            style={{
              color: "#67e8f9",
              opacity: 0.5,
            }}
          >
            ✧
          </div>

          <div
            className="pointer-events-none absolute bottom-[20%] right-[20%] text-base"
            style={{
              color: "#facc15",
              opacity: 0.4,
            }}
          >
            ✦
          </div>

          {/* WELCOME / COMMAND CENTER */}

          <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-[#111633] via-[#0d1230] to-[#09172d] p-6 shadow-2xl shadow-violet-950/20 md:p-8">
            <div className="absolute right-[-20px] top-[-60px] text-[190px] opacity-[0.035]">
              🛰️
            </div>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-[14px] font-black uppercase tracking-[0.18em]"
                    style={{
                      background:
                        "rgba(34,211,238,.1)",
                      color: "#67e8f9",
                      border:
                        "1px solid rgba(34,211,238,.15)",
                    }}
                  >
                    ● Mission Control Online
                  </span>
                </div>

                <h2
                  style={{
                    fontFamily: P,
                    fontWeight: 900,
                    fontSize:
                      "clamp(28px, 4vw, 40px)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                  }}
                >
                  Learning Universe
                  <span
                    style={{
                      color: "#a78bfa",
                    }}
                  >
                    .
                  </span>
                </h2>

                <p
                  className="mt-3 max-w-2xl"
                  style={{
                    fontFamily: P,
                    fontSize: 17,
                    lineHeight: 1.8,
                    color: "#64748b",
                  }}
                >
                  Monitor student journeys, track ALPI
                  performance, and guide learners toward
                  their next mission.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(124,58,237,.3), rgba(124,58,237,.04))",
                    border:
                      "1px solid rgba(167,139,250,.2)",
                    boxShadow:
                      "0 0 40px rgba(124,58,237,.15)",
                  }}
                >
                  <span className="text-5xl">
                    🧑‍🚀
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* COMMAND STATS */}

          <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[
              {
                icon: "🧑‍🚀",
                value: "24",
                label: "Learners",
                sub: "21 active this week",
                accent: "#67e8f9",
              },
              {
                icon: "🚀",
                value: "186",
                label: "Missions Completed",
                sub: "+34 this week",
                accent: "#a78bfa",
              },
              {
                icon: "⭐",
                value: "76.4",
                label: "Average ALPI",
                sub: "+3.2 points",
                accent: "#facc15",
              },
              {
                icon: "🛰️",
                value: "8",
                label: "Today's Sessions",
                sub: "Next: 2:00 PM",
                accent: "#fb7185",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="group rounded-[1.5rem] border p-5 transition duration-300 hover:-translate-y-1"
                style={{
                  background:
                    "rgba(255,255,255,.035)",
                  borderColor:
                    "rgba(255,255,255,.08)",
                }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl"
                    style={{
                      background: `${stat.accent}12`,
                      border:
                        `1px solid ${stat.accent}22`,
                    }}
                  >
                    {stat.icon}
                  </div>

                  <span
                    className="text-[14px] font-black uppercase tracking-wider"
                    style={{
                      color: stat.accent,
                    }}
                  >
                    LIVE
                  </span>
                </div>

                <div
                  className="mt-5"
                  style={{
                    fontFamily: P,
                  }}
                >
                  <div
                    className="text-4xl font-black"
                    style={{
                      color: "#fff",
                    }}
                  >
                    {stat.value}
                  </div>

                  <div
                    className="mt-1 text-base font-bold"
                    style={{
                      color: "#cbd5e1",
                    }}
                  >
                    {stat.label}
                  </div>

                  <div
                    className="mt-1 text-[15px]"
                    style={{
                      color: "#64748b",
                    }}
                  >
                    {stat.sub}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* ANALYTICS COMMAND DECK */}

          <section className="mb-6 grid gap-5 xl:grid-cols-2">
            {/* WEEKLY PERFORMANCE */}

            <div
              className="rounded-[1.7rem] border p-5 md:p-6"
              style={{
                background:
                  "rgba(255,255,255,.035)",
                borderColor:
                  "rgba(255,255,255,.08)",
              }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      📡
                    </span>

                    <span
                      className="text-[14px] font-black uppercase tracking-[0.18em]"
                      style={{
                        color: "#67e8f9",
                      }}
                    >
                      Performance Signal
                    </span>
                  </div>

                  <h3
                    className="mt-2 text-xl font-black"
                    style={{
                      fontFamily: P,
                    }}
                  >
                    Weekly ALPI trajectory
                  </h3>

                  <p
                    className="mt-1 text-sm"
                    style={{
                      color: "#64748b",
                    }}
                  >
                    Learning performance across the week
                  </p>
                </div>

                <div
                  className="rounded-full px-3 py-1 text-[14px] font-black"
                  style={{
                    background:
                      "rgba(34,211,238,.08)",
                    color: "#67e8f9",
                    border:
                      "1px solid rgba(34,211,238,.12)",
                  }}
                >
                  THIS WEEK
                </div>
              </div>

              <ResponsiveContainer
                width="100%"
                height={230}
              >
                <LineChart data={weeklyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,.05)"
                  />

                  <XAxis
                    dataKey="day"
                    tick={{
                      fontFamily: P,
                      fontSize: 15,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[50, 100]}
                    tick={{
                      fontFamily: P,
                      fontSize: 15,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      fontFamily: P,
                      fontSize: 16,
                      borderRadius: 14,
                      background: "#111633",
                      border:
                        "1px solid rgba(167,139,250,.2)",
                      color: "#fff",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="alpi"
                    stroke="#a78bfa"
                    strokeWidth={3}
                    dot={{
                      fill: "#a78bfa",
                      r: 4,
                    }}
                    name="ALPI Score"
                  />

                  <Line
                    type="monotone"
                    dataKey="sessions"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Sessions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* STUDENT PERFORMANCE */}

            <div
              className="rounded-[1.7rem] border p-5 md:p-6"
              style={{
                background:
                  "rgba(255,255,255,.035)",
                borderColor:
                  "rgba(255,255,255,.08)",
              }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      🪐
                    </span>

                    <span
                      className="text-[14px] font-black uppercase tracking-[0.18em]"
                      style={{
                        color: "#a78bfa",
                      }}
                    >
                      Learner Orbits
                    </span>
                  </div>

                  <h3
                    className="mt-2 text-xl font-black"
                    style={{
                      fontFamily: P,
                    }}
                  >
                    Student ALPI signals
                  </h3>

                  <p
                    className="mt-1 text-sm"
                    style={{
                      color: "#64748b",
                    }}
                  >
                    Current learning performance
                  </p>
                </div>

                <Link
                  to="/students"
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <span
                    className="rounded-full px-3 py-1 text-[14px] font-black"
                    style={{
                      background:
                        "rgba(167,139,250,.1)",
                      color: "#c4b5fd",
                      border:
                        "1px solid rgba(167,139,250,.15)",
                    }}
                  >
                    VIEW ALL →
                  </span>
                </Link>
              </div>

              <ResponsiveContainer
                width="100%"
                height={230}
              >
                <BarChart
                  data={barData}
                  barSize={25}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,.05)"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontFamily: P,
                      fontSize: 14,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fontFamily: P,
                      fontSize: 14,
                      fill: "#64748b",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      fontFamily: P,
                      fontSize: 16,
                      borderRadius: 14,
                      background: "#111633",
                      border:
                        "1px solid rgba(167,139,250,.2)",
                    }}
                  />

                  <Bar
                    dataKey="score"
                    fill="#8b5cf6"
                    radius={[8, 8, 2, 2]}
                    name="ALPI Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ACTIVITY FEED + UPCOMING MISSIONS */}

          <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
            {/* RECENT ACTIVITY */}

            <div
              className="overflow-hidden rounded-[1.7rem] border"
              style={{
                background:
                  "rgba(255,255,255,.035)",
                borderColor:
                  "rgba(255,255,255,.08)",
              }}
            >
              <div
                className="flex items-center justify-between p-5 md:p-6"
                style={{
                  borderBottom:
                    "1px solid rgba(255,255,255,.06)",
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      🛰️
                    </span>

                    <span
                      className="text-[14px] font-black uppercase tracking-[0.18em]"
                      style={{
                        color: "#22d3ee",
                      }}
                    >
                      Live Feed
                    </span>
                  </div>

                  <h3
                    className="mt-2 text-xl font-black"
                    style={{
                      fontFamily: P,
                    }}
                  >
                    Recent learning missions
                  </h3>
                </div>

                <Link
                  to="/activities"
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <span
                    className="rounded-full px-3 py-1 text-[14px] font-black"
                    style={{
                      background:
                        "rgba(34,211,238,.08)",
                      color: "#67e8f9",
                    }}
                  >
                    VIEW ALL →
                  </span>
                </Link>
              </div>

              {/* Desktop table */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          "1px solid rgba(255,255,255,.06)",
                      }}
                    >
                      {[
                        "Learner",
                        "Mission",
                        "Level",
                        "Score",
                        "Time",
                        "Status",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-left"
                          style={{
                            fontFamily: P,
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#475569",
                            letterSpacing: ".1em",
                          }}
                        >
                          {heading.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {activities.map((row, index) => {
                      const status =
                        statusColor[row.status];

                      return (
                        <tr
                          key={index}
                          style={{
                            borderBottom:
                              "1px solid rgba(255,255,255,.04)",
                          }}
                          className="transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black"
                                style={{
                                  background:
                                    "linear-gradient(135deg,#7c3aed,#06b6d4)",
                                }}
                              >
                                {row.student.charAt(0)}
                              </div>

                              <span
                                style={{
                                  fontFamily: P,
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#e2e8f0",
                                }}
                              >
                                {row.student}
                              </span>
                            </div>
                          </td>

                          <td
                            style={{
                              fontFamily: P,
                              fontSize: 16,
                              color: "#94a3b8",
                            }}
                          >
                            {row.activity}
                          </td>

                          <td
                            style={{
                              fontFamily: P,
                              fontSize: 15,
                              color: "#64748b",
                            }}
                          >
                            {row.level}
                          </td>

                          <td
                            style={{
                              fontFamily: P,
                              fontSize: 16,
                              fontWeight: 800,
                              color: "#fff",
                            }}
                          >
                            {row.score}
                          </td>

                          <td
                            style={{
                              fontFamily: P,
                              fontSize: 15,
                              color: "#64748b",
                            }}
                          >
                            {row.time}
                          </td>

                          <td>
                            <span
                              className="rounded-full px-2.5 py-1 text-[14px] font-black"
                              style={{
                                background:
                                  row.status ===
                                  "Completed"
                                    ? "rgba(34,197,94,.1)"
                                    : row.status ===
                                      "In Progress"
                                    ? "rgba(250,204,21,.1)"
                                    : "rgba(34,211,238,.1)",

                                color:
                                  row.status ===
                                  "Completed"
                                    ? "#4ade80"
                                    : row.status ===
                                      "In Progress"
                                    ? "#facc15"
                                    : "#67e8f9",
                              }}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}

              <div className="divide-y divide-white/5 md:hidden">
                {activities.map((row, index) => (
                  <div
                    key={index}
                    className="p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black"
                          style={{
                            background:
                              "linear-gradient(135deg,#7c3aed,#06b6d4)",
                          }}
                        >
                          {row.student.charAt(0)}
                        </div>

                        <div>
                          <div className="text-base font-bold">
                            {row.student}
                          </div>

                          <div className="mt-1 text-[15px] text-slate-500">
                            {row.activity}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black">
                          {row.score}
                        </div>

                        <div className="mt-1 text-[15px] text-slate-500">
                          {row.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UPCOMING */}

            <div
              className="rounded-[1.7rem] border p-5 md:p-6"
              style={{
                background:
                  "rgba(255,255,255,.035)",
                borderColor:
                  "rgba(255,255,255,.08)",
              }}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    🚀
                  </span>

                  <span
                    className="text-[14px] font-black uppercase tracking-[0.18em]"
                    style={{
                      color: "#facc15",
                    }}
                  >
                    Flight Plan
                  </span>
                </div>

                <h3
                  className="mt-2 text-xl font-black"
                  style={{
                    fontFamily: P,
                  }}
                >
                  Upcoming missions
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {upcoming.map((item, index) => (
                  <div
                    key={index}
                    className="group rounded-2xl p-4 transition hover:-translate-y-0.5"
                    style={{
                      background:
                        "rgba(255,255,255,.035)",
                      border:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                        style={{
                          background:
                            "rgba(124,58,237,.12)",
                        }}
                      >
                        {index === 0
                          ? "🔷"
                          : index === 1
                          ? "🎨"
                          : "🔤"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-base font-bold"
                          style={{
                            color: "#e2e8f0",
                          }}
                        >
                          {item.title}
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[15px] text-slate-500">
                            👥 {item.students} learners
                          </span>

                          <span className="text-slate-700">
                            •
                          </span>

                          <span className="text-[15px] text-slate-500">
                            🕐 {item.time}
                          </span>
                        </div>
                      </div>

                      <span className="text-violet-300 transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI suggestion */}

              <div
                className="mt-5 rounded-2xl p-4"
                style={{
                  background:
                    "linear-gradient(135deg,rgba(124,58,237,.12),rgba(6,182,212,.06))",
                  border:
                    "1px solid rgba(124,58,237,.15)",
                }}
              >
                <div className="flex gap-3">
                  <div className="text-3xl">
                    🤖
                  </div>

                  <div>
                    <div
                      className="text-base font-black"
                      style={{
                        color: "#c4b5fd",
                      }}
                    >
                      AI Navigator
                    </div>

                    <p
                      className="mt-1 text-sm leading-5"
                      style={{
                        color: "#64748b",
                      }}
                    >
                      Review learners with lower ALPI
                      scores before the next mission.
                    </p>

                    <Link
                      to="/ai-generator"
                      className="mt-2 inline-block text-[15px] font-black"
                      style={{
                        color: "#67e8f9",
                        textDecoration: "none",
                      }}
                    >
                      OPEN AI NAVIGATOR →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
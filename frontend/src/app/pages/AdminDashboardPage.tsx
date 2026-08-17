import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";

const PURPLE = "#8B5CF6";
const CYAN = "#06B6D4";
const GREEN = "#22C55E";
const ORANGE = "#F97316";
const PINK = "#F472B6";

const DARK = "#E2E8F0";
const MUTED = "#94A3B8";

/* =========================================================
   TYPES
========================================================= */

interface UserToggle {
  id: number;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
}

interface ManageItem {
  name: string;
  sub: string;
  status: "Active" | "Inactive";
}

/* =========================================================
   GALAXY CSS
========================================================= */

const galaxyCSS = `
@keyframes adminFloat {
  0%,100% {
    transform: translateY(0px) rotate(-4deg);
  }

  50% {
    transform: translateY(-10px) rotate(4deg);
  }
}

@keyframes glowPulse {
  0%,100% {
    box-shadow: 0 0 10px rgba(139,92,246,.12);
  }

  50% {
    box-shadow: 0 0 35px rgba(139,92,246,.35);
  }
}

@keyframes livePulse {
  0%,100% {
    opacity: .5;
    transform: scale(.9);
  }

  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

.admin-planet {
  animation:
    adminFloat 4s ease-in-out infinite,
    glowPulse 3s ease-in-out infinite;
}

.live-dot {
  animation: livePulse 1.5s ease-in-out infinite;
}
`;

/* =========================================================
   STARS
========================================================= */

function GalaxyStars() {
  const stars = [
    ["5%", "12%"],
    ["12%", "74%"],
    ["22%", "20%"],
    ["31%", "85%"],
    ["43%", "10%"],
    ["56%", "65%"],
    ["68%", "19%"],
    ["76%", "82%"],
    ["88%", "28%"],
    ["95%", "72%"],
    ["37%", "45%"],
    ["82%", "50%"],
  ];

  return (
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
            opacity: [0.15, 0.8, 0.15],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 2 + i * 0.25,
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
              i % 3 === 0 ? 15 : 9,
          }}
        >
          {i % 2 === 0 ? "✦" : "✧"}
        </motion.span>
      ))}
    </div>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  icon,
  label,
  value,
  color,
  live,
  index,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  live?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.08,
      }}
      whileHover={{
        y: -5,
        scale: 1.01,
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "rgba(15,23,55,.92)",
        borderRadius: 21,
        padding: "20px",
        border:
          "1px solid rgba(148,163,184,.10)",
        boxShadow:
          "0 12px 30px rgba(0,0,0,.16)",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -35,
          top: -35,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `${color}12`,
          filter: "blur(5px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
        }}
      >
        <div
          style={{
            width: 43,
            height: 43,
            borderRadius: 13,
            display: "grid",
            placeItems: "center",
            background: `${color}16`,
            border:
              `1px solid ${color}22`,
            fontSize: 20,
          }}
        >
          {icon}
        </div>

        {live && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              className="live-dot"
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: GREEN,
                boxShadow:
                  `0 0 0 4px ${GREEN}18`,
              }}
            />

            <span
              style={{
                fontFamily: P,
                fontSize: 13,
                fontWeight: 800,
                color: "#86EFAC",
              }}
            >
              LIVE
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 16,
        }}
      >
        <div
          style={{
            fontFamily: P,
            fontSize: 28,
            fontWeight: 800,
            color: "#fff",
          }}
        >
          {value}
        </div>

        <div
          style={{
            marginTop: 2,
            fontFamily: P,
            fontSize: 14,
            fontWeight: 600,
            color: MUTED,
          }}
        >
          {label}
        </div>
      </div>
    </motion.div>
  );
}

/* =========================================================
   AVATAR
========================================================= */

function Avatar({
  name,
  size = 36,
}: {
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const colors = [
    PURPLE,
    CYAN,
    GREEN,
    ORANGE,
    PINK,
  ];

  const index =
    name.charCodeAt(0) %
    colors.length;

  return (
    <motion.div
      whileHover={{
        scale: 1.08,
      }}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          `linear-gradient(135deg,${colors[index]},#111936)`,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        border:
          "1px solid rgba(255,255,255,.12)",
      }}
    >
      <span
        style={{
          fontFamily: P,
          fontWeight: 800,
          fontSize: size * 0.35,
          color: "#fff",
        }}
      >
        {initials}
      </span>
    </motion.div>
  );
}

/* =========================================================
   BADGE
========================================================= */

function Badge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span
      style={{
        fontFamily: P,
        fontSize: 12,
        fontWeight: 800,
        color,
        background: `${color}12`,
        border:
          `1px solid ${color}22`,
        borderRadius: 20,
        padding: "4px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* =========================================================
   MANAGE CARD
========================================================= */

function ManageCard({
  icon,
  title,
  count,
  items,
  color,
  onAdd,
}: {
  icon: string;
  title: string;
  count: number;
  items: ManageItem[];
  color: string;
  onAdd?: () => void;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      whileHover={{
        y: -4,
      }}
      style={{
        background:
          "rgba(15,23,55,.92)",
        borderRadius: 21,
        padding: 20,
        border:
          "1px solid rgba(148,163,184,.10)",
        boxShadow:
          "0 12px 30px rgba(0,0,0,.15)",
        display: "flex",
        flexDirection: "column",
        gap: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 39,
              height: 39,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: `${color}13`,
              fontSize: 18,
            }}
          >
            {icon}
          </div>

          <div>
            <div
              style={{
                fontFamily: P,
                fontSize: 17,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontFamily: P,
                fontSize: 12,
                color: MUTED,
                marginTop: 2,
              }}
            >
              {count} total
            </div>
          </div>
        </div>

        <span
          style={{
            fontFamily: P,
            fontSize: 13,
            fontWeight: 700,
            color,
          }}
        >
          View all →
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 9,
          maxHeight: 185,
          overflowY: "auto",
        }}
      >
        {items.map((item) => (
          <motion.div
            key={item.name}
            whileHover={{
              x: 3,
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 6px",
              borderRadius: 12,
              background:
                "rgba(255,255,255,.025)",
            }}
          >
            <Avatar
              name={item.name}
              size={31}
            />

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontFamily: P,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#E2E8F0",
                  whiteSpace:
                    "nowrap",
                  overflow:
                    "hidden",
                  textOverflow:
                    "ellipsis",
                }}
              >
                {item.name}
              </div>

              <div
                style={{
                  fontFamily: P,
                  fontSize: 12,
                  color: "#64748B",
                  marginTop: 2,
                }}
              >
                {item.sub}
              </div>
            </div>

            <Badge
              label={item.status}
              color={
                item.status ===
                "Active"
                  ? GREEN
                  : MUTED
              }
            />
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{
          scale: 1.01,
        }}
        whileTap={{
          scale: 0.97,
        }}
        onClick={onAdd}
        style={{
          background:
            "linear-gradient(135deg,#7C3AED,#06B6D4)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "10px 0",
          fontFamily: P,
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ＋ Add New {title.slice(0, -1)}
      </motion.button>
    </motion.div>
  );
}

/* =========================================================
   TOGGLE
========================================================= */

function ToggleSwitch({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      whileTap={{
        scale: 0.9,
      }}
      onClick={onToggle}
      aria-label="Toggle user"
      style={{
        width: 41,
        height: 22,
        borderRadius: 20,
        background: on
          ? `linear-gradient(135deg,${PURPLE},${CYAN})`
          : "#334155",
        border:
          "1px solid rgba(255,255,255,.08)",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={{
          x: on ? 18 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{
          position: "absolute",
          top: 2,
          left: 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
        }}
      />
    </motion.button>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{
        y: -4,
      }}
      whileTap={{
        scale: 0.97,
      }}
      onClick={onClick}
      style={{
        textAlign: "left",
        background:
          "rgba(15,23,55,.92)",
        border:
          "1px solid rgba(148,163,184,.10)",
        borderRadius: 18,
        padding: 17,
        cursor: "pointer",
        color: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 22,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          marginTop: 9,
          fontFamily: P,
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 3,
          fontFamily: P,
          fontSize: 12,
          color: MUTED,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </motion.button>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<
      | "All Users"
      | "Teachers"
      | "Students"
      | "Admins"
    >("All Users");

  const [search, setSearch] =
    useState("");

  const [users, setUsers] =
    useState<UserToggle[]>([
      {
        id: 1,
        name: "Priya Rajan",
        email: "priya@giid.edu",
        role: "Teacher",
        enabled: true,
      },
      {
        id: 2,
        name: "Arun Kumar",
        email: "arun@giid.edu",
        role: "Teacher",
        enabled: true,
      },
      {
        id: 3,
        name: "Meena Devi",
        email: "meena@giid.edu",
        role: "Student",
        enabled: false,
      },
      {
        id: 4,
        name: "Suresh V",
        email: "suresh@giid.edu",
        role: "Admin",
        enabled: true,
      },
      {
        id: 5,
        name: "Kavitha N",
        email: "kavitha@giid.edu",
        role: "Student",
        enabled: true,
      },
      {
        id: 6,
        name: "Raj Mohan",
        email: "raj@giid.edu",
        role: "Teacher",
        enabled: false,
      },
    ]);

  const tabs = [
    "All Users",
    "Teachers",
    "Students",
    "Admins",
  ] as const;

  const filteredUsers =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      return users.filter((u) => {
        const matchesTab =
          activeTab ===
            "All Users" ||
          (activeTab ===
            "Admins" &&
            u.role ===
              "Admin") ||
          (activeTab ===
            "Teachers" &&
            u.role ===
              "Teacher") ||
          (activeTab ===
            "Students" &&
            u.role ===
              "Student");

        const matchesSearch =
          !text ||
          u.name
            .toLowerCase()
            .includes(text) ||
          u.email
            .toLowerCase()
            .includes(text) ||
          u.role
            .toLowerCase()
            .includes(text);

        return (
          matchesTab &&
          matchesSearch
        );
      });
    }, [
      users,
      activeTab,
      search,
    ]);

  const toggleUser = (
    id: number
  ) => {
    setUsers((previous) =>
      previous.map((user) =>
        user.id === id
          ? {
              ...user,
              enabled:
                !user.enabled,
            }
          : user
      )
    );
  };

  const teachers: ManageItem[] =
    [
      {
        name: "Priya Rajan",
        sub: "Special Education",
        status: "Active",
      },
      {
        name: "Arun Kumar",
        sub: "Speech Therapy",
        status: "Active",
      },
      {
        name: "Lalitha S",
        sub: "Occupational Therapy",
        status: "Inactive",
      },
      {
        name: "Deepa M",
        sub: "Behavioural Therapy",
        status: "Active",
      },
    ];

  const students: ManageItem[] =
    [
      {
        name: "Karthik R",
        sub: "Age 8 · Class A",
        status: "Active",
      },
      {
        name: "Sindhu P",
        sub: "Age 10 · Class B",
        status: "Active",
      },
      {
        name: "Hari Shankar",
        sub: "Age 6 · Class A",
        status: "Inactive",
      },
      {
        name: "Nandha K",
        sub: "Age 12 · Class C",
        status: "Active",
      },
    ];

  const activities: ManageItem[] =
    [
      {
        name: "Animal Flashcards",
        sub: "Flashcard · Easy",
        status: "Active",
      },
      {
        name: "Colour Quiz",
        sub: "Quiz · Medium",
        status: "Active",
      },
      {
        name: "Number Matching",
        sub: "Game · Easy",
        status: "Active",
      },
      {
        name: "Shape Story",
        sub: "Story · Hard",
        status: "Inactive",
      },
    ];

  const logins = [
    {
      name: "Priya Rajan",
      role: "Teacher",
      time: "Today 09:14 AM",
      ip: "192.168.1.10",
      online: true,
    },
    {
      name: "Arun Kumar",
      role: "Teacher",
      time: "Today 08:52 AM",
      ip: "192.168.1.14",
      online: true,
    },
    {
      name: "Suresh V",
      role: "Admin",
      time: "Today 08:30 AM",
      ip: "192.168.1.2",
      online: true,
    },
    {
      name: "Deepa M",
      role: "Teacher",
      time: "Yesterday 04:20 PM",
      ip: "192.168.1.19",
      online: false,
    },
    {
      name: "Lalitha S",
      role: "Teacher",
      time: "Yesterday 02:05 PM",
      ip: "192.168.1.22",
      online: false,
    },
  ];

  const settingLinks = [
    {
      icon: "🎨",
      label: "Theme",
      desc: "Customize colors and appearance",
      to: "/settings",
    },
    {
      icon: "🌍",
      label: "Language",
      desc: "Set language and region",
      to: "/settings",
    },
    {
      icon: "🔔",
      label: "Notifications",
      desc: "Manage alert preferences",
      to: "/settings",
    },
    {
      icon: "☁️",
      label: "Backup",
      desc: "Export and backup data",
      to: "/settings",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 75% 0%,rgba(124,58,237,.18),transparent 30%),radial-gradient(circle at 10% 80%,rgba(6,182,212,.08),transparent 28%),#070B24",
        color: "#fff",
        fontFamily: P,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{galaxyCSS}</style>

      <GalaxyStars />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <div
        style={{
          position: "relative",
          zIndex: 5,
        }}
      >
        <Sidebar active="Admin" />
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection:
            "column",
          position: "relative",
          zIndex: 2,
        }}
      >
        <TopBar
          title="Admin Galaxy"
          subtitle="Platform command center and system management"
        />

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding:
              "25px 30px 60px",
          }}
        >
          {/* =================================================
              HERO
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 18,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 27,
              padding:
                "25px 30px",
              marginBottom: 20,
              background:
                "linear-gradient(135deg,#312E81,#111936 60%,#0E7490)",
              border:
                "1px solid rgba(167,139,250,.16)",
              boxShadow:
                "0 20px 55px rgba(0,0,0,.25)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  color: "#A78BFA",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing:
                    ".13em",
                }}
              >
                👑 ADMIN COMMAND CENTER
              </div>

              <h1
                style={{
                  margin:
                    "6px 0 5px",
                  fontSize: 25,
                  fontWeight: 800,
                }}
              >
                Control Your Learning Galaxy
              </h1>

              <p
                style={{
                  margin: 0,
                  color:
                    "#CBD5E1",
                  fontSize: 14,
                  maxWidth: 650,
                }}
              >
                Manage users, teachers,
                students, activities and
                platform settings from one
                intelligent control center.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 7,
                  marginTop: 14,
                  flexWrap:
                    "wrap",
                }}
              >
                {[
                  "🟢 System Online",
                  "🛡️ Secure",
                  "⚡ 99.8% Uptime",
                ].map((item) => (
                  <span
                    key={item}
                    style={{
                      padding:
                        "5px 9px",
                      borderRadius:
                        20,
                      background:
                        "rgba(255,255,255,.06)",
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        "#CBD5E1",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              className="admin-planet"
              style={{
                position:
                  "relative",
                zIndex: 2,
                width: 115,
                height: 115,
                borderRadius:
                  "50%",
                display: "grid",
                placeItems:
                  "center",
                background:
                  "radial-gradient(circle at 30% 25%,#fff,#A78BFA 17%,#6D28D9 55%,#111936 100%)",
                fontSize: 48,
                border:
                  "1px solid rgba(167,139,250,.5)",
                flexShrink: 0,
              }}
            >
              👑
            </motion.div>
          </motion.section>

          {/* =================================================
              KPIs
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4,1fr)",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <KpiCard
              index={0}
              icon="🧑‍🏫"
              label="Total Teachers"
              value={12}
              color={PURPLE}
            />

            <KpiCard
              index={1}
              icon="👨‍🎓"
              label="Total Students"
              value={148}
              color={CYAN}
            />

            <KpiCard
              index={2}
              icon="🚀"
              label="Active Sessions"
              value={7}
              color={ORANGE}
              live
            />

            <KpiCard
              index={3}
              icon="🛡️"
              label="Platform Uptime"
              value="99.8%"
              color={GREEN}
            />
          </div>

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <div
            style={{
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              ⚡ Quick Actions
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4,1fr)",
                gap: 12,
              }}
            >
              <QuickAction
                icon="👨‍🎓"
                title="Add Student"
                description="Register a new learner"
                onClick={() =>
                  navigate(
                    "/students/add"
                  )
                }
              />

              <QuickAction
                icon="🧠"
                title="Create Activity"
                description="Build a learning activity"
                onClick={() =>
                  navigate(
                    "/ai-generator"
                  )
                }
              />

              <QuickAction
                icon="📊"
                title="View Analytics"
                description="Explore learning performance"
                onClick={() =>
                  navigate(
                    "/analytics"
                  )
                }
              />

              <QuickAction
                icon="📄"
                title="Generate Report"
                description="Create a performance report"
                onClick={() =>
                  navigate(
                    "/reports"
                  )
                }
              />
            </div>
          </div>

          {/* =================================================
              MANAGE CARDS
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <ManageCard
              icon="🧑‍🏫"
              title="Teachers"
              count={12}
              items={teachers}
              color={PURPLE}
              onAdd={() =>
                navigate(
                  "/students/add"
                )
              }
            />

            <ManageCard
              icon="👨‍🎓"
              title="Students"
              count={148}
              items={students}
              color={CYAN}
              onAdd={() =>
                navigate(
                  "/students/add"
                )
              }
            />

            <ManageCard
              icon="🧩"
              title="Activities"
              count={24}
              items={activities}
              color={GREEN}
              onAdd={() =>
                navigate(
                  "/ai-generator"
                )
              }
            />
          </div>

          {/* =================================================
              RECENT LOGINS + USER MANAGEMENT
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* RECENT LOGINS */}

            <motion.div
              initial={{
                opacity: 0,
                x: -15,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              style={{
                background:
                  "rgba(15,23,55,.92)",
                borderRadius: 21,
                padding: 20,
                border:
                  "1px solid rgba(148,163,184,.10)",
                boxShadow:
                  "0 12px 30px rgba(0,0,0,.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom: 17,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                    }}
                  >
                    🔐 Recent Logins
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      color: MUTED,
                    }}
                  >
                    Latest platform access
                  </div>
                </div>

                <Badge
                  label="5 EVENTS"
                  color={CYAN}
                />
              </div>

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: 6,
                }}
              >
                {logins.map(
                  (row) => (
                    <motion.div
                      key={
                        row.name
                      }
                      whileHover={{
                        x: 3,
                      }}
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "1.5fr .7fr 1.3fr .9fr",
                        gap: 8,
                        alignItems:
                          "center",
                        padding:
                          "9px 6px",
                        borderRadius:
                          12,
                        background:
                          "rgba(255,255,255,.025)",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 7,
                          minWidth: 0,
                        }}
                      >
                        <Avatar
                          name={
                            row.name
                          }
                          size={28}
                        />

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight:
                              700,
                            whiteSpace:
                              "nowrap",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                          }}
                        >
                          {
                            row.name
                          }
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: 12,
                          color:
                            MUTED,
                        }}
                      >
                        {
                          row.role
                        }
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color:
                            MUTED,
                        }}
                      >
                        {
                          row.time
                        }
                      </span>

                      <Badge
                        label={
                          row.online
                            ? "● Online"
                            : "Offline"
                        }
                        color={
                          row.online
                            ? GREEN
                            : MUTED
                        }
                      />
                    </motion.div>
                  )
                )}
              </div>
            </motion.div>

            {/* USER MANAGEMENT */}

            <motion.div
              initial={{
                opacity: 0,
                x: 15,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              style={{
                background:
                  "rgba(15,23,55,.92)",
                borderRadius: 21,
                padding: 20,
                border:
                  "1px solid rgba(148,163,184,.10)",
                boxShadow:
                  "0 12px 30px rgba(0,0,0,.15)",
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
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                    }}
                  >
                    👥 User Management
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      color: MUTED,
                    }}
                  >
                    Control account access
                  </div>
                </div>

                <Badge
                  label={`${filteredUsers.length} USERS`}
                  color={PURPLE}
                />
              </div>

              {/* SEARCH */}

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  padding:
                    "8px 11px",
                  borderRadius:
                    12,
                  background:
                    "rgba(255,255,255,.035)",
                  border:
                    "1px solid rgba(148,163,184,.10)",
                  marginBottom: 11,
                }}
              >
                <span
                  style={{
                    color:
                      "#64748B",
                    fontSize: 17,
                  }}
                >
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search users..."
                  style={{
                    flex: 1,
                    background:
                      "transparent",
                    border: "none",
                    outline:
                      "none",
                    color:
                      "#E2E8F0",
                    fontFamily: P,
                    fontSize: 13,
                  }}
                />
              </div>

              {/* TABS */}

              <div
                style={{
                  display:
                    "flex",
                  gap: 5,
                  marginBottom:
                    13,
                  flexWrap:
                    "wrap",
                }}
              >
                {tabs.map(
                  (tab) => (
                    <motion.button
                      key={tab}
                      whileTap={{
                        scale:
                          0.95,
                      }}
                      onClick={() =>
                        setActiveTab(
                          tab
                        )
                      }
                      style={{
                        fontFamily:
                          P,
                        fontSize: 12,
                        fontWeight:
                          700,
                        padding:
                          "6px 10px",
                        borderRadius:
                          20,
                        border:
                          activeTab ===
                          tab
                            ? `1px solid ${PURPLE}`
                            : "1px solid rgba(148,163,184,.10)",
                        cursor:
                          "pointer",
                        background:
                          activeTab ===
                          tab
                            ? "rgba(139,92,246,.14)"
                            : "rgba(255,255,255,.025)",
                        color:
                          activeTab ===
                          tab
                            ? "#C4B5FD"
                            : MUTED,
                      }}
                    >
                      {tab}
                    </motion.button>
                  )
                )}
              </div>

              {/* USERS */}

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: 6,
                  maxHeight:
                    280,
                  overflowY:
                    "auto",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map(
                    (user) => (
                      <motion.div
                        key={
                          user.id
                        }
                        layout
                        initial={{
                          opacity: 0,
                          x: 10,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          x: -10,
                        }}
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 8,
                          padding:
                            "7px 6px",
                          borderRadius:
                            12,
                          background:
                            "rgba(255,255,255,.025)",
                        }}
                      >
                        <Avatar
                          name={
                            user.name
                          }
                          size={29}
                        />

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight:
                                700,
                              color:
                                "#E2E8F0",
                            }}
                          >
                            {
                              user.name
                            }
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color:
                                "#64748B",
                              marginTop:
                                2,
                              whiteSpace:
                                "nowrap",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                          >
                            {
                              user.email
                            }
                          </div>
                        </div>

                        <Badge
                          label={
                            user.role
                          }
                          color={
                            user.role ===
                            "Admin"
                              ? PINK
                              : user.role ===
                                "Teacher"
                              ? PURPLE
                              : CYAN
                          }
                        />

                        <ToggleSwitch
                          on={
                            user.enabled
                          }
                          onToggle={() =>
                            toggleUser(
                              user.id
                            )
                          }
                        />
                      </motion.div>
                    )
                  )}
                </AnimatePresence>

                {filteredUsers.length ===
                  0 && (
                  <div
                    style={{
                      padding:
                        "30px 10px",
                      textAlign:
                        "center",
                      color:
                        MUTED,
                      fontSize: 13,
                    }}
                  >
                    🔭 No users found
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* =================================================
              PLATFORM SETTINGS
          ================================================= */}

          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                marginBottom: 10,
              }}
            >
              ⚙️ Platform Control
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(4,1fr)",
                gap: 12,
              }}
            >
              {settingLinks.map(
                ({
                  icon,
                  label,
                  desc,
                  to,
                }) => (
                  <Link
                    key={label}
                    to={to}
                    style={{
                      textDecoration:
                        "none",
                    }}
                  >
                    <motion.div
                      whileHover={{
                        y: -4,
                      }}
                      style={{
                        background:
                          "rgba(15,23,55,.92)",
                        borderRadius:
                          18,
                        padding: 17,
                        border:
                          "1px solid rgba(148,163,184,.10)",
                        cursor:
                          "pointer",
                      }}
                    >
                      <div
                        style={{
                          width: 39,
                          height: 39,
                          borderRadius:
                            12,
                          display:
                            "grid",
                          placeItems:
                            "center",
                          background:
                            "rgba(139,92,246,.10)",
                          fontSize:
                            18,
                        }}
                      >
                        {icon}
                      </div>

                      <div
                        style={{
                          marginTop:
                            11,
                          fontSize: 15,
                          fontWeight:
                            800,
                          color:
                            "#E2E8F0",
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          marginTop:
                            3,
                          fontSize: 12,
                          color:
                            MUTED,
                          lineHeight:
                            1.5,
                        }}
                      >
                        {desc}
                      </div>

                      <div
                        style={{
                          marginTop:
                            10,
                          fontSize: 12,
                          fontWeight:
                            800,
                          color:
                            "#A78BFA",
                        }}
                      >
                        Configure →
                      </div>
                    </motion.div>
                  </Link>
                )
              )}
            </div>
          </div>

          {/* FOOTER */}

          <div
            style={{
              textAlign:
                "center",
              paddingTop: 5,
              color:
                "#475569",
              fontSize: 12,
            }}
          >
            🌌 GIID Admin Galaxy ·
            Secure Platform Control Center
          </div>
        </main>
      </div>
    </div>
  );
}
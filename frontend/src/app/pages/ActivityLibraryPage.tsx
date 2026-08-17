import { useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";

type Activity = {
  id: string;
  title: string;
  desc: string;
  difficulty: string;
  time: string;
  category: string;
  color: string;
  bg: string;
  iconBg: string;
  icon: string;
  emoji: string;
  xp: number;
  illustration: React.ReactNode;
};

const activities: Activity[] = [
  {
    id: "shape-matching",
    title: "Shape Matching",
    desc: "Match shapes by recognising circles, squares, triangles and more.",
    difficulty: "Level 1",
    time: "10–15 min",
    category: "Visual",
    color: "#38bdf8",
    bg: "linear-gradient(135deg,#0c2744,#102d4b)",
    iconBg: "#0284c7",
    icon: "category",
    emoji: "🔷",
    xp: 25,
    illustration: (
      <svg viewBox="0 0 120 90" fill="none" className="h-full w-full">
        <circle cx="30" cy="45" r="20" fill="#38bdf8" opacity=".35" />
        <rect x="65" y="24" width="40" height="40" rx="6" fill="#38bdf8" />
        <polygon points="105,72 120,72 112.5,56" fill="#7dd3fc" />
        <circle
          cx="30"
          cy="45"
          r="20"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeDasharray="6 3"
        />
      </svg>
    ),
  },

  {
    id: "colour-matching",
    title: "Colour Matching",
    desc: "Identify and match colours using vibrant interactive tiles.",
    difficulty: "Level 1",
    time: "8–12 min",
    category: "Visual",
    color: "#fb7185",
    bg: "linear-gradient(135deg,#3b1823,#401c29)",
    iconBg: "#f97316",
    icon: "palette",
    emoji: "🎨",
    xp: 25,
    illustration: (
      <svg viewBox="0 0 120 90" fill="none" className="h-full w-full">
        <circle cx="30" cy="45" r="19" fill="#fb7185" />
        <circle cx="62" cy="45" r="19" fill="#fbbf24" />
        <circle cx="94" cy="45" r="19" fill="#2dd4bf" />
        <circle cx="30" cy="45" r="19" fill="none" stroke="#fff" />
        <circle cx="62" cy="45" r="19" fill="none" stroke="#fff" />
        <circle cx="94" cy="45" r="19" fill="none" stroke="#fff" />
      </svg>
    ),
  },

  {
    id: "animal-matching",
    title: "Animal Matching",
    desc: "Match animals with their names, sounds and habitats.",
    difficulty: "Level 2",
    time: "12–18 min",
    category: "Cognitive",
    color: "#4ade80",
    bg: "linear-gradient(135deg,#102e24,#143d2d)",
    iconBg: "#16a34a",
    icon: "pets",
    emoji: "🦁",
    xp: 30,
    illustration: (
      <svg viewBox="0 0 120 90" fill="none" className="h-full w-full">
        <ellipse cx="60" cy="52" rx="28" ry="22" fill="#4ade80" opacity=".35" />
        <ellipse cx="60" cy="42" rx="18" ry="18" fill="#4ade80" />
        <ellipse cx="48" cy="30" rx="8" ry="10" fill="#22c55e" />
        <ellipse cx="72" cy="30" rx="8" ry="10" fill="#22c55e" />
        <circle cx="55" cy="42" r="3" fill="#07111f" />
        <circle cx="65" cy="42" r="3" fill="#07111f" />
        <path
          d="M53 50 Q60 56 67 50"
          stroke="#07111f"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },

  {
    id: "alphabet-matching",
    title: "Alphabet Matching",
    desc: "Connect uppercase and lowercase letters to build literacy skills.",
    difficulty: "Level 2",
    time: "10–15 min",
    category: "Literacy",
    color: "#c084fc",
    bg: "linear-gradient(135deg,#27133b,#34164b)",
    iconBg: "#a855f7",
    icon: "abc",
    emoji: "🔤",
    xp: 30,
    illustration: (
      <svg viewBox="0 0 120 90" fill="none" className="h-full w-full">
        <rect x="10" y="20" width="46" height="50" rx="10" fill="#a855f7" />
        <rect x="64" y="20" width="46" height="50" rx="10" fill="#7e22ce" />
        <text
          x="33"
          y="53"
          textAnchor="middle"
          fontFamily={P}
          fontWeight="800"
          fontSize="28"
          fill="#fff"
        >
          A
        </text>
        <text
          x="87"
          y="53"
          textAnchor="middle"
          fontFamily={P}
          fontWeight="800"
          fontSize="24"
          fill="#fff"
        >
          a
        </text>
      </svg>
    ),
  },

  {
    id: "fruit-matching",
    title: "Fruit Matching",
    desc: "Identify, name and match fruits — building vocabulary and memory.",
    difficulty: "Level 1",
    time: "8–12 min",
    category: "Vocabulary",
    color: "#fbbf24",
    bg: "linear-gradient(135deg,#3a2910,#4a3210)",
    iconBg: "#f59e0b",
    icon: "local_florist",
    emoji: "🍎",
    xp: 25,
    illustration: (
      <div className="flex items-center justify-center gap-3 text-5xl">
        🍎 🍌 🍓
      </div>
    ),
  },

  {
    id: "picture-identification",
    title: "Picture Identification",
    desc: "Identify everyday objects from pictures to strengthen visual memory.",
    difficulty: "Level 2",
    time: "12–18 min",
    category: "Memory",
    color: "#2dd4bf",
    bg: "linear-gradient(135deg,#0b3030,#103c3a)",
    iconBg: "#14b8a6",
    icon: "image_search",
    emoji: "🖼️",
    xp: 30,
    illustration: (
      <svg viewBox="0 0 120 90" fill="none" className="h-full w-full">
        <rect x="10" y="15" width="100" height="65" rx="12" fill="#14b8a6" opacity=".25" />
        <rect x="18" y="23" width="84" height="49" rx="8" fill="#0f766e" />
        <circle cx="38" cy="42" r="10" fill="#5eead4" />
        <rect x="54" y="34" width="42" height="8" rx="4" fill="#2dd4bf" />
        <rect x="54" y="46" width="32" height="8" rx="4" fill="#2dd4bf" />
      </svg>
    ),
  },

  {
    id: "drag-drop",
    title: "Drag & Drop Sorting",
    desc: "Sort and categorise objects using intuitive drag and drop interactions.",
    difficulty: "Level 3",
    time: "15–20 min",
    category: "Motor Skills",
    color: "#818cf8",
    bg: "linear-gradient(135deg,#1b2050,#252b62)",
    iconBg: "#6366f1",
    icon: "drag_indicator",
    emoji: "🧩",
    xp: 40,
    illustration: (
      <svg viewBox="0 0 120 90" fill="none" className="h-full w-full">
        <rect
          x="8"
          y="30"
          width="36"
          height="36"
          rx="10"
          fill="#6366f1"
          opacity=".3"
          stroke="#818cf8"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
        <rect
          x="54"
          y="30"
          width="36"
          height="36"
          rx="10"
          fill="#6366f1"
          opacity=".3"
          stroke="#818cf8"
          strokeWidth="2"
          strokeDasharray="5 3"
        />
        <rect x="18" y="12" width="30" height="30" rx="8" fill="#6366f1" />
        <text
          x="33"
          y="32"
          textAnchor="middle"
          fontFamily={P}
          fontWeight="700"
          fontSize="16"
          fill="#fff"
        >
          A
        </text>
      </svg>
    ),
  },

  {
    id: "number-matching",
    title: "Number Matching",
    desc: "Match numbers 1–4 with their dot patterns to build early numeracy.",
    difficulty: "Level 1",
    time: "8–12 min",
    category: "Numeracy",
    color: "#2dd4bf",
    bg: "linear-gradient(135deg,#0b3030,#103c3a)",
    iconBg: "#14b8a6",
    icon: "123",
    emoji: "🔢",
    xp: 25,
    illustration: (
      <div className="flex items-center justify-center gap-3 text-5xl font-black text-teal-300">
        3 •••
      </div>
    ),
  },

  {
    id: "sound-matching",
    title: "Sound Matching",
    desc: "Match animals with their sounds — building listening and association skills.",
    difficulty: "Level 2",
    time: "10–14 min",
    category: "Cognitive",
    color: "#fb7185",
    bg: "linear-gradient(135deg,#3b1823,#401c29)",
    iconBg: "#f97316",
    icon: "volume_up",
    emoji: "🔊",
    xp: 30,
    illustration: (
      <div className="flex items-center justify-center gap-4 text-5xl">
        🦁 🔊
      </div>
    ),
  },

  {
    id: "memory",
    title: "Memory Matching",
    desc: "Find matching pairs to strengthen memory, attention and concentration.",
    difficulty: "Level 2",
    time: "10–15 min",
    category: "Memory",
    color: "#a78bfa",
    bg: "linear-gradient(135deg,#25194a,#30205b)",
    iconBg: "#8b5cf6",
    icon: "psychology",
    emoji: "🧠",
    xp: 30,
    illustration: (
      <div className="flex items-center justify-center gap-4 text-5xl">
        ❓ ❓
      </div>
    ),
  },

  {
    id: "size-sorting",
    title: "Size Sorting",
    desc: "Arrange objects from smallest to largest — developing visual discrimination.",
    difficulty: "Level 2",
    time: "10–14 min",
    category: "Visual",
    color: "#f472b6",
    bg: "linear-gradient(135deg,#42162e,#531a38)",
    iconBg: "#ec4899",
    icon: "swap_vert",
    emoji: "📏",
    xp: 30,
    illustration: (
      <div className="flex items-end justify-center gap-2 text-5xl">
        🔵 🟣 🟪
      </div>
    ),
  },
];

const categories = [
  "All",
  "Visual",
  "Cognitive",
  "Literacy",
  "Vocabulary",
  "Memory",
  "Motor Skills",
  "Numeracy",
];

const diffFilter = [
  "All Levels",
  "Level 1",
  "Level 2",
  "Level 3",
];

const categoryIcons: Record<string, string> = {
  All: "🌌",
  Visual: "🎨",
  Cognitive: "🧠",
  Literacy: "🔤",
  Vocabulary: "🍎",
  Memory: "🧩",
  "Motor Skills": "🏃",
  Numeracy: "🔢",
};

export default function ActivityLibraryPage() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [diff, setDiff] = useState("All Levels");

  const [selectedActivity, setSelectedActivity] =
    useState<Activity | null>(null);

  const [showMission, setShowMission] = useState(false);

  const filtered = activities.filter((a) => {
    const text = search.toLowerCase().trim();

    const matchSearch =
      !text ||
      a.title.toLowerCase().includes(text) ||
      a.desc.toLowerCase().includes(text) ||
      a.category.toLowerCase().includes(text);

    const matchCat =
      cat === "All" || a.category === cat;

    const matchDiff =
      diff === "All Levels" ||
      a.difficulty === diff;

    return matchSearch && matchCat && matchDiff;
  });

  const recommended =
    filtered.find((a) => a.difficulty === "Level 1") ||
    filtered[0];

  const openMission = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowMission(true);
  };

  const closeMission = () => {
    setShowMission(false);

    setTimeout(() => {
      setSelectedActivity(null);
    }, 200);
  };

  const getPlayRoute = (id: string) => {
    if (id === "picture-identification") {
      return "/learn/picture-identification";
    }

    if (id === "drag-drop") {
      return "/learn/drag-drop";
    }

    if (id === "memory") {
      return "/learn/memory";
    }

    return `/learn/${id}`;
  };

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "#070b24",
        color: "#fff",
      }}
    >
      <Sidebar active="Activities" />

      <div className="flex min-w-0 flex-1 flex-col">

        <TopBar
          title="Activity Command Center"
          subtitle="Browse, assign and launch learning missions"
        />

        <main
          className="relative flex-1 overflow-hidden p-5 md:p-8"
          style={{
            background:
              "radial-gradient(circle at 75% 0%, rgba(124,58,237,.15), transparent 30%), radial-gradient(circle at 10% 50%, rgba(6,182,212,.06), transparent 25%), #070b24",
          }}
        >

          {/* =========================================
              SPACE DECORATIONS
          ========================================= */}

          <div className="pointer-events-none absolute left-[8%] top-[15%] text-[19px] text-violet-300 opacity-60">
            ✦
          </div>

          <div className="pointer-events-none absolute right-[12%] top-[22%] text-xl text-cyan-300 opacity-40">
            ✧
          </div>

          <div className="pointer-events-none absolute bottom-[20%] right-[25%] text-[19px] text-yellow-300 opacity-40">
            ✦
          </div>

          {/* =========================================
              HERO
          ========================================= */}

          <section className="relative mb-7 overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-[#151a42] via-[#101532] to-[#09172d] p-6 shadow-2xl shadow-violet-950/20 md:p-8">

            <div className="absolute -right-10 -top-20 text-[190px] opacity-[0.025]">
              🚀
            </div>

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              <div className="max-w-3xl">

                <div className="mb-4 flex items-center gap-2">

                  <span
                    className="rounded-full px-3 py-1 text-[15px] font-black uppercase tracking-[0.18em]"
                    style={{
                      background:
                        "rgba(34,211,238,.08)",
                      color: "#67e8f9",
                      border:
                        "1px solid rgba(34,211,238,.12)",
                    }}
                  >
                    ● Command Center Online
                  </span>

                </div>

                <h1
                  style={{
                    fontFamily: P,
                    fontWeight: 900,
                    fontSize: "clamp(28px,4vw,42px)",
                    lineHeight: 1.1,
                    letterSpacing: "-.04em",
                  }}
                >
                  Choose your next{" "}
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
                    mission
                  </span>
                  . 🚀
                </h1>

                <p
                  className="mt-4 max-w-2xl"
                  style={{
                    fontFamily: P,
                    fontSize: 18,
                    lineHeight: 1.8,
                    color: "#64748b",
                  }}
                >
                  Explore interactive learning missions,
                  discover new skills and help every learner
                  move one step further.
                </p>

              </div>

              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center self-center">

                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute h-32 w-32 rounded-full border border-dashed border-violet-400/20"
                />

                <div className="absolute h-24 w-24 rounded-full border border-cyan-400/10" />

                <motion.div
                  animate={{
                    y: [-5, 5, -5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                  className="text-6xl"
                >
                  🛰️
                </motion.div>

              </div>

            </div>

          </section>

          {/* =========================================
              SEARCH
          ========================================= */}

          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                maxWidth: 520,
                width: "100%",
                background:
                  "rgba(255,255,255,.035)",
                border:
                  "1px solid rgba(255,255,255,.08)",
              }}
            >

              <span className="text-xl text-slate-600">
                🔭
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search missions, skills or activities..."
                className="flex-1 bg-transparent text-[19px] text-white outline-none placeholder:text-slate-600"
                style={{
                  fontFamily: P,
                }}
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[19px] text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}

            </div>

            <div
              className="rounded-xl px-4 py-2"
              style={{
                background:
                  "rgba(250,204,21,.06)",
                border:
                  "1px solid rgba(250,204,21,.1)",
              }}
            >
              <span
                style={{
                  fontFamily: P,
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#64748b",
                  letterSpacing: ".1em",
                }}
              >
                AVAILABLE MISSIONS{" "}
              </span>

              <span
                style={{
                  fontFamily: P,
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#facc15",
                }}
              >
                {filtered.length}
              </span>

            </div>

          </section>

          {/* =========================================
              DIFFICULTY FILTER
          ========================================= */}

          <section className="mb-5">

            <div className="mb-3 flex items-center gap-2">

              <span>🎯</span>

              <span
                style={{
                  fontFamily: P,
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#64748b",
                  letterSpacing: ".18em",
                }}
              >
                MISSION DIFFICULTY
              </span>

            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">

              {diffFilter.map((item) => {

                const active = diff === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDiff(item)}
                    className="shrink-0 rounded-xl px-4 py-2.5 transition hover:-translate-y-0.5"
                    style={{
                      fontFamily: P,
                      fontSize: 16,
                      fontWeight: 800,
                      background: active
                        ? "linear-gradient(135deg,#7c3aed,#0891b2)"
                        : "rgba(255,255,255,.035)",
                      color: active
                        ? "#fff"
                        : "#64748b",
                      border: active
                        ? "1px solid rgba(167,139,250,.3)"
                        : "1px solid rgba(255,255,255,.07)",
                    }}
                  >
                    {item}
                  </button>
                );
              })}

            </div>

          </section>

          {/* =========================================
              CATEGORY FILTER
          ========================================= */}

          <section className="mb-7">

            <div className="mb-3 flex items-center gap-2">

              <span>🌌</span>

              <span
                style={{
                  fontFamily: P,
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#64748b",
                  letterSpacing: ".18em",
                }}
              >
                MISSION SECTORS
              </span>

            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">

              {categories.map((item) => {

                const active = cat === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCat(item)}
                    className="group shrink-0 rounded-2xl px-4 py-3 transition duration-200 hover:-translate-y-1"
                    style={{
                      minWidth: 110,
                      background: active
                        ? "linear-gradient(135deg,rgba(124,58,237,.28),rgba(6,182,212,.1))"
                        : "rgba(255,255,255,.035)",
                      border: active
                        ? "1px solid rgba(167,139,250,.3)"
                        : "1px solid rgba(255,255,255,.07)",
                      boxShadow: active
                        ? "0 8px 25px rgba(124,58,237,.12)"
                        : "none",
                    }}
                  >

                    <div className="text-2xl transition duration-300 group-hover:scale-125">
                      {categoryIcons[item]}
                    </div>

                    <div
                      className="mt-2 text-left"
                      style={{
                        fontFamily: P,
                        fontSize: 15,
                        fontWeight: 800,
                        color: active
                          ? "#fff"
                          : "#94a3b8",
                      }}
                    >
                      {item}
                    </div>

                  </button>
                );
              })}

            </div>

          </section>

          {/* =========================================
              AI RECOMMENDATION
          ========================================= */}

          {recommended && (

            <motion.section
              initial={{
                opacity: 0,
                y: 15,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="mb-7 overflow-hidden rounded-[1.7rem] border p-5 md:p-6"
              style={{
                background:
                  "linear-gradient(135deg,rgba(124,58,237,.13),rgba(6,182,212,.05))",
                borderColor:
                  "rgba(124,58,237,.18)",
              }}
            >

              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                <div className="flex items-start gap-4">

                  <motion.div
                    animate={{
                      rotate: [0, -8, 8, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                    }}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl"
                    style={{
                      background:
                        "rgba(124,58,237,.12)",
                    }}
                  >
                    🤖
                  </motion.div>

                  <div>

                    <div className="flex items-center gap-2">

                      <span
                        style={{
                          fontFamily: P,
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        AI Mission Navigator
                      </span>

                      <span
                        className="rounded-full px-2 py-1 text-[15px] font-black"
                        style={{
                          background:
                            "rgba(34,211,238,.1)",
                          color: "#67e8f9",
                        }}
                      >
                        RECOMMENDED
                      </span>

                    </div>

                    <p
                      className="mt-2 text-[16px] leading-5 text-slate-500"
                      style={{
                        fontFamily: P,
                      }}
                    >
                      A good starting mission based on the
                      current selection.
                    </p>

                    <div className="mt-2 flex items-center gap-2">

                      <span className="text-xl">
                        {recommended.emoji}
                      </span>

                      <span
                        className="text-[19px] font-black text-violet-300"
                        style={{
                          fontFamily: P,
                        }}
                      >
                        {recommended.title}
                      </span>

                    </div>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    openMission(recommended)
                  }
                  className="shrink-0 rounded-xl px-5 py-3 text-[19px] font-black text-slate-950 transition hover:-translate-y-1"
                  style={{
                    background:
                      "linear-gradient(135deg,#67e8f9,#a78bfa)",
                    fontFamily: P,
                    boxShadow:
                      "0 8px 25px rgba(103,232,249,.12)",
                  }}
                >
                  🚀 VIEW MISSION
                </button>

              </div>

            </motion.section>

          )}

          {/* =========================================
              RESULTS
          ========================================= */}

          <section>

            <div className="mb-5 flex items-end justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span>🪐</span>

                  <span
                    style={{
                      fontFamily: P,
                      fontSize: 15,
                      fontWeight: 900,
                      color: "#64748b",
                      letterSpacing: ".18em",
                    }}
                  >
                    AVAILABLE MISSIONS
                  </span>

                </div>

                <h2
                  className="mt-2 text-3xl font-black md:text-4xl"
                  style={{
                    fontFamily: P,
                  }}
                >
                  Explore the universe
                </h2>

              </div>

              <div className="text-right">

                <div
                  className="text-xl font-black text-white"
                  style={{
                    fontFamily: P,
                  }}
                >
                  {filtered.length}
                </div>

                <div
                  className="text-[16px] font-bold uppercase tracking-widest text-slate-600"
                  style={{
                    fontFamily: P,
                  }}
                >
                  missions
                </div>

              </div>

            </div>

            {filtered.length > 0 ? (

              <div
                className="grid gap-5"
                style={{
                  gridTemplateColumns:
                    "repeat(auto-fill,minmax(280px,1fr))",
                }}
              >

                {filtered.map((activity, index) => (

                  <motion.div
                    key={activity.id}
                    initial={{
                      opacity: 0,
                      y: 25,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.4,
                    }}
                    whileHover={{
                      y: -8,
                    }}
                    className="group relative cursor-pointer"
                    onClick={() =>
                      openMission(activity)
                    }
                  >

                    {/* Glow */}

                    <div
                      className="pointer-events-none absolute -inset-1 rounded-[1.8rem] opacity-0 blur-xl transition duration-500 group-hover:opacity-30"
                      style={{
                        background:
                          activity.color,
                      }}
                    />

                    <div
                      className="relative overflow-hidden rounded-[1.7rem] border"
                      style={{
                        background:
                          "rgba(255,255,255,.035)",
                        borderColor:
                          "rgba(255,255,255,.08)",
                        boxShadow:
                          "0 10px 35px rgba(0,0,0,.15)",
                      }}
                    >

                      {/* Illustration */}

                      <div
                        className="relative flex h-40 items-center justify-center overflow-hidden"
                        style={{
                          background:
                            activity.bg,
                        }}
                      >

                        <div className="absolute right-4 top-3 text-[19px] opacity-40">
                          ✦
                        </div>

                        <div className="absolute bottom-3 left-5 text-[16px] opacity-30">
                          ✧
                        </div>

                        <motion.div
                          whileHover={{
                            scale: 1.1,
                            rotate: 3,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 250,
                          }}
                          className="relative z-10 h-28 w-44"
                        >
                          {activity.illustration}
                        </motion.div>

                        {/* Category */}

                        <div
                          className="absolute left-4 top-4 rounded-full px-3 py-1.5 text-[16px] font-black uppercase"
                          style={{
                            background:
                              "rgba(7,11,36,.65)",
                            color:
                              activity.color,
                            border:
                              `1px solid ${activity.color}44`,
                            backdropFilter:
                              "blur(8px)",
                          }}
                        >
                          {categoryIcons[
                            activity.category
                          ]}{" "}
                          {activity.category}
                        </div>

                        {/* XP */}

                        <div
                          className="absolute right-4 top-4 rounded-full px-2.5 py-1.5 text-[16px] font-black"
                          style={{
                            background:
                              "rgba(7,11,36,.65)",
                            color: "#facc15",
                            border:
                              "1px solid rgba(250,204,21,.18)",
                            backdropFilter:
                              "blur(8px)",
                          }}
                        >
                          ⭐ +{activity.xp} XP
                        </div>

                      </div>

                      {/* Content */}

                      <div className="p-5">

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <h3
                              style={{
                                fontFamily: P,
                                fontWeight: 800,
                                fontSize: 18,
                                color: "#fff",
                              }}
                            >
                              {activity.title}
                            </h3>

                            <p
                              className="mt-2 line-clamp-2"
                              style={{
                                fontFamily: P,
                                fontSize: 16,
                                lineHeight: 1.7,
                                color: "#64748b",
                              }}
                            >
                              {activity.desc}
                            </p>

                          </div>

                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                            style={{
                              background:
                                activity.iconBg,
                              boxShadow:
                                `0 0 18px ${activity.color}22`,
                            }}
                          >
                            <span className="material-icons-round text-[22px]">
                              {activity.icon}
                            </span>
                          </div>

                        </div>

                        {/* Meta */}

                        <div className="mt-4 flex items-center gap-2">

                          <span
                            className="rounded-full px-2.5 py-1 text-[16px] font-black"
                            style={{
                              background:
                                `${activity.color}12`,
                              color:
                                activity.color,
                            }}
                          >
                            🎯 {activity.difficulty}
                          </span>

                          <span
                            className="text-[15px] text-slate-600"
                            style={{
                              fontFamily: P,
                            }}
                          >
                            ⏱ {activity.time}
                          </span>

                        </div>

                        {/* Launch */}

                        <div className="mt-5">

                          <div
                            className="flex items-center justify-center gap-2 rounded-xl py-3 text-[19px] font-black transition group-hover:scale-[1.02]"
                            style={{
                              background:
                                `linear-gradient(135deg,${activity.iconBg},${activity.color})`,
                              color: "#fff",
                              fontFamily: P,
                              boxShadow:
                                `0 8px 20px ${activity.color}22`,
                            }}
                          >
                            <span>🚀</span>
                            View Mission
                            <span className="transition group-hover:translate-x-1">
                              →
                            </span>
                          </div>

                        </div>

                      </div>

                    </div>

                  </motion.div>

                ))}

              </div>

            ) : (

              <div
                className="rounded-[2rem] border border-dashed py-24 text-center"
                style={{
                  borderColor:
                    "rgba(255,255,255,.1)",
                }}
              >

                <div className="text-5xl">
                  🌑
                </div>

                <h3
                  className="mt-4 text-xl font-black"
                  style={{
                    fontFamily: P,
                  }}
                >
                  No missions discovered
                </h3>

                <p className="mt-2 text-[19px] text-slate-600">
                  Try changing your filters or search.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCat("All");
                    setDiff("All Levels");
                  }}
                  className="mt-5 rounded-xl bg-violet-500 px-5 py-2.5 text-[19px] font-black text-white transition hover:bg-violet-400"
                >
                  🌌 Reset Universe
                </button>

              </div>

            )}

          </section>

        </main>

      </div>

      {/* =================================================
          MISSION MODAL
      ================================================= */}

      <AnimatePresence>

        {showMission && selectedActivity && (

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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5 backdrop-blur-md"
            onClick={closeMission}
          >

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              transition={{
                type: "spring",
                stiffness: 250,
                damping: 22,
              }}
              onClick={(e) =>
                e.stopPropagation()
              }
              className="w-full max-w-xl overflow-hidden rounded-[2rem] border shadow-2xl"
              style={{
                background: "#101532",
                borderColor:
                  `${selectedActivity.color}33`,
              }}
            >

              {/* Modal visual */}

              <div
                className="relative flex h-44 items-center justify-center"
                style={{
                  background:
                    selectedActivity.bg,
                }}
              >

                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute h-32 w-32 rounded-full border border-dashed"
                  style={{
                    borderColor:
                      `${selectedActivity.color}55`,
                  }}
                />

                <motion.div
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                  }}
                  className="relative z-10 text-7xl"
                >
                  {selectedActivity.emoji}
                </motion.div>

                <button
                  type="button"
                  onClick={closeMission}
                  className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-[19px] text-slate-300 transition hover:bg-black/50 hover:text-white"
                >
                  ✕
                </button>

              </div>

              {/* Modal content */}

              <div className="p-6 md:p-8">

                <div className="flex flex-wrap items-center gap-2">

                  <span
                    className="rounded-full px-3 py-1.5 text-[16px] font-black uppercase"
                    style={{
                      background:
                        `${selectedActivity.color}12`,
                      color:
                        selectedActivity.color,
                    }}
                  >
                    {categoryIcons[
                      selectedActivity.category
                    ]}{" "}
                    {selectedActivity.category}
                  </span>

                  <span
                    className="rounded-full px-3 py-1.5 text-[16px] font-black"
                    style={{
                      background:
                        "rgba(250,204,21,.08)",
                      color: "#facc15",
                    }}
                  >
                    ⭐ +{selectedActivity.xp} XP
                  </span>

                </div>

                <h2
                  className="mt-4 text-4xl font-black"
                  style={{
                    fontFamily: P,
                  }}
                >
                  {selectedActivity.title}
                </h2>

                <p
                  className="mt-3 text-[19px] leading-6 text-slate-500"
                  style={{
                    fontFamily: P,
                  }}
                >
                  {selectedActivity.desc}
                </p>

                {/* Mission stats */}

                <div className="mt-6 grid grid-cols-3 gap-3">

                  <div
                    className="rounded-2xl p-4 text-center"
                    style={{
                      background:
                        "rgba(255,255,255,.035)",
                      border:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >

                    <div className="text-2xl">
                      🎯
                    </div>

                    <div className="mt-2 text-[16px] font-black uppercase tracking-wider text-slate-600">
                      Difficulty
                    </div>

                    <div
                      className="mt-1 text-[19px] font-black"
                      style={{
                        color:
                          selectedActivity.color,
                      }}
                    >
                      {selectedActivity.difficulty}
                    </div>

                  </div>

                  <div
                    className="rounded-2xl p-4 text-center"
                    style={{
                      background:
                        "rgba(255,255,255,.035)",
                      border:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >

                    <div className="text-2xl">
                      ⏱
                    </div>

                    <div className="mt-2 text-[16px] font-black uppercase tracking-wider text-slate-600">
                      Duration
                    </div>

                    <div className="mt-1 text-[19px] font-black">
                      {selectedActivity.time}
                    </div>

                  </div>

                  <div
                    className="rounded-2xl p-4 text-center"
                    style={{
                      background:
                        "rgba(255,255,255,.035)",
                      border:
                        "1px solid rgba(255,255,255,.06)",
                    }}
                  >

                    <div className="text-2xl">
                      ⭐
                    </div>

                    <div className="mt-2 text-[16px] font-black uppercase tracking-wider text-slate-600">
                      Reward
                    </div>

                    <div className="mt-1 text-[19px] font-black text-yellow-300">
                      +{selectedActivity.xp} XP
                    </div>

                  </div>

                </div>

                {/* Mission readiness */}

                <div className="mt-6">

                  <div className="flex items-center justify-between">

                    <span className="text-[15px] font-black uppercase tracking-wider text-slate-600">
                      Mission readiness
                    </span>

                    <span
                      className="text-[16px] font-black"
                      style={{
                        color:
                          selectedActivity.color,
                      }}
                    >
                      READY
                    </span>

                  </div>

                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full"
                    style={{
                      background:
                        "rgba(255,255,255,.06)",
                    }}
                  >

                    <motion.div
                      initial={{
                        width: 0,
                      }}
                      animate={{
                        width: "90%",
                      }}
                      transition={{
                        duration: 0.8,
                      }}
                      className="h-full rounded-full"
                      style={{
                        background:
                          `linear-gradient(90deg,${selectedActivity.iconBg},${selectedActivity.color})`,
                      }}
                    />

                  </div>

                </div>

                {/* Buttons */}

                <div className="mt-7 flex gap-3">

                  <button
                    type="button"
                    onClick={closeMission}
                    className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-[19px] font-bold text-slate-400 transition hover:bg-white/10 hover:text-white"
                  >
                    Back
                  </button>

                  <Link
                    to={getPlayRoute(
                      selectedActivity.id
                    )}
                    onClick={() =>
                      setShowMission(false)
                    }
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[19px] font-black text-white transition hover:-translate-y-1"
                    style={{
                      textDecoration: "none",
                      background:
                        `linear-gradient(135deg,${selectedActivity.iconBg},${selectedActivity.color})`,
                      boxShadow:
                        `0 10px 25px ${selectedActivity.color}22`,
                    }}
                  >
                    🚀 LAUNCH MISSION
                  </Link>

                </div>

              </div>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
} 
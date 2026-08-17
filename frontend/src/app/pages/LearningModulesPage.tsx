import { useEffect, useMemo, useState } from "react";
import { Sidebar, TopBar } from "./DashboardPage";
import LearningModuleCard from "../components/LearningModuleCard";
import { getLearningModules } from "../api/learningModuleApi";
import type { LearningModule } from "../types/learningModule";

const categories = [
  "All",
  "ADL",
  "Academic",
  "Motor",
  "Language",
  "Vocational",
  "Therapeutic",
  "Specialized Care",
];

const P = "Poppins, sans-serif";

const categoryMeta: Record<
  string,
  {
    icon: string;
    description: string;
  }
> = {
  All: {
    icon: "🌌",
    description: "Explore the complete learning universe",
  },
  ADL: {
    icon: "🏠",
    description: "Everyday life skills and independence",
  },
  Academic: {
    icon: "🧠",
    description: "Build knowledge and academic confidence",
  },
  Motor: {
    icon: "🏃",
    description: "Develop movement and coordination",
  },
  Language: {
    icon: "💬",
    description: "Grow communication and language skills",
  },
  Vocational: {
    icon: "🛠️",
    description: "Discover practical vocational abilities",
  },
  Therapeutic: {
    icon: "💚",
    description: "Supportive therapeutic activities",
  },
  "Specialized Care": {
    icon: "🛡️",
    description: "Personalized specialized learning",
  },
};

export default function LearningModulesPage() {
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedModule, setSelectedModule] =
    useState<LearningModule | null>(null);

  const [showMission, setShowMission] = useState(false);

  /* =====================================================
     BACKEND — KEEP EXISTING FUNCTIONALITY
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError("");

    getLearningModules({ category })
      .then((response) => {
        if (mounted) {
          setModules(response.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load learning modules", err);

        if (mounted) {
          setError(
            "Unable to load learning modules. Check that the backend is running."
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [category]);

  /* =====================================================
     SEARCH — KEEP EXISTING FUNCTIONALITY
  ===================================================== */

  const filteredModules = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return modules;

    return modules.filter((module) =>
      [
        module.title,
        module.description,
        module.skill,
        module.category,
      ].some((value) =>
        value.toLowerCase().includes(text)
      )
    );
  }, [modules, search]);

  const currentCategory =
    categoryMeta[category] || categoryMeta.All;

  /* =====================================================
     PAGE
  ===================================================== */

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
          title="Learning Universe"
          subtitle="Explore personalized learning missions"
        />

        <main
          className="relative flex-1 overflow-hidden p-5 md:p-8"
          style={{
            background:
              "radial-gradient(circle at 80% 0%, rgba(124,58,237,.13), transparent 30%), #070b24",
          }}
        >

          {/* =================================================
              SPACE DECORATIONS
          ================================================= */}

          <div className="pointer-events-none absolute left-[8%] top-[12%] text-base text-violet-300 opacity-60">
            ✦
          </div>

          <div className="pointer-events-none absolute right-[15%] top-[18%] text-xl text-cyan-300 opacity-50">
            ✧
          </div>

          <div className="pointer-events-none absolute bottom-[20%] left-[20%] text-base text-yellow-300 opacity-40">
            ✦
          </div>

          <div className="pointer-events-none absolute bottom-[10%] right-[10%] text-base text-violet-300 opacity-50">
            ✧
          </div>

          {/* =================================================
              HERO
          ================================================= */}

          <section className="relative mb-7 overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-[#151a42] via-[#101532] to-[#09172d] p-6 shadow-2xl shadow-violet-950/20 md:p-8">

            <div className="absolute right-[-30px] top-[-70px] text-[190px] opacity-[0.035]">
              🪐
            </div>

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">

              <div className="max-w-3xl">

                <div className="mb-4 flex items-center gap-2">

                  <span
                    className="rounded-full px-3 py-1 text-[15px] font-black uppercase tracking-[0.18em]"
                    style={{
                      background:
                        "rgba(167,139,250,.1)",
                      color: "#c4b5fd",
                      border:
                        "1px solid rgba(167,139,250,.15)",
                    }}
                  >
                    🪐 Learning Universe
                  </span>

                  <span className="text-[15px] font-bold text-slate-600">
                    ● LIVE
                  </span>

                </div>

                <h1
                  style={{
                    fontFamily: P,
                    fontSize: "clamp(28px,4vw,42px)",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                  }}
                >
                  Choose your next{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(90deg,#a78bfa,#22d3ee)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    adventure
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
                  Explore learning modules designed around
                  individual abilities, interests and learning
                  goals. Every module is another planet waiting
                  to be discovered.
                </p>

              </div>

              {/* Astronaut */}

              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center self-center">

                <div className="absolute h-32 w-32 rounded-full border border-violet-400/20" />

                <div className="absolute h-24 w-24 rounded-full border border-dashed border-cyan-400/20" />

                <div className="animate-bounce text-6xl [animation-duration:4s]">
                  🧑‍🚀
                </div>

                <span className="absolute right-0 top-2 text-2xl">
                  ⭐
                </span>

                <span className="absolute bottom-0 left-0 text-xl">
                  🪐
                </span>

              </div>

            </div>

          </section>

          {/* =================================================
              SEARCH + MODULE COUNT
          ================================================= */}

          <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

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

              <span className="text-xl text-slate-500">
                🔭
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search planets, skills or missions..."
                className="flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-600"
                style={{
                  fontFamily: P,
                }}
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-base text-slate-500 transition hover:text-white"
                >
                  ✕
                </button>
              )}

            </div>

            <div
              className="rounded-xl px-4 py-2"
              style={{
                background:
                  "rgba(34,211,238,.06)",
                border:
                  "1px solid rgba(34,211,238,.1)",
              }}
            >
              <span
                style={{
                  fontFamily: P,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#64748b",
                }}
              >
                DISCOVERIES{" "}
              </span>

              <span
                style={{
                  fontFamily: P,
                  fontSize: 19,
                  fontWeight: 900,
                  color: "#67e8f9",
                }}
              >
                {filteredModules.length}
              </span>
            </div>

          </section>

          {/* =================================================
              CATEGORY PLANETS
          ================================================= */}

          <section className="mb-8">

            <div className="mb-4 flex items-center gap-2">

              <span>
                🌌
              </span>

              <span
                style={{
                  fontFamily: P,
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#64748b",
                  letterSpacing: ".18em",
                }}
              >
                EXPLORE SECTORS
              </span>

            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">

              {categories.map((item) => {

                const meta =
                  categoryMeta[item];

                const active =
                  category === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setCategory(item)
                    }
                    className="group shrink-0 rounded-2xl px-4 py-3 transition duration-200 hover:-translate-y-1"
                    style={{
                      minWidth: 125,
                      background: active
                        ? "linear-gradient(135deg,rgba(124,58,237,.28),rgba(6,182,212,.1))"
                        : "rgba(255,255,255,.035)",
                      border: active
                        ? "1px solid rgba(167,139,250,.3)"
                        : "1px solid rgba(255,255,255,.07)",
                      boxShadow: active
                        ? "0 8px 30px rgba(124,58,237,.12)"
                        : "none",
                    }}
                  >

                    <div
                      className="text-3xl transition duration-300 group-hover:scale-125"
                    >
                      {meta.icon}
                    </div>

                    <div
                      className="mt-2 text-left"
                      style={{
                        fontFamily: P,
                        fontSize: 16,
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

            <p
              className="mt-3 text-base text-slate-600"
              style={{
                fontFamily: P,
              }}
            >
              {currentCategory.description}
            </p>

          </section>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div
              className="mb-6 rounded-2xl px-5 py-4"
              style={{
                background:
                  "rgba(244,63,94,.08)",
                border:
                  "1px solid rgba(244,63,94,.15)",
                color: "#fb7185",
                fontFamily: P,
                fontSize: 17,
              }}
            >
              ⚠️ {error}
            </div>

          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (

            <div className="flex flex-col items-center justify-center py-24">

              <div className="relative flex h-24 w-24 items-center justify-center">

                <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-400/10 border-t-violet-400" />

                <span className="text-5xl">
                  🚀
                </span>

              </div>

              <p
                className="mt-5 text-base font-bold text-slate-500"
                style={{
                  fontFamily: P,
                }}
              >
                Scanning the learning universe...
              </p>

              <p
                className="mt-1 text-base text-slate-700"
                style={{
                  fontFamily: P,
                }}
              >
                Finding your learning missions
              </p>

            </div>

          ) : (

            <>

              {/* =================================================
                  AI RECOMMENDATION
              ================================================= */}

              {filteredModules.length > 0 && (

                <section
                  className="mb-7 overflow-hidden rounded-[1.7rem] border p-5 md:p-6"
                  style={{
                    background:
                      "linear-gradient(135deg,rgba(124,58,237,.11),rgba(6,182,212,.05))",
                    borderColor:
                      "rgba(124,58,237,.16)",
                  }}
                >

                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-start gap-4">

                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl"
                        style={{
                          background:
                            "rgba(124,58,237,.12)",
                        }}
                      >
                        🤖
                      </div>

                      <div>

                        <div className="flex items-center gap-2">

                          <span
                            style={{
                              fontFamily: P,
                              fontSize: 18,
                              fontWeight: 900,
                              color: "#fff",
                            }}
                          >
                            Learning Navigator
                          </span>

                          <span
                            className="rounded-full px-2 py-1 text-[16px] font-black"
                            style={{
                              background:
                                "rgba(34,211,238,.1)",
                              color: "#67e8f9",
                            }}
                          >
                            AI
                          </span>

                        </div>

                        <p
                          className="mt-2 text-base leading-5 text-slate-500"
                          style={{
                            fontFamily: P,
                          }}
                        >
                          Based on your learning journey,
                          here's a mission waiting for you.
                        </p>

                        <p
                          className="mt-2 text-base font-bold text-violet-300"
                          style={{
                            fontFamily: P,
                          }}
                        >
                          ✨ {filteredModules[0].title}
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModule(
                          filteredModules[0]
                        );
                        setShowMission(true);
                      }}
                      className="shrink-0 rounded-xl px-5 py-3 text-base font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300"
                      style={{
                        background: "#67e8f9",
                        fontFamily: P,
                      }}
                    >
                      🚀 EXPLORE MISSION
                    </button>

                  </div>

                </section>

              )}

              {/* =================================================
                  MODULES
              ================================================= */}

              <section>

                <div className="mb-5 flex items-end justify-between">

                  <div>

                    <div className="flex items-center gap-2">

                      <span>
                        🪐
                      </span>

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
                      {category === "All"
                        ? "Your learning planets"
                        : `${category} missions`}
                    </h2>

                  </div>

                  <div
                    className="hidden text-right sm:block"
                    style={{
                      fontFamily: P,
                    }}
                  >

                    <div className="text-xl font-black text-white">
                      {filteredModules.length}
                    </div>

                    <div className="text-[15px] uppercase tracking-wider text-slate-600">
                      missions
                    </div>

                  </div>

                </div>

                {filteredModules.length > 0 ? (

                  <div
                    className="grid gap-5"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fill,minmax(280px,1fr))",
                    }}
                  >

                    {filteredModules.map(
                      (module, index) => (

                        <div
                          key={module.moduleId}
                          className="group relative cursor-pointer"
                          onClick={() => {
                            setSelectedModule(
                              module
                            );
                            setShowMission(true);
                          }}
                        >

                          {/* Planet glow */}

                          <div
                            className="pointer-events-none absolute -inset-1 rounded-[1.7rem] opacity-0 blur-xl transition duration-500 group-hover:opacity-30"
                            style={{
                              background:
                                index % 3 === 0
                                  ? "#8b5cf6"
                                  : index % 3 === 1
                                  ? "#06b6d4"
                                  : "#ec4899",
                            }}
                          />

                          <div className="relative transition duration-300 group-hover:-translate-y-2">

                            <LearningModuleCard
                              module={module}
                            />

                          </div>

                          {/* Mission overlay */}

                          <div
                            className="pointer-events-none absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full opacity-0 transition duration-300 group-hover:opacity-100"
                            style={{
                              background:
                                "rgba(124,58,237,.9)",
                              boxShadow:
                                "0 0 20px rgba(124,58,237,.4)",
                            }}
                          >
                            🚀
                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <div
                    className="rounded-[2rem] border border-dashed py-20 text-center"
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
                      No planets discovered
                    </h3>

                    <p
                      className="mt-2 text-base text-slate-600"
                      style={{
                        fontFamily: P,
                      }}
                    >
                      Try another sector or search term.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setCategory("All");
                      }}
                      className="mt-5 rounded-xl bg-violet-500 px-5 py-2.5 text-base font-black text-white transition hover:bg-violet-400"
                    >
                      🌌 Explore All
                    </button>

                  </div>

                )}

              </section>

            </>
          )}

        </main>
      </div>

      {/* =====================================================
          MISSION PREVIEW MODAL
      ===================================================== */}

      {showMission && selectedModule && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-5 backdrop-blur-md"
          onClick={() => setShowMission(false)}
        >

          <div
            className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-violet-400/20 bg-[#101532] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal header */}

            <div
              className="relative flex h-36 items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle,rgba(124,58,237,.25),transparent 65%)",
              }}
            >

              <div className="absolute inset-0 flex items-center justify-center">

                <div className="h-28 w-28 rounded-full border border-violet-400/20" />

                <div className="absolute h-20 w-20 rounded-full border border-dashed border-cyan-400/20" />

              </div>

              <div className="relative text-6xl">
                🚀
              </div>

              <button
                type="button"
                onClick={() => setShowMission(false)}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>

            </div>

            <div className="p-6 md:p-8">

              <div className="mb-3 flex items-center gap-2">

                <span
                  className="rounded-full px-2.5 py-1 text-[16px] font-black uppercase"
                  style={{
                    background:
                      "rgba(124,58,237,.12)",
                    color: "#c4b5fd",
                  }}
                >
                  {selectedModule.category}
                </span>

                <span
                  className="rounded-full px-2.5 py-1 text-[16px] font-black uppercase"
                  style={{
                    background:
                      "rgba(34,211,238,.08)",
                    color: "#67e8f9",
                  }}
                >
                  +25 XP
                </span>

              </div>

              <h2
                className="text-4xl font-black"
                style={{
                  fontFamily: P,
                }}
              >
                {selectedModule.title}
              </h2>

              <p
                className="mt-3 text-base leading-6 text-slate-500"
                style={{
                  fontFamily: P,
                }}
              >
                {selectedModule.description}
              </p>

              {/* Skill */}

              <div
                className="mt-5 rounded-2xl p-4"
                style={{
                  background:
                    "rgba(255,255,255,.035)",
                  border:
                    "1px solid rgba(255,255,255,.06)",
                }}
              >

                <div className="flex items-center justify-between">

                  <span className="text-base font-bold text-slate-500">
                    🧠 Skill
                  </span>

                  <span className="text-base font-black text-white">
                    {selectedModule.skill}
                  </span>

                </div>

              </div>

              {/* Mission information */}

              <div className="mt-4 grid grid-cols-3 gap-3">

                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background:
                      "rgba(124,58,237,.07)",
                  }}
                >

                  <div className="text-xl">
                    🎯
                  </div>

                  <div className="mt-1 text-[15px] font-bold text-slate-600">
                    MISSION
                  </div>

                  <div className="mt-1 text-base font-black">
                    Ready
                  </div>

                </div>

                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background:
                      "rgba(250,204,21,.06)",
                  }}
                >

                  <div className="text-xl">
                    ⭐
                  </div>

                  <div className="mt-1 text-[15px] font-bold text-slate-600">
                    REWARD
                  </div>

                  <div className="mt-1 text-base font-black text-yellow-300">
                    +25 XP
                  </div>

                </div>

                <div
                  className="rounded-xl p-3 text-center"
                  style={{
                    background:
                      "rgba(34,211,238,.06)",
                  }}
                >

                  <div className="text-xl">
                    🚀
                  </div>

                  <div className="mt-1 text-[15px] font-bold text-slate-600">
                    STATUS
                  </div>

                  <div className="mt-1 text-base font-black text-cyan-300">
                    Open
                  </div>

                </div>

              </div>

              {/* Actions */}

              <div className="mt-6 flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setShowMission(false)
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-base font-bold text-slate-400 transition hover:bg-white/10"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMission(false);

                    /*
                     * IMPORTANT:
                     * We intentionally do not change your
                     * existing navigation/API here.
                     *
                     * Later we can connect this button to
                     * the actual activity route.
                     */
                    console.log(
                      "Launch mission:",
                      selectedModule
                    );
                  }}
                  className="flex-1 rounded-xl bg-violet-500 py-3 text-base font-black text-white shadow-lg shadow-violet-950/40 transition hover:-translate-y-1 hover:bg-violet-400"
                >
                  🚀 Launch Mission
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
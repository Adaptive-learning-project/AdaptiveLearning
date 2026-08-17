import React, { useState } from "react";

const StudentDashboardPage = () => {
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [showMission, setShowMission] = useState(false);

  const planets = [
    {
      name: "Math Galaxy",
      subtitle: "Numbers & counting",
      emoji: "🔢",
      progress: 75,
      color: "from-violet-500 to-fuchsia-500",
      orbit: "🌌",
    },
    {
      name: "Animal World",
      subtitle: "Discover animals",
      emoji: "🦁",
      progress: 45,
      color: "from-cyan-400 to-blue-500",
      orbit: "🪐",
    },
    {
      name: "Word Planet",
      subtitle: "Letters & words",
      emoji: "🔤",
      progress: 90,
      color: "from-orange-400 to-pink-500",
      orbit: "✨",
    },
    {
      name: "Shape Station",
      subtitle: "Shapes & patterns",
      emoji: "🔷",
      progress: 30,
      color: "from-emerald-400 to-teal-500",
      orbit: "⭐",
    },
  ];

  const handlePlanet = (name: string) => {
    setSelectedPlanet(name);

    setTimeout(() => {
      setSelectedPlanet(null);
    }, 1800);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b24] text-white">

      {/* ================================================= */}
      {/* SPACE BACKGROUND */}
      {/* ================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        {/* Nebulae */}
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[120px]" />

        <div className="absolute -right-40 top-[35%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute bottom-[-200px] left-[35%] h-[500px] w-[500px] rounded-full bg-fuchsia-600/10 blur-[120px]" />

        {/* Stars */}
        <div className="absolute left-[8%] top-[15%] text-base opacity-80">
          ✦
        </div>

        <div className="absolute left-[20%] top-[65%] text-sm opacity-60">
          ✧
        </div>

        <div className="absolute left-[45%] top-[12%] text-sm opacity-70">
          ✦
        </div>

        <div className="absolute right-[15%] top-[20%] text-xl opacity-70">
          ✧
        </div>

        <div className="absolute right-[30%] top-[72%] text-sm opacity-60">
          ✦
        </div>

        <div className="absolute bottom-[15%] left-[12%] text-xl opacity-50">
          ✧
        </div>

        <div className="absolute bottom-[25%] right-[8%] text-base opacity-70">
          ✦
        </div>

      </div>

      {/* ================================================= */}
      {/* CONTENT */}
      {/* ================================================= */}

      <main className="relative mx-auto max-w-7xl px-5 py-6 md:px-8">

        {/* ================================================= */}
        {/* NAVIGATION */}
        {/* ================================================= */}

        <header className="mb-10 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/20 text-3xl shadow-lg shadow-violet-900/30">
              🚀
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight">
                LEARN<span className="text-violet-400">ABLE</span>
              </h1>

              <p className="text-[14px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Learning Universe
              </p>
            </div>

          </div>

          <div className="flex items-center gap-3">

            {/* XP */}
            <div className="hidden items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 sm:flex">
              <span>⭐</span>
              <span className="text-base font-bold text-yellow-300">
                120 XP
              </span>
            </div>

            {/* Notification */}
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:border-violet-400/40 hover:bg-violet-500/20"
            >
              🔔
            </button>

            {/* Avatar */}
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-violet-400 bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black shadow-lg shadow-violet-900/50 transition hover:scale-110"
            >
              A
            </button>

          </div>

        </header>

        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <section className="mb-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">

          {/* Greeting */}

          <div className="flex flex-col justify-center">

            <div className="mb-4 flex items-center gap-2">

              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[14px] font-bold uppercase tracking-widest text-cyan-300">
                Mission Control
              </span>

              <span className="text-sm text-slate-500">
                ● Online
              </span>

            </div>

            <h2 className="text-5xl font-black leading-tight md:text-6xl">

              Hey Joanisha,

              <br />

              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
                ready to explore?
              </span>

              🚀

            </h2>

            <p className="mt-5 max-w-xl text-lg leading-7 text-slate-400">
              Your learning universe is waiting. Complete missions,
              discover new planets and collect stars along the way.
            </p>

          </div>

          {/* Astronaut */}

          <div className="relative flex min-h-[250px] items-center justify-center">

            {/* Orbit */}
            <div className="absolute h-52 w-52 rounded-full border border-violet-400/20 rotate-12" />

            <div className="absolute h-40 w-40 rounded-full border border-cyan-400/10 -rotate-12" />

            <div className="absolute text-7xl animate-bounce [animation-duration:4s]">
              🧑‍🚀
            </div>

            <div className="absolute right-10 top-10 text-3xl">
              ⭐
            </div>

            <div className="absolute bottom-8 left-12 text-2xl">
              🪐
            </div>

            <div className="absolute left-6 top-12 text-base">
              ✦
            </div>

          </div>

        </section>

        {/* ================================================= */}
        {/* DAILY MISSION */}
        {/* ================================================= */}

        <section className="relative mb-10 overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-950/80 via-[#11153d] to-[#0c1231] p-6 shadow-2xl shadow-violet-950/40 md:p-8">

          <div className="absolute right-[-30px] top-[-50px] text-[180px] opacity-[0.04]">
            🚀
          </div>

          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">

            <div>

              <div className="mb-4 flex items-center gap-2">

                <span className="text-2xl">
                  🎯
                </span>

                <span className="text-sm font-black uppercase tracking-[0.2em] text-violet-300">
                  Mission of the Day
                </span>

              </div>

              <h3 className="text-3xl font-black md:text-4xl">
                Complete 3 learning missions
              </h3>

              <p className="mt-2 text-base text-slate-400">
                Two missions complete. One more to unlock today's reward!
              </p>

              {/* Mission progress */}

              <div className="mt-6 max-w-xl">

                <div className="mb-3 flex items-center justify-between text-sm font-bold">

                  <span className="text-slate-400">
                    Mission progress
                  </span>

                  <span className="text-violet-300">
                    2 / 3
                  </span>

                </div>

                <div className="flex gap-2">

                  <div className="h-3 flex-1 rounded-full bg-violet-500" />

                  <div className="h-3 flex-1 rounded-full bg-violet-500" />

                  <div className="h-3 flex-1 rounded-full bg-white/10" />

                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowMission(true)}
                className="mt-6 rounded-2xl bg-violet-500 px-7 py-3.5 font-black text-white shadow-lg shadow-violet-900/40 transition hover:-translate-y-1 hover:bg-violet-400 active:scale-95"
              >
                🚀 Launch Mission
              </button>

            </div>

            {/* Mission badge */}

            <div className="flex justify-center">

              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-violet-300/30 bg-violet-500/10">

                <div className="absolute inset-3 rounded-full border border-dashed border-violet-300/30" />

                <div className="text-center">

                  <div className="text-5xl">
                    ⭐
                  </div>

                  <p className="mt-1 text-sm font-bold text-violet-200">
                    +50 XP
                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ================================================= */}
        {/* STATS */}
        {/* ================================================= */}

        <section className="mb-12 grid grid-cols-2 gap-3 md:grid-cols-4">

          {[
            ["⭐", "120", "Star Points", "text-yellow-300"],
            ["🔥", "4", "Fuel Streak", "text-orange-300"],
            ["🏆", "6", "Discoveries", "text-violet-300"],
            ["🌟", "18", "Missions Done", "text-cyan-300"],
          ].map(([icon, value, label, color]) => (

            <div
              key={label}
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >

              <div className="text-3xl">
                {icon}
              </div>

              <p className={`mt-3 text-3xl font-black ${color}`}>
                {value}
              </p>

              <p className="mt-1 text-[14px] font-bold uppercase tracking-wider text-slate-500">
                {label}
              </p>

            </div>

          ))}

        </section>

        {/* ================================================= */}
        {/* PLANET SECTION */}
        {/* ================================================= */}

        <section className="mb-12">

          <div className="mb-6">

            <div className="flex items-center gap-2">

              <span className="text-2xl">
                🪐
              </span>

              <span className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">
                Explore the Universe
              </span>

            </div>

            <h2 className="mt-2 text-4xl font-black">
              Choose your next planet
            </h2>

            <p className="mt-2 text-base text-slate-500">
              Every planet has something new to discover.
            </p>

          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {planets.map((planet) => (

              <button
                type="button"
                key={planet.name}
                onClick={() => handlePlanet(planet.name)}
                className="group text-left"
              >

                <div className="relative h-full overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-2 hover:border-violet-400/40 hover:bg-white/[0.07] hover:shadow-2xl hover:shadow-violet-950/30">

                  {/* Orbit icon */}

                  <div className="absolute right-4 top-4 text-base opacity-40">
                    {planet.orbit}
                  </div>

                  {/* Planet */}

                  <div className="relative mb-6 flex h-28 items-center justify-center">

                    <div
                      className={`absolute h-24 w-24 rounded-full bg-gradient-to-br ${planet.color} opacity-20 blur-xl`}
                    />

                    <div
                      className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${planet.color} text-5xl shadow-lg transition duration-500 group-hover:scale-125 group-hover:rotate-12`}
                    >
                      {planet.emoji}
                    </div>

                  </div>

                  <h3 className="text-xl font-black">
                    {planet.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {planet.subtitle}
                  </p>

                  {/* Progress */}

                  <div className="mt-5">

                    <div className="mb-2 flex justify-between text-[14px] font-bold uppercase tracking-wider">

                      <span className="text-slate-500">
                        Explored
                      </span>

                      <span className="text-slate-300">
                        {planet.progress}%
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">

                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${planet.color} transition-all duration-700 group-hover:brightness-125`}
                        style={{
                          width: `${planet.progress}%`,
                        }}
                      />

                    </div>

                  </div>

                  <div className="mt-5 flex items-center justify-between">

                    <span className="text-sm font-bold text-slate-500">
                      {planet.progress >= 80
                        ? "Almost discovered"
                        : "Keep exploring"}
                    </span>

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-violet-300 transition group-hover:bg-violet-500 group-hover:text-white">
                      →
                    </span>

                  </div>

                </div>

              </button>

            ))}

          </div>

        </section>

        {/* ================================================= */}
        {/* AI NAVIGATOR */}
        {/* ================================================= */}

        <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#09172d] p-6 md:p-8">

          <div className="absolute right-[-20px] top-[-30px] text-[130px] opacity-[0.04]">
            🤖
          </div>

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="flex items-start gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-4xl">
                🤖
              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="text-xl font-black">
                    Learning Navigator
                  </h3>

                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[13px] font-black uppercase tracking-wider text-cyan-300">
                    AI Powered
                  </span>

                </div>

                <p className="mt-2 max-w-xl text-base leading-6 text-slate-400">
                  I studied your recent learning journey and found
                  an activity that matches your current level.
                </p>

                <p className="mt-3 font-bold text-cyan-300">
                  🧮 Easy Mathematics Mission
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => handlePlanet("AI Recommended Mission")}
              className="shrink-0 rounded-2xl bg-cyan-400 px-6 py-3.5 font-black text-slate-950 transition hover:-translate-y-1 hover:bg-cyan-300 active:scale-95"
            >
              ✨ Explore Mission
            </button>

          </div>

        </section>

        {/* ================================================= */}
        {/* DISCOVERIES */}
        {/* ================================================= */}

        <section className="pb-8">

          <div className="mb-5">

            <div className="flex items-center gap-2">

              <span>🏆</span>

              <span className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">
                Your Discoveries
              </span>

            </div>

            <h2 className="mt-2 text-3xl font-black">
              Collection
            </h2>

          </div>

          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">

            {[
              ["🔥", "Streak"],
              ["⭐", "Star Hunter"],
              ["🧠", "Brain Boost"],
              ["🚀", "Explorer"],
              ["🌙", "Night Owl"],
              ["💎", "Rare"],
            ].map(([icon, name], index) => (

              <button
                type="button"
                key={name}
                className={`rounded-2xl border p-4 text-center transition hover:-translate-y-1 ${
                  index < 4
                    ? "border-white/10 bg-white/[0.035] hover:border-yellow-400/30"
                    : "border-dashed border-white/10 bg-white/[0.02] opacity-50"
                }`}
              >

                <div className="text-4xl">
                  {index < 4 ? icon : "🔒"}
                </div>

                <p className="mt-3 text-[14px] font-bold text-slate-400">
                  {index < 4 ? name : "Locked"}
                </p>

              </button>

            ))}

          </div>

        </section>

      </main>

      {/* ================================================= */}
      {/* PLANET SELECTED TOAST */}
      {/* ================================================= */}

      {selectedPlanet && (

        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">

          <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-[#111633] px-5 py-4 shadow-2xl shadow-black/40">

            <span className="text-3xl">
              🚀
            </span>

            <div>

              <p className="text-base font-black">
                Mission selected!
              </p>

              <p className="text-sm text-slate-500">
                Launching {selectedPlanet}
              </p>

            </div>

          </div>

        </div>

      )}

      {/* ================================================= */}
      {/* MISSION MODAL */}
      {/* ================================================= */}

      {showMission && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-md">

          <div className="w-full max-w-md rounded-[2rem] border border-violet-400/20 bg-[#101532] p-8 text-center shadow-2xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10 text-5xl">
              🚀
            </div>

            <h3 className="mt-5 text-3xl font-black">
              Mission Ready!
            </h3>

            <p className="mt-3 text-base leading-6 text-slate-400">
              One more learning mission will complete today's
              adventure and unlock your reward.
            </p>

            <div className="mt-6 rounded-2xl border border-violet-400/10 bg-violet-500/5 p-4">

              <p className="text-sm font-bold uppercase tracking-wider text-violet-300">
                Reward
              </p>

              <p className="mt-2 text-3xl font-black text-yellow-300">
                ⭐ +50 XP
              </p>

            </div>

            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() => setShowMission(false)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-slate-400 transition hover:bg-white/10"
              >
                Later
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMission(false);
                  handlePlanet("Daily Mission");
                }}
                className="flex-1 rounded-xl bg-violet-500 py-3 font-black transition hover:bg-violet-400"
              >
                Launch 🚀
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default StudentDashboardPage;
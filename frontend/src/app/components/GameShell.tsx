import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import studentAPI from "../api/studentApi";

const P = "Poppins, sans-serif";

export type GameStudent = {
  _id: string;
  name: string;
  studentCode?: string;
};

type GameShellProps = {
  title: string;
  icon: string;
  studentId: string;
  onStudentChange: (id: string) => void;
  score?: number;
  time?: number;
  progress?: number;
  children: ReactNode;
};

export default function GameShell({
  title,
  icon,
  studentId,
  onStudentChange,
  score,
  time,
  progress,
  children,
}: GameShellProps) {
  const navigate = useNavigate();

  const [students, setStudents] =
    useState<GameStudent[]>([]);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  /* =====================================================
     LOAD STUDENTS
  ===================================================== */

  useEffect(() => {
    studentAPI
      .get("/")
      .then((r) =>
        setStudents(r.data || [])
      )
      .catch(() => {});
  }, []);

  const selected = students.find(
    (s) => s._id === studentId
  );

  /* =====================================================
     AVATAR
  ===================================================== */

  const initials =
    (user.name || "U")
      .split(" ")
      .map((x: string) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  /* =====================================================
     TIME WARNING
  ===================================================== */

  const timeWarning =
    time !== undefined && time <= 10;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 75% 0%, rgba(124,58,237,.18), transparent 30%), radial-gradient(circle at 15% 65%, rgba(6,182,212,.09), transparent 28%), #070b24",
        color: "#fff",
        fontFamily: P,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* =================================================
          GALAXY ANIMATIONS
      ================================================= */}

      <style>{`

        @keyframes galaxyFloat {
          0%, 100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes planetFloat {
          0%, 100% {
            transform: translateY(0px) rotate(-4deg);
          }

          50% {
            transform: translateY(-9px) rotate(4deg);
          }
        }

        @keyframes galaxyGlow {
          0%, 100% {
            opacity: .35;
          }

          50% {
            opacity: .8;
          }
        }

        @keyframes starTwinkle {
          0%, 100% {
            opacity: .25;
            transform: scale(1);
          }

          50% {
            opacity: .9;
            transform: scale(1.3);
          }
        }

        @keyframes progressGlow {
          0%, 100% {
            box-shadow: 0 0 5px rgba(6,182,212,.15);
          }

          50% {
            box-shadow: 0 0 16px rgba(6,182,212,.4);
          }
        }

        @keyframes warningPulse {
          0%, 100% {
            box-shadow: 0 0 0 rgba(239,68,68,0);
          }

          50% {
            box-shadow: 0 0 18px rgba(239,68,68,.45);
          }
        }

        .game-shell-planet {
          animation: planetFloat 4s ease-in-out infinite;
        }

        .game-shell-glow {
          animation: galaxyGlow 4s ease-in-out infinite;
        }

        .game-shell-progress {
          animation: progressGlow 3s ease-in-out infinite;
        }

        .game-shell-warning {
          animation: warningPulse 1s ease-in-out infinite;
        }

      `}</style>

      {/* =================================================
          BACKGROUND STARS
      ================================================= */}

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
          ["5%", "15%", "✦", 14],
          ["13%", "72%", "✧", 9],
          ["22%", "31%", "✦", 11],
          ["31%", "82%", "✧", 8],
          ["40%", "12%", "✦", 13],
          ["49%", "67%", "✧", 9],
          ["58%", "26%", "✦", 10],
          ["66%", "88%", "✧", 8],
          ["75%", "15%", "✦", 12],
          ["83%", "61%", "✧", 10],
          ["91%", "28%", "✦", 13],
          ["96%", "82%", "✧", 8],
        ].map(
          ([left, top, symbol, size], index) => (
            <span
              key={index}
              style={{
                position: "absolute",
                left: left as string,
                top: top as string,
                color:
                  index % 2 === 0
                    ? "#A78BFA"
                    : "#67E8F9",
                fontSize: size as number,
                opacity:
                  index % 3 === 0
                    ? 0.6
                    : 0.3,
                animation:
                  "starTwinkle 3s ease-in-out infinite",
                animationDelay:
                  `${index * 0.25}s`,
              }}
            >
              {symbol}
            </span>
          )
        )}

        {/* Large blurred galaxy glow */}

        <div
          className="game-shell-glow"
          style={{
            position: "absolute",
            width: 380,
            height: 380,
            borderRadius: "50%",
            right: -180,
            top: 180,
            background:
              "radial-gradient(circle, rgba(124,58,237,.15), transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        <div
          className="game-shell-glow"
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: "50%",
            left: -160,
            bottom: 50,
            background:
              "radial-gradient(circle, rgba(6,182,212,.10), transparent 70%)",
            filter: "blur(20px)",
            animationDelay: "1s",
          }}
        />
      </div>

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background:
            "rgba(7,11,36,.88)",
          backdropFilter:
            "blur(18px)",
          borderBottom:
            "1px solid rgba(139,92,246,.18)",
          padding:
            "12px 25px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* EXIT */}

        <button
          onClick={() =>
            navigate("/activities")
          }
          style={{
            border:
              "1px solid rgba(103,232,249,.15)",
            background:
              "rgba(37,99,235,.12)",
            borderRadius: 12,
            padding:
              "9px 14px",
            cursor: "pointer",
            fontFamily: P,
            color: "#67E8F9",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          ← Exit
        </button>

        {/* TITLE */}

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 800,
              color: "#F8FAFC",
            }}
          >
            <span>{icon}</span>

            <span>{title}</span>
          </div>

          <div
            style={{
              fontSize: 9,
              color: "#94A3B8",
              marginTop: 2,
              letterSpacing: 0.3,
            }}
          >
            Interactive learning mission
          </div>
        </div>

        {/* LEARNER SELECTOR */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "#94A3B8",
              letterSpacing: 0.5,
            }}
          >
            LEARNER
          </span>

          <select
            value={studentId}
            onChange={(e) =>
              onStudentChange(
                e.target.value
              )
            }
            style={{
              border:
                "1px solid rgba(103,232,249,.2)",
              borderRadius: 10,
              padding:
                "8px 10px",
              fontFamily: P,
              fontSize: 11,
              minWidth: 145,
              background:
                "#101735",
              color: "#E2E8F0",
              outline: "none",
            }}
          >
            <option value="">
              Select student
            </option>

            {students.map((s) => (
              <option
                key={s._id}
                value={s._id}
              >
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* USER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding:
              "6px 9px",
            borderRadius: 12,
            background:
              "rgba(37,99,235,.10)",
            border:
              "1px solid rgba(139,92,246,.12)",
          }}
        >
          <div
            style={{
              width: 31,
              height: 31,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg,#1565C0,#8B5CF6,#06B6D4)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
              fontSize: 10,
              boxShadow:
                "0 0 15px rgba(139,92,246,.25)",
            }}
          >
            {initials}
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#F8FAFC",
              }}
            >
              {user.name ||
                "User"}
            </div>

            <div
              style={{
                fontSize: 8,
                color: "#94A3B8",
                textTransform:
                  "capitalize",
              }}
            >
              {user.role ||
                "teacher"}
            </div>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN AREA
      ================================================= */}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1080,
          margin: "0 auto",
          padding:
            "22px 24px 60px",
        }}
      >
        {/* =================================================
            SELECTED LEARNER
        ================================================= */}

        {selected && (
          <div
            style={{
              background:
                "linear-gradient(90deg, rgba(6,182,212,.10), rgba(139,92,246,.10))",
              border:
                "1px solid rgba(103,232,249,.18)",
              borderRadius: 12,
              padding:
                "9px 14px",
              fontSize: 11,
              color: "#67E8F9",
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            🚀 Learner:
            {" "}
            {selected.name}
          </div>
        )}

        {/* =================================================
            GAME STATUS BAR
        ================================================= */}

        {(score !== undefined ||
          time !== undefined ||
          progress !== undefined) && (
          <div
            style={{
              background:
                "rgba(15,23,55,.82)",
              backdropFilter:
                "blur(12px)",
              border:
                "1px solid rgba(139,92,246,.15)",
              borderRadius: 16,
              padding:
                "11px 15px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              marginBottom: 16,
              boxShadow:
                "0 8px 25px rgba(0,0,0,.15)",
            }}
          >
            {/* SCORE */}

            {score !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#FBBF24",
                  whiteSpace:
                    "nowrap",
                }}
              >
                ⭐ Score: {score}
              </span>
            )}

            {/* TIME */}

            {time !== undefined && (
              <span
                className={
                  timeWarning
                    ? "game-shell-warning"
                    : ""
                }
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: timeWarning
                    ? "#F87171"
                    : "#67E8F9",
                  whiteSpace:
                    "nowrap",
                  borderRadius: 8,
                  padding:
                    "3px 6px",
                }}
              >
                ⏱ {time}s
              </span>
            )}

            {/* PROGRESS */}

            {progress !== undefined && (
              <div
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 99,
                  background:
                    "rgba(148,163,184,.16)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="game-shell-progress"
                  style={{
                    height: "100%",
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        progress
                      )
                    )}%`,
                    background:
                      "linear-gradient(90deg,#1565C0,#8B5CF6,#06B6D4)",
                    borderRadius: 99,
                    transition:
                      "width .4s ease",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* =================================================
            GAME CONTENT
        ================================================= */}

        <div
          style={{
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>

      {/* =================================================
          DECORATIVE SATURN
      ================================================= */}

      <div
        className="game-shell-planet"
        style={{
          position: "fixed",
          right: 25,
          bottom: 25,
          width: 68,
          height: 68,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 30% 28%, #FDE68A, #F59E0B 45%, #7C3AED 100%)",
          boxShadow:
            "0 0 35px rgba(124,58,237,.22)",
          opacity: 0.8,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 92,
            height: 23,
            border:
              "3px solid rgba(103,232,249,.5)",
            borderRadius: "50%",
            top: 23,
            left: -12,
            transform:
              "rotate(-15deg)",
          }}
        />
      </div>
    </div>
  );
}
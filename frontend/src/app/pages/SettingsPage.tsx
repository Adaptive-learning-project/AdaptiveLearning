import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";

const P = "Poppins, sans-serif";

const PURPLE = "#8B5CF6";
const CYAN = "#06B6D4";
const GREEN = "#22C55E";
const PINK = "#F472B6";
const YELLOW = "#FACC15";

type Section =
  | "Profile"
  | "Password & Security"
  | "Appearance"
  | "Language & Region"
  | "Notifications"
  | "Data & Backup"
  | "Help & Support";

/* =========================================================
   GLOBAL GALAXY STYLES
========================================================= */

const galaxyCSS = `
  @keyframes starTwinkle {
    0%, 100% {
      opacity: .2;
      transform: scale(.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.25);
    }
  }

  @keyframes planetFloat {
    0%, 100% {
      transform: translateY(0) rotate(-4deg);
    }
    50% {
      transform: translateY(-10px) rotate(4deg);
    }
  }

  @keyframes glowPulse {
    0%, 100% {
      box-shadow: 0 0 0 rgba(139,92,246,0);
    }
    50% {
      box-shadow: 0 0 30px rgba(139,92,246,.25);
    }
  }

  .settings-planet {
    animation: planetFloat 4s ease-in-out infinite;
  }

  .settings-glow {
    animation: glowPulse 3s ease-in-out infinite;
  }
`;

/* =========================================================
   TOGGLE
========================================================= */

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onToggle}
      aria-label="toggle"
      style={{
        width: 48,
        height: 27,
        borderRadius: 20,
        background: on
          ? "linear-gradient(135deg,#8B5CF6,#06B6D4)"
          : "rgba(148,163,184,.25)",
        border: on
          ? "1px solid rgba(139,92,246,.5)"
          : "1px solid rgba(148,163,184,.2)",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
        padding: 0,
        boxShadow: on
          ? "0 0 18px rgba(139,92,246,.25)"
          : "none",
      }}
    >
      <motion.span
        animate={{
          x: on ? 21 : 2,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{
          position: "absolute",
          top: 3,
          left: 2,
          width: 19,
          height: 19,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 7px rgba(0,0,0,.35)",
        }}
      />
    </motion.button>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}
    >
      <label
        style={{
          fontFamily: P,
          fontSize: 14,
          fontWeight: 800,
          color: "#94A3B8",
          letterSpacing: ".08em",
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: P,
  fontSize: 16,
  padding: "12px 14px",
  borderRadius: 13,
  border: "1px solid rgba(148,163,184,.16)",
  color: "#E2E8F0",
  outline: "none",
  boxSizing: "border-box",
  background: "rgba(255,255,255,.045)",
};

/* =========================================================
   SAVE BUTTON
========================================================= */

function SaveBtn({
  label = "Save Changes",
}: {
  label?: string;
}) {
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 1800);
  };

  return (
    <motion.button
      whileHover={{
        y: -2,
        scale: 1.01,
      }}
      whileTap={{
        scale: 0.96,
      }}
      onClick={save}
      style={{
        background: saved
          ? "linear-gradient(135deg,#22C55E,#06B6D4)"
          : "linear-gradient(135deg,#8B5CF6,#06B6D4)",
        color: "#fff",
        border: "none",
        borderRadius: 13,
        padding: "12px 24px",
        fontFamily: P,
        fontWeight: 800,
        fontSize: 15,
        cursor: "pointer",
        boxShadow:
          "0 8px 25px rgba(139,92,246,.22)",
      }}
    >
      {saved ? "✓ Saved Successfully" : `💾 ${label}`}
    </motion.button>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function ProfilePanel() {
  const [name, setName] =
    useState("Priya Rajan");

  const [email, setEmail] =
    useState("priya@giid.edu");

  const [empId, setEmpId] =
    useState("GIID-001");

  const [dept, setDept] =
    useState("Special Education");

  const [phone, setPhone] =
    useState("+91 98765 43210");

  const [bio, setBio] =
    useState(
      "Passionate special educator with 8+ years of experience."
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 25,
      }}
    >
      {/* PROFILE HERO */}

      <div
        style={{
          padding: 20,
          borderRadius: 22,
          background:
            "linear-gradient(135deg,rgba(139,92,246,.12),rgba(6,182,212,.06))",
          border:
            "1px solid rgba(139,92,246,.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <motion.div
            whileHover={{
              scale: 1.06,
              rotate: 4,
            }}
            className="settings-planet"
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background:
                "radial-gradient(circle at 30% 25%,#fff,#A78BFA 18%,#4C1D95 65%,#111936)",
              boxShadow:
                "0 0 35px rgba(139,92,246,.3)",
              fontSize: 31,
              flexShrink: 0,
            }}
          >
            👩‍🚀
          </motion.div>

          <div>
            <div
              style={{
                fontFamily: P,
                fontWeight: 800,
                fontSize: 17,
                color: "#fff",
              }}
            >
              {name}
            </div>

            <div
              style={{
                fontFamily: P,
                fontSize: 14,
                color: "#94A3B8",
                marginTop: 3,
              }}
            >
              {dept}
            </div>

            <button
              style={{
                marginTop: 9,
                fontFamily: P,
                fontSize: 14,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 20,
                border:
                  "1px solid rgba(139,92,246,.45)",
                background:
                  "rgba(139,92,246,.08)",
                color: "#C4B5FD",
                cursor: "pointer",
              }}
            >
              📷 Change Photo
            </button>
          </div>
        </div>
      </div>

      {/* FORM */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 17,
        }}
      >
        <Field label="FULL NAME">
          <input
            style={inputStyle}
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />
        </Field>

        <Field label="EMAIL">
          <input
            style={inputStyle}
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />
        </Field>

        <Field label="EMPLOYEE ID">
          <input
            style={inputStyle}
            value={empId}
            onChange={(e) =>
              setEmpId(e.target.value)
            }
          />
        </Field>

        <Field label="DEPARTMENT">
          <input
            style={inputStyle}
            value={dept}
            onChange={(e) =>
              setDept(e.target.value)
            }
          />
        </Field>

        <Field label="PHONE">
          <input
            style={inputStyle}
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
          />
        </Field>
      </div>

      <Field label="BIO">
        <textarea
          value={bio}
          onChange={(e) =>
            setBio(e.target.value)
          }
          rows={3}
          style={{
            ...inputStyle,
            resize: "none",
          }}
        />
      </Field>

      <SaveBtn label="Save Profile" />
    </div>
  );
}

/* =========================================================
   PASSWORD
========================================================= */

function PasswordPanel() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");

  const strength =
    nw.length === 0
      ? 0
      : nw.length < 6
      ? 1
      : nw.length <= 10
      ? 2
      : 3;

  const strengthLabel =
    ["", "Weak", "Medium", "Strong"][
      strength
    ];

  const strengthColor =
    ["", "#FB7185", "#FACC15", "#22C55E"][
      strength
    ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          padding: 17,
          borderRadius: 17,
          background:
            "rgba(6,182,212,.055)",
          border:
            "1px solid rgba(6,182,212,.12)",
          color: "#94A3B8",
          fontFamily: P,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        🔐 Keep your account secure with
        a strong password. Use at least
        8 characters with numbers and
        symbols.
      </div>

      <Field label="CURRENT PASSWORD">
        <input
          type="password"
          style={inputStyle}
          value={cur}
          onChange={(e) =>
            setCur(e.target.value)
          }
        />
      </Field>

      <Field label="NEW PASSWORD">
        <input
          type="password"
          style={inputStyle}
          value={nw}
          onChange={(e) =>
            setNw(e.target.value)
          }
        />

        {nw.length > 0 && (
          <div style={{ marginTop: 7 }}>
            <div
              style={{
                display: "flex",
                gap: 4,
              }}
            >
              {[1, 2, 3].map((lvl) => (
                <motion.div
                  key={lvl}
                  animate={{
                    opacity:
                      strength >= lvl
                        ? 1
                        : 0.3,
                  }}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 5,
                    background:
                      strength >= lvl
                        ? strengthColor
                        : "#334155",
                  }}
                />
              ))}
            </div>

            <span
              style={{
                fontFamily: P,
                fontSize: 13,
                fontWeight: 700,
                color: strengthColor,
              }}
            >
              {strengthLabel}
            </span>
          </div>
        )}
      </Field>

      <Field label="CONFIRM NEW PASSWORD">
        <input
          type="password"
          style={inputStyle}
          value={conf}
          onChange={(e) =>
            setConf(e.target.value)
          }
        />
      </Field>

      <SaveBtn label="Change Password" />
    </div>
  );
}

/* =========================================================
   APPEARANCE
========================================================= */

function AppearancePanel() {
  const [theme, setTheme] =
    useState("Galaxy");

  const [fontSize, setFontSize] =
    useState("Medium");

  const [accent, setAccent] =
    useState(PURPLE);

  const themes = [
    {
      label: "Galaxy",
      icon: "🌌",
      bg: "#070B24",
    },
    {
      label: "Light",
      icon: "☀️",
      bg: "#F8FAFC",
    },
    {
      label: "System",
      icon: "💻",
      bg: "#334155",
    },
  ];

  const swatches = [
    PURPLE,
    CYAN,
    GREEN,
    PINK,
    YELLOW,
    "#F97316",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 27,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 16,
            color: "#E2E8F0",
            marginBottom: 12,
          }}
        >
          🌌 Theme
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3,1fr)",
            gap: 10,
          }}
        >
          {themes.map((t) => {
            const active =
              theme === t.label;

            return (
              <motion.button
                key={t.label}
                whileHover={{
                  y: -3,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                onClick={() =>
                  setTheme(t.label)
                }
                style={{
                  padding: 12,
                  borderRadius: 17,
                  border: active
                    ? `1px solid ${PURPLE}`
                    : "1px solid rgba(148,163,184,.12)",
                  background:
                    active
                      ? "rgba(139,92,246,.12)"
                      : "rgba(255,255,255,.035)",
                  cursor: "pointer",
                  color: "#fff",
                  fontFamily: P,
                }}
              >
                <div
                  style={{
                    height: 60,
                    borderRadius: 11,
                    background:
                      t.bg,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 24,
                    border:
                      "1px solid rgba(148,163,184,.12)",
                  }}
                >
                  {t.icon}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: active
                      ? "#C4B5FD"
                      : "#94A3B8",
                  }}
                >
                  {t.label}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 16,
            color: "#E2E8F0",
            marginBottom: 12,
          }}
        >
          🔤 Font Size
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          {["Small", "Medium", "Large"].map(
            (f) => {
              const active =
                fontSize === f;

              return (
                <motion.button
                  key={f}
                  whileTap={{
                    scale: 0.95,
                  }}
                  onClick={() =>
                    setFontSize(f)
                  }
                  style={{
                    fontFamily: P,
                    fontSize: 14,
                    fontWeight: 700,
                    padding:
                      "8px 17px",
                    borderRadius: 20,
                    border: active
                      ? `1px solid ${PURPLE}`
                      : "1px solid rgba(148,163,184,.12)",
                    background: active
                      ? "rgba(139,92,246,.14)"
                      : "rgba(255,255,255,.035)",
                    color: active
                      ? "#C4B5FD"
                      : "#94A3B8",
                    cursor: "pointer",
                  }}
                >
                  {f}
                </motion.button>
              );
            }
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 16,
            color: "#E2E8F0",
            marginBottom: 12,
          }}
        >
          🎨 Accent Color
        </div>

        <div
          style={{
            display: "flex",
            gap: 11,
          }}
        >
          {swatches.map((color) => (
            <motion.button
              key={color}
              whileHover={{
                scale: 1.12,
              }}
              whileTap={{
                scale: 0.9,
              }}
              onClick={() =>
                setAccent(color)
              }
              style={{
                width: 35,
                height: 35,
                borderRadius: "50%",
                background: color,
                border:
                  "3px solid transparent",
                boxShadow:
                  accent === color
                    ? `0 0 0 2px #111936,0 0 0 4px ${color}`
                    : "none",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          padding: 17,
          borderRadius: 17,
          background:
            "rgba(139,92,246,.06)",
          border:
            "1px solid rgba(139,92,246,.14)",
        }}
      >
        <div
          style={{
            fontFamily: P,
            fontSize: 15,
            fontWeight: 800,
            color: "#C4B5FD",
          }}
        >
          ✨ Galaxy Mode
        </div>

        <div
          style={{
            marginTop: 4,
            fontFamily: P,
            fontSize: 13,
            color: "#94A3B8",
          }}
        >
          Your dashboard uses animated
          space visuals and interactive
          learning elements.
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LANGUAGE
========================================================= */

function LanguagePanel() {
  const [lang, setLang] =
    useState("English (US)");

  const [dateFormat, setDateFormat] =
    useState("DD/MM/YYYY");

  const [timeFormat, setTimeFormat] =
    useState("12h");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <Field label="LANGUAGE">
        <select
          value={lang}
          onChange={(e) =>
            setLang(e.target.value)
          }
          style={inputStyle}
        >
          {[
            "English (US)",
            "Tamil",
            "Hindi",
            "Telugu",
          ].map((l) => (
            <option
              key={l}
              style={{
                background: "#111936",
              }}
            >
              {l}
            </option>
          ))}
        </select>
      </Field>

      <Field label="REGION">
        <input
          style={inputStyle}
          value="India"
          readOnly
        />
      </Field>

      <Field label="DATE FORMAT">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {[
            "DD/MM/YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
          ].map((f) => {
            const active =
              dateFormat === f;

            return (
              <button
                key={f}
                onClick={() =>
                  setDateFormat(f)
                }
                style={{
                  fontFamily: P,
                  fontSize: 14,
                  fontWeight: 700,
                  padding:
                    "8px 14px",
                  borderRadius: 20,
                  border: active
                    ? `1px solid ${PURPLE}`
                    : "1px solid rgba(148,163,184,.12)",
                  background: active
                    ? "rgba(139,92,246,.14)"
                    : "rgba(255,255,255,.035)",
                  color: active
                    ? "#C4B5FD"
                    : "#94A3B8",
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="TIME FORMAT">
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          {["12h", "24h"].map(
            (f) => {
              const active =
                timeFormat === f;

              return (
                <button
                  key={f}
                  onClick={() =>
                    setTimeFormat(f)
                  }
                  style={{
                    fontFamily: P,
                    fontSize: 14,
                    fontWeight: 700,
                    padding:
                      "8px 20px",
                    borderRadius: 20,
                    border: active
                      ? `1px solid ${PURPLE}`
                      : "1px solid rgba(148,163,184,.12)",
                    background: active
                      ? "rgba(139,92,246,.14)"
                      : "rgba(255,255,255,.035)",
                    color: active
                      ? "#C4B5FD"
                      : "#94A3B8",
                    cursor: "pointer",
                  }}
                >
                  {f}
                </button>
              );
            }
          )}
        </div>
      </Field>

      <SaveBtn label="Save Language Settings" />
    </div>
  );
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function NotificationsPanel() {
  const [settings, setSettings] =
    useState([
      {
        label:
          "Learning Notifications",
        desc:
          "Receive updates about learning activities",
        on: true,
        icon: "🧠",
      },
      {
        label:
          "Session Reminders",
        desc:
          "Reminders before student sessions",
        on: true,
        icon: "⏰",
      },
      {
        label:
          "Weekly Reports",
        desc:
          "Weekly performance summaries",
        on: true,
        icon: "📊",
      },
      {
        label:
          "Achievement Alerts",
        desc:
          "Student milestone notifications",
        on: true,
        icon: "🏆",
      },
      {
        label:
          "System Updates",
        desc:
          "Platform update announcements",
        on: false,
        icon: "⚡",
      },
    ]);

  const toggle = (i: number) =>
    setSettings((s) =>
      s.map((item, idx) =>
        idx === i
          ? {
              ...item,
              on: !item.on,
            }
          : item
      )
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {settings.map((s, i) => (
        <motion.div
          key={s.label}
          whileHover={{
            x: 3,
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            padding:
              "15px 17px",
            borderRadius: 17,
            background:
              "rgba(255,255,255,.035)",
            border:
              "1px solid rgba(148,163,184,.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                display: "grid",
                placeItems:
                  "center",
                background:
                  "rgba(139,92,246,.09)",
                fontSize: 17,
              }}
            >
              {s.icon}
            </div>

            <div>
              <div
                style={{
                  fontFamily: P,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#E2E8F0",
                }}
              >
                {s.label}
              </div>

              <div
                style={{
                  fontFamily: P,
                  fontSize: 13,
                  color: "#64748B",
                  marginTop: 2,
                }}
              >
                {s.desc}
              </div>
            </div>
          </div>

          <Toggle
            on={s.on}
            onToggle={() =>
              toggle(i)
            }
          />
        </motion.div>
      ))}
    </div>
  );
}

/* =========================================================
   DATA & BACKUP
========================================================= */

function DataBackupPanel() {
  const [backingUp, setBackingUp] =
    useState(false);

  const handleBackup = () => {
    setBackingUp(true);

    setTimeout(() => {
      setBackingUp(false);
    }, 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 15,
      }}
    >
      <div
        style={{
          padding: 19,
          borderRadius: 19,
          background:
            "rgba(6,182,212,.055)",
          border:
            "1px solid rgba(6,182,212,.12)",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 15,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: P,
              fontSize: 16,
              fontWeight: 800,
              color: "#E2E8F0",
            }}
          >
            ☁️ Last Backup
          </div>

          <div
            style={{
              fontFamily: P,
              fontSize: 13,
              color: "#64748B",
              marginTop: 3,
            }}
          >
            28 Jul 2025, 11:00 PM
          </div>
        </div>

        <motion.button
          whileHover={{
            y: -2,
          }}
          whileTap={{
            scale: 0.96,
          }}
          onClick={handleBackup}
          style={{
            fontFamily: P,
            fontSize: 14,
            fontWeight: 800,
            padding:
              "10px 15px",
            borderRadius: 12,
            border: "none",
            background:
              backingUp
                ? "#334155"
                : "linear-gradient(135deg,#8B5CF6,#06B6D4)",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {backingUp
            ? "⏳ Backing up..."
            : "☁️ Backup Now"}
        </motion.button>
      </div>

      <motion.button
        whileHover={{
          y: -2,
        }}
        style={{
          fontFamily: P,
          fontSize: 14,
          fontWeight: 800,
          padding: 13,
          borderRadius: 14,
          border:
            "1px solid rgba(34,197,94,.25)",
          background:
            "rgba(34,197,94,.06)",
          color: "#86EFAC",
          cursor: "pointer",
        }}
      >
        📥 Export All Data (CSV)
      </motion.button>

      <div
        style={{
          padding: 20,
          borderRadius: 18,
          border:
            "1px solid rgba(251,113,133,.2)",
          background:
            "rgba(251,113,133,.045)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 7,
          }}
        >
          <span>⚠️</span>

          <span
            style={{
              fontFamily: P,
              fontWeight: 800,
              fontSize: 16,
              color: "#FDA4AF",
            }}
          >
            Danger Zone
          </span>
        </div>

        <div
          style={{
            fontFamily: P,
            fontSize: 13,
            color: "#94A3B8",
            lineHeight: 1.6,
            marginBottom: 13,
          }}
        >
          Deleting your account is
          permanent and irreversible.
        </div>

        <button
          style={{
            fontFamily: P,
            fontSize: 14,
            fontWeight: 800,
            padding:
              "9px 15px",
            borderRadius: 11,
            border:
              "1px solid rgba(251,113,133,.35)",
            background:
              "rgba(251,113,133,.06)",
            color: "#FB7185",
            cursor: "pointer",
          }}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   HELP
========================================================= */

function HelpPanel() {
  const [open, setOpen] =
    useState<number | null>(null);

  const faqs = [
    {
      q: "How do I add a new student?",
      a: "Navigate to the Students section from the sidebar, then click the Add Student button.",
    },
    {
      q: "Can I export student progress reports?",
      a: "Yes. Open the student's profile and use the report/export options.",
    },
    {
      q: "How do I reset a student's activity progress?",
      a: "Open the student profile and use the activity progress controls.",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          padding: 17,
          borderRadius: 17,
          background:
            "rgba(139,92,246,.055)",
          border:
            "1px solid rgba(139,92,246,.13)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#C4B5FD",
            fontFamily: P,
          }}
        >
          🧑‍🚀 Need assistance?
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#64748B",
            fontFamily: P,
          }}
        >
          Explore the knowledge base or
          contact the support team.
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: P,
            fontWeight: 800,
            fontSize: 16,
            color: "#E2E8F0",
            marginBottom: 10,
          }}
        >
          🚀 Frequently Asked Questions
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
          }}
        >
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                borderRadius: 15,
                border:
                  "1px solid rgba(148,163,184,.10)",
                overflow: "hidden",
                background:
                  "rgba(255,255,255,.025)",
              }}
            >
              <button
                onClick={() =>
                  setOpen(
                    open === i
                      ? null
                      : i
                  )
                }
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding:
                    "13px 15px",
                  background:
                    "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap: 8,
                  color: "#E2E8F0",
                }}
              >
                <span
                  style={{
                    fontFamily: P,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {faq.q}
                </span>

                <span
                  style={{
                    color: "#A78BFA",
                    fontSize: 19,
                  }}
                >
                  {open === i
                    ? "−"
                    : "+"}
                </span>
              </button>

              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{
                      height: 0,
                      opacity: 0,
                    }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                    }}
                    style={{
                      overflow:
                        "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "0 15px 14px",
                        fontFamily: P,
                        fontSize: 13,
                        color:
                          "#94A3B8",
                        lineHeight: 1.7,
                      }}
                    >
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: 10,
        }}
      >
        <div
          style={{
            padding: 15,
            borderRadius: 15,
            background:
              "rgba(6,182,212,.05)",
            border:
              "1px solid rgba(6,182,212,.12)",
          }}
        >
          <div style={{ fontSize: 19 }}>
            📧
          </div>

          <div
            style={{
              marginTop: 6,
              fontFamily: P,
              fontSize: 13,
              color: "#64748B",
            }}
          >
            EMAIL SUPPORT
          </div>

          <div
            style={{
              marginTop: 3,
              fontFamily: P,
              fontSize: 14,
              fontWeight: 700,
              color: "#67E8F9",
            }}
          >
            support@giid.edu
          </div>
        </div>

        <div
          style={{
            padding: 15,
            borderRadius: 15,
            background:
              "rgba(34,197,94,.05)",
            border:
              "1px solid rgba(34,197,94,.12)",
          }}
        >
          <div style={{ fontSize: 19 }}>
            📞
          </div>

          <div
            style={{
              marginTop: 6,
              fontFamily: P,
              fontSize: 13,
              color: "#64748B",
            }}
          >
            PHONE SUPPORT
          </div>

          <div
            style={{
              marginTop: 3,
              fontFamily: P,
              fontSize: 14,
              fontWeight: 700,
              color: "#86EFAC",
            }}
          >
            +91 44 2233 4455
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: P,
          fontSize: 12,
          color: "#475569",
          textAlign: "center",
        }}
      >
        🌌 GIID Platform v2.1.0 ·
        Learning Galaxy Edition
      </div>
    </div>
  );
}

/* =========================================================
   MAIN SETTINGS PAGE
========================================================= */

export default function SettingsPage() {
  const [selected, setSelected] =
    useState<Section>("Profile");

  const navItems: {
    label: Section;
    icon: string;
    emoji: string;
  }[] = [
    {
      label: "Profile",
      icon: "👤",
      emoji: "👩‍🚀",
    },
    {
      label: "Password & Security",
      icon: "🔐",
      emoji: "🛡️",
    },
    {
      label: "Appearance",
      icon: "🎨",
      emoji: "🌌",
    },
    {
      label: "Language & Region",
      icon: "🌍",
      emoji: "🌎",
    },
    {
      label: "Notifications",
      icon: "🔔",
      emoji: "📡",
    },
    {
      label: "Data & Backup",
      icon: "☁️",
      emoji: "💾",
    },
    {
      label: "Help & Support",
      icon: "❓",
      emoji: "🧑‍🚀",
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
          ["7%", "12%"],
          ["17%", "72%"],
          ["29%", "20%"],
          ["42%", "83%"],
          ["57%", "11%"],
          ["71%", "68%"],
          ["84%", "25%"],
          ["95%", "82%"],
        ].map(([left, top], i) => (
          <motion.span
            key={i}
            animate={{
              opacity: [
                0.15,
                0.75,
                0.15,
              ],
              scale: [
                0.8,
                1.2,
                0.8,
              ],
            }}
            transition={{
              duration:
                2.2 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              left,
              top,
              color:
                i % 2
                  ? "#67E8F9"
                  : "#A78BFA",
              fontSize:
                i % 2 ? 9 : 15,
            }}
          >
            {i % 2
              ? "✧"
              : "✦"}
          </motion.span>
        ))}
      </div>

      {/* SIDEBAR */}

      <div
        style={{
          position: "relative",
          zIndex: 5,
        }}
      >
        <Sidebar active="Settings" />
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
          title="Galaxy Control Center"
          subtitle="Personalize your learning universe"
        />

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding:
              "25px 30px 60px",
          }}
        >
          {/* HERO */}

          <motion.div
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
                "25px 28px",
              marginBottom: 20,
              background:
                "linear-gradient(135deg,#312E81,#111936 62%,#0E7490)",
              border:
                "1px solid rgba(167,139,250,.16)",
              boxShadow:
                "0 20px 55px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -50,
                top: -90,
                width: 210,
                height: 210,
                borderRadius:
                  "50%",
                background:
                  "rgba(139,92,246,.15)",
                filter: "blur(5px)",
              }}
            />

            <div
              style={{
                position:
                  "relative",
                zIndex: 2,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color:
                      "#A78BFA",
                    letterSpacing:
                      ".12em",
                  }}
                >
                  ⚙️ CONTROL CENTER
                </div>

                <h1
                  style={{
                    margin:
                      "6px 0 4px",
                    fontSize: 25,
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  Personalize Your
                  Universe
                </h1>

                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color:
                      "#CBD5E1",
                  }}
                >
                  Manage your profile,
                  preferences, security
                  and learning experience.
                </p>
              </div>

              <motion.div
                animate={{
                  y: [0, -9, 0],
                  rotate: [
                    -4,
                    4,
                    -4,
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  fontSize: 52,
                  filter:
                    "drop-shadow(0 0 18px rgba(167,139,250,.35))",
                }}
              >
                🪐
              </motion.div>
            </div>
          </motion.div>

          {/* CONTENT */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "250px minmax(0,1fr)",
              gap: 18,
              alignItems:
                "start",
            }}
          >
            {/* NAVIGATION */}

            <motion.div
              initial={{
                opacity: 0,
                x: -12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              style={{
                padding: 11,
                borderRadius: 21,
                background:
                  "rgba(15,23,55,.9)",
                border:
                  "1px solid rgba(148,163,184,.10)",
              }}
            >
              {navItems.map(
                ({
                  label,
                  icon,
                }) => {
                  const active =
                    selected ===
                    label;

                  return (
                    <motion.button
                      key={label}
                      whileHover={{
                        x: 3,
                      }}
                      whileTap={{
                        scale: 0.98,
                      }}
                      onClick={() =>
                        setSelected(
                          label
                        )
                      }
                      style={{
                        width:
                          "100%",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 10,
                        padding:
                          "11px 12px",
                        borderRadius:
                          13,
                        border:
                          "none",
                        background:
                          active
                            ? "linear-gradient(135deg,rgba(139,92,246,.17),rgba(6,182,212,.07))"
                            : "transparent",
                        borderLeft:
                          active
                            ? `2px solid ${PURPLE}`
                            : "2px solid transparent",
                        cursor:
                          "pointer",
                        marginBottom:
                          4,
                        color:
                          "#E2E8F0",
                        textAlign:
                          "left",
                        fontFamily: P,
                      }}
                    >
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius:
                            10,
                          display:
                            "grid",
                          placeItems:
                            "center",
                          background:
                            active
                              ? "rgba(139,92,246,.15)"
                              : "rgba(255,255,255,.035)",
                          fontSize: 19,
                        }}
                      >
                        {icon}
                      </span>

                      <span
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight:
                            active
                              ? 800
                              : 600,
                          color:
                            active
                              ? "#C4B5FD"
                              : "#94A3B8",
                        }}
                      >
                        {label}
                      </span>

                      {active && (
                        <span
                          style={{
                            color:
                              "#A78BFA",
                            fontSize: 17,
                          }}
                        >
                          →
                        </span>
                      )}
                    </motion.button>
                  );
                }
              )}
            </motion.div>

            {/* PANEL */}

            <AnimatePresence
              mode="wait"
            >
              <motion.div
                key={selected}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                transition={{
                  duration: 0.2,
                }}
                style={{
                  minWidth: 0,
                  padding: 25,
                  borderRadius: 23,
                  background:
                    "rgba(15,23,55,.92)",
                  border:
                    "1px solid rgba(148,163,184,.10)",
                  boxShadow:
                    "0 20px 50px rgba(0,0,0,.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
                    paddingBottom: 17,
                    marginBottom: 20,
                    borderBottom:
                      "1px solid rgba(148,163,184,.09)",
                  }}
                >
                  <div
                    style={{
                      width: 39,
                      height: 39,
                      borderRadius: 13,
                      display:
                        "grid",
                      placeItems:
                        "center",
                      background:
                        "linear-gradient(135deg,rgba(139,92,246,.18),rgba(6,182,212,.08))",
                      fontSize: 18,
                    }}
                  >
                    {
                      navItems.find(
                        (x) =>
                          x.label ===
                          selected
                      )?.emoji
                    }
                  </div>

                  <div>
                    <div
                      style={{
                        fontFamily: P,
                        fontWeight: 800,
                        fontSize: 16,
                        color:
                          "#fff",
                      }}
                    >
                      {selected}
                    </div>

                    <div
                      style={{
                        fontFamily: P,
                        fontSize: 13,
                        color:
                          "#64748B",
                        marginTop: 2,
                      }}
                    >
                      Configure your
                      preferences
                    </div>
                  </div>
                </div>

                {selected ===
                  "Profile" && (
                  <ProfilePanel />
                )}

                {selected ===
                  "Password & Security" && (
                  <PasswordPanel />
                )}

                {selected ===
                  "Appearance" && (
                  <AppearancePanel />
                )}

                {selected ===
                  "Language & Region" && (
                  <LanguagePanel />
                )}

                {selected ===
                  "Notifications" && (
                  <NotificationsPanel />
                )}

                {selected ===
                  "Data & Backup" && (
                  <DataBackupPanel />
                )}

                {selected ===
                  "Help & Support" && (
                  <HelpPanel />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
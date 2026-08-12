import { useState, useRef } from "react";
import {
  Link,
  useNavigate,
  Navigate,
} from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";
import API from "../api/studentApi";

const P = "Poppins, sans-serif";

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  options,
  icon,
}: {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  options?: string[];
  icon?: string;
}) {
  const [focused, setFocused] =
    useState(false);

  const base: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: P,
    fontSize: 16,
    color: "#F8FAFC",
    outline: "none",
    border: `1px solid ${
      focused
        ? "rgba(103,232,249,.6)"
        : "rgba(148,163,184,.16)"
    }`,
    borderRadius: 12,
    padding: "11px 13px",
    background: focused
      ? "rgba(6,182,212,.055)"
      : "rgba(255,255,255,.035)",
    transition: "all .2s ease",
    boxShadow: focused
      ? "0 0 0 3px rgba(6,182,212,.06)"
      : "none",
  };

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: P,
          fontWeight: 700,
          fontSize: 15,
          color: "#CBD5E1",
          marginBottom: 7,
        }}
      >
        {icon && (
          <span
            className="material-icons-round"
            style={{
              fontSize: 16,
              color: "#67E8F9",
            }}
          >
            {icon}
          </span>
        )}

        {label}

        {required && (
          <span
            style={{
              color: "#F87171",
            }}
          >
            *
          </span>
        )}
      </label>

      {options ? (
        <select
          id={id}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          onFocus={() =>
            setFocused(true)
          }
          onBlur={() =>
            setFocused(false)
          }
          style={base}
        >
          <option
            value=""
            style={{
              background: "#111936",
            }}
          >
            Select {label}
          </option>

          {options.map((o) => (
            <option
              key={o}
              value={o}
              style={{
                background: "#111936",
                color: "#fff",
              }}
            >
              {o}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          rows={3}
          onFocus={() =>
            setFocused(true)
          }
          onBlur={() =>
            setFocused(false)
          }
          style={{
            ...base,
            resize: "none",
          }}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          placeholder={placeholder}
          onFocus={() =>
            setFocused(true)
          }
          onBlur={() =>
            setFocused(false)
          }
          style={base}
        />
      )}
    </div>
  );
}

/* =========================================================
   ADD STUDENT
========================================================= */

export default function AddStudentPage() {
  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  /* =======================================================
     ADMIN PROTECTION
  ======================================================= */

  if (user.role !== "admin") {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  const navigate = useNavigate();

  const fileRef =
    useRef<HTMLInputElement>(null);

  const [photo, setPhoto] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [form, setForm] = useState({
    fullName: "",
    age: "",
    gender: "",
    disability: "",
    learningLevel: "",
    facp: "",
    guardian: "",
    phone: "",
    address: "",
  });

  /* =======================================================
     SET FORM
  ======================================================= */

  const set =
    (k: keyof typeof form) =>
    (v: string) => {
      setForm((prev) => ({
        ...prev,
        [k]: v,
      }));

      setError("");
    };

  /* =======================================================
     PHOTO
  ======================================================= */

  function handlePhoto(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setPhoto(file);

    setPreview(
      URL.createObjectURL(file)
    );

    setError("");
  }

  /* =======================================================
     COMPLETION
  ======================================================= */

  const requiredFields = [
    form.fullName,
    form.age,
    form.gender,
    form.disability,
    form.learningLevel,
    form.guardian,
    form.phone,
  ];

  const completed =
    requiredFields.filter(Boolean)
      .length;

  const completion = Math.round(
    (completed /
      requiredFields.length) *
      100
  );

  /* =======================================================
     SAVE
  ======================================================= */

  async function handleSave(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");

    if (!form.fullName.trim()) {
      setError(
        "Please enter the student's name."
      );
      return;
    }

    if (!form.age) {
      setError(
        "Please enter the student's age."
      );
      return;
    }

    if (!form.gender) {
      setError(
        "Please select a gender."
      );
      return;
    }

    if (!form.disability) {
      setError(
        "Please select a disability level."
      );
      return;
    }

    if (!form.learningLevel) {
      setError(
        "Please select the learning level."
      );
      return;
    }

    if (!form.guardian.trim()) {
      setError(
        "Please enter the guardian name."
      );
      return;
    }

    if (!form.phone.trim()) {
      setError(
        "Please enter the guardian phone number."
      );
      return;
    }

    try {
      setSaving(true);

      const formData =
        new FormData();

      formData.append(
        "fullName",
        form.fullName
      );

      formData.append(
        "age",
        String(form.age)
      );

      const dob = new Date();

      dob.setFullYear(
        dob.getFullYear() -
          Number(form.age)
      );

      formData.append(
        "dateOfBirth",
        dob.toISOString()
      );

      formData.append(
        "gender",
        form.gender
      );

      formData.append(
        "disabilityLevel",
        form.disability
      );

      formData.append(
        "learningLevel",
        form.learningLevel
      );

      formData.append(
        "facpBaseline",
        form.facp || "0"
      );

      formData.append(
        "guardianName",
        form.guardian
      );

      formData.append(
        "guardianPhone",
        form.phone
      );

      formData.append(
        "address",
        form.address
      );

      if (photo) {
        formData.append(
          "photo",
          photo
        );
      }

      await API.post(
        "/",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setSuccess(true);

      setTimeout(() => {
        navigate("/students");
      }, 1200);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          "Unable to save student."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 75% 0%,rgba(124,58,237,.17),transparent 30%),radial-gradient(circle at 10% 70%,rgba(6,182,212,.08),transparent 30%),#070B24",
        color: "#fff",
        fontFamily: P,
      }}
    >
      {/* =================================================
          ANIMATIONS
      ================================================= */}

      <style>{`
        @keyframes addStudentStar {
          0%,100% {
            opacity:.2;
            transform:scale(.8);
          }

          50% {
            opacity:.9;
            transform:scale(1.25);
          }
        }

        @keyframes addStudentSpin {
          to {
            transform:rotate(360deg);
          }
        }

        .add-student-star {
          animation:
            addStudentStar
            3s
            ease-in-out
            infinite;
        }

        input::placeholder,
        textarea::placeholder {
          color:rgba(148,163,184,.38);
        }

        select option {
          background:#111936;
          color:white;
        }
      `}</style>

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents:
            "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        {[
          ["7%", "12%", "✦"],
          ["15%", "72%", "✧"],
          ["26%", "20%", "·"],
          ["35%", "84%", "✦"],
          ["46%", "11%", "✧"],
          ["56%", "78%", "·"],
          ["66%", "18%", "✦"],
          ["77%", "88%", "✧"],
          ["86%", "29%", "·"],
          ["95%", "65%", "✦"],
        ].map(
          (
            [left, top, symbol],
            index
          ) => (
            <span
              key={index}
              className="add-student-star"
              style={{
                position:
                  "absolute",
                left,
                top,
                color:
                  index % 2 === 0
                    ? "#A78BFA"
                    : "#67E8F9",
                fontSize:
                  index % 3 === 0
                    ? 14
                    : 9,
                animationDelay:
                  `${index * .25}s`,
              }}
            >
              {symbol}
            </span>
          )
        )}

        <div
          style={{
            position:
              "absolute",
            right: -200,
            top: 120,
            width: 500,
            height: 500,
            borderRadius:
              "50%",
            background:
              "radial-gradient(circle,rgba(124,58,237,.13),transparent 70%)",
            filter:
              "blur(20px)",
          }}
        />

        <div
          style={{
            position:
              "absolute",
            left: -220,
            bottom: -180,
            width: 500,
            height: 500,
            borderRadius:
              "50%",
            background:
              "radial-gradient(circle,rgba(6,182,212,.09),transparent 70%)",
            filter:
              "blur(20px)",
          }}
        />
      </div>

      {/* =================================================
          LAYOUT
      ================================================= */}

      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          position:
            "relative",
          zIndex: 2,
        }}
      >
        <Sidebar active="Students" />

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <TopBar
            title="Add New Student"
            subtitle="Create a new learner profile in the Learning Galaxy"
          />

          <main
            style={{
              padding:
                "25px 30px 60px",
            }}
          >
            <div
              style={{
                maxWidth: 1100,
                margin: "0 auto",
              }}
            >
              {/* =================================================
                  BREADCRUMB
              ================================================= */}

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  marginBottom:
                    18,
                  fontSize: 15,
                }}
              >
                <Link
                  to="/students"
                  style={{
                    color:
                      "#67E8F9",
                    textDecoration:
                      "none",
                    fontWeight:
                      700,
                  }}
                >
                  Students
                </Link>

                <span
                  style={{
                    color:
                      "#475569",
                  }}
                >
                  /
                </span>

                <span
                  style={{
                    color:
                      "#94A3B8",
                  }}
                >
                  New Learner
                </span>
              </div>

              {/* =================================================
                  PAGE HEADER
              ================================================= */}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    20,
                }}
              >
                <div>
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
                        fontSize: 32,
                      }}
                    >
                      🧑‍🚀
                    </span>

                    <h1
                      style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight:
                          800,
                      }}
                    >
                      Create Learner
                    </h1>
                  </div>

                  <p
                    style={{
                      margin:
                        "5px 0 0 36px",
                      fontSize: 15,
                      color:
                        "#64748B",
                    }}
                  >
                    Register a new student
                    and launch their
                    adaptive learning
                    journey.
                  </p>
                </div>

                {/* Completion */}

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      textAlign:
                        "right",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748B",
                        fontSize: 15,
                        fontWeight:
                          700,
                      }}
                    >
                      PROFILE READY
                    </div>

                    <strong
                      style={{
                        color:
                          "#67E8F9",
                        fontSize: 19,
                      }}
                    >
                      {completion}%
                    </strong>
                  </div>

                  <div
                    style={{
                      width: 75,
                      height: 6,
                      borderRadius:
                        99,
                      background:
                        "rgba(255,255,255,.07)",
                      overflow:
                        "hidden",
                    }}
                  >
                    <motion.div
                      animate={{
                        width: `${completion}%`,
                      }}
                      style={{
                        height:
                          "100%",
                        borderRadius:
                          99,
                        background:
                          "linear-gradient(90deg,#1565C0,#7C3AED,#06B6D4)",
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* =================================================
                  FORM
              ================================================= */}

              <motion.form
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.08,
                }}
                onSubmit={handleSave}
              >
                {/* =================================================
                    PHOTO CARD
                ================================================= */}

                <section
                  style={{
                    background:
                      "rgba(15,23,55,.84)",
                    border:
                      "1px solid rgba(139,92,246,.15)",
                    borderRadius: 22,
                    padding: 22,
                    marginBottom:
                      15,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 20,
                  }}
                >
                  <div
                    onClick={() =>
                      fileRef.current?.click()
                    }
                    style={{
                      position:
                        "relative",
                      width: 105,
                      height: 105,
                      flexShrink: 0,
                      borderRadius:
                        22,
                      border:
                        "2px dashed rgba(103,232,249,.3)",
                      background:
                        "rgba(6,182,212,.045)",
                      overflow:
                        "hidden",
                      display:
                        "grid",
                      placeItems:
                        "center",
                      cursor:
                        "pointer",
                    }}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Student"
                        style={{
                          width:
                            "100%",
                          height:
                            "100%",
                          objectFit:
                            "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          textAlign:
                            "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 28,
                          }}
                        >
                          📷
                        </div>

                        <div
                          style={{
                            color:
                              "#64748B",
                            fontSize: 15,
                            marginTop: 4,
                          }}
                        >
                          ADD PHOTO
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={
                      handlePhoto
                    }
                  />

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight:
                          800,
                        color:
                          "#F8FAFC",
                      }}
                    >
                      Student Identity
                    </div>

                    <p
                      style={{
                        color:
                          "#64748B",
                        fontSize: 16,
                        lineHeight:
                          1.6,
                        margin:
                          "5px 0 10px",
                      }}
                    >
                      Add a profile image
                      to make this learner
                      easier to identify
                      throughout the
                      Learning Galaxy.
                    </p>

                    <motion.button
                      type="button"
                      whileHover={{
                        scale: 1.03,
                      }}
                      whileTap={{
                        scale: 0.97,
                      }}
                      onClick={() =>
                        fileRef.current?.click()
                      }
                      style={{
                        padding:
                          "8px 13px",
                        borderRadius:
                          10,
                        border:
                          "1px solid rgba(103,232,249,.2)",
                        background:
                          "rgba(6,182,212,.08)",
                        color:
                          "#67E8F9",
                        fontFamily: P,
                        fontSize: 16,
                        fontWeight:
                          700,
                        cursor:
                          "pointer",
                      }}
                    >
                      📸{" "}
                      {preview
                        ? "Change Photo"
                        : "Choose Photo"}
                    </motion.button>
                  </div>

                  <div
                    style={{
                      textAlign:
                        "center",
                      minWidth: 90,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 25,
                      }}
                    >
                      ✦
                    </div>

                    <div
                      style={{
                        color:
                          "#475569",
                        fontSize: 15,
                      }}
                    >
                      LEARNER
                      <br />
                      AVATAR
                    </div>
                  </div>
                </section>

                {/* =================================================
                    PERSONAL INFORMATION
                ================================================= */}

                <Section
                  icon="👤"
                  title="Personal Information"
                  subtitle="Basic learner identity details"
                >
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2,1fr)",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        gridColumn:
                          "1 / -1",
                      }}
                    >
                      <Field
                        label="STUDENT FULL NAME"
                        id="fullName"
                        value={
                          form.fullName
                        }
                        onChange={set(
                          "fullName"
                        )}
                        required
                        icon="person"
                      />
                    </div>

                    <Field
                      label="AGE"
                      id="age"
                      type="number"
                      value={
                        form.age
                      }
                      onChange={set(
                        "age"
                      )}
                      required
                      icon="cake"
                    />

                    <Field
                      label="GENDER"
                      id="gender"
                      value={
                        form.gender
                      }
                      onChange={set(
                        "gender"
                      )}
                      options={[
                        "Male",
                        "Female",
                        "Other",
                      ]}
                      required
                      icon="wc"
                    />
                  </div>
                </Section>

                {/* =================================================
                    LEARNING PROFILE
                ================================================= */}

                <Section
                  icon="🧠"
                  title="Learning Profile"
                  subtitle="Adaptive learning configuration"
                >
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2,1fr)",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="DISABILITY LEVEL"
                      id="disability"
                      value={
                        form.disability
                      }
                      onChange={set(
                        "disability"
                      )}
                      options={[
                        "Mild",
                        "Moderate",
                        "Severe",
                        "Profound",
                      ]}
                      required
                      icon="psychology"
                    />

                    <Field
                      label="LEARNING LEVEL"
                      id="learningLevel"
                      value={
                        form.learningLevel
                      }
                      onChange={set(
                        "learningLevel"
                      )}
                      options={[
                        "Beginner",
                        "Intermediate",
                        "Advanced",
                      ]}
                      required
                      icon="school"
                    />

                    <Field
                      label="FACP BASELINE SCORE"
                      id="facp"
                      type="number"
                      value={
                        form.facp
                      }
                      onChange={set(
                        "facp"
                      )}
                      icon="analytics"
                    />

                    <div
                      style={{
                        padding:
                          "11px 13px",
                        borderRadius:
                          12,
                        background:
                          "rgba(124,58,237,.06)",
                        border:
                          "1px solid rgba(139,92,246,.12)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          color:
                            "#64748B",
                          fontWeight:
                            700,
                          marginBottom:
                            7,
                        }}
                      >
                        INITIAL LEARNING STATE
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 18,
                          }}
                        >
                          🚀
                        </span>

                        <span
                          style={{
                            color:
                              "#C4B5FD",
                            fontSize: 15,
                            fontWeight:
                              700,
                          }}
                        >
                          Ready for
                          adaptation
                        </span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* =================================================
                    GUARDIAN
                ================================================= */}

                <Section
                  icon="👨‍👩‍👧"
                  title="Guardian Information"
                  subtitle="Parent or guardian contact details"
                >
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="GUARDIAN NAME"
                      id="guardian"
                      value={
                        form.guardian
                      }
                      onChange={set(
                        "guardian"
                      )}
                      required
                      icon="person"
                    />

                    <Field
                      label="PHONE NUMBER"
                      id="phone"
                      type="tel"
                      value={
                        form.phone
                      }
                      onChange={set(
                        "phone"
                      )}
                      required
                      icon="phone"
                    />

                    <div
                      style={{
                        gridColumn:
                          "1 / -1",
                      }}
                    >
                      <Field
                        label="ADDRESS"
                        id="address"
                        type="textarea"
                        value={
                          form.address
                        }
                        onChange={set(
                          "address"
                        )}
                        icon="location_on"
                      />
                    </div>
                  </div>
                </Section>

                {/* =================================================
                    ERROR
                ================================================= */}

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -5,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      exit={{
                        opacity: 0,
                      }}
                      style={{
                        marginBottom: 15,
                        padding:
                          "11px 14px",
                        borderRadius:
                          11,
                        background:
                          "rgba(239,68,68,.08)",
                        border:
                          "1px solid rgba(239,68,68,.18)",
                        color:
                          "#FCA5A5",
                        fontSize: 15,
                        fontWeight:
                          600,
                      }}
                    >
                      ⚠ {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* =================================================
                    SUCCESS
                ================================================= */}

                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      style={{
                        marginBottom: 15,
                        padding:
                          "14px",
                        borderRadius:
                          12,
                        textAlign:
                          "center",
                        background:
                          "rgba(34,197,94,.08)",
                        border:
                          "1px solid rgba(74,222,128,.2)",
                        color:
                          "#4ADE80",
                        fontSize: 15,
                        fontWeight:
                          700,
                      }}
                    >
                      ✨ Learner profile
                      created successfully.
                      Launching learner
                      dashboard...
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* =================================================
                    ACTIONS
                ================================================= */}

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    gap: 10,
                  }}
                >
                  <Link
                    to="/students"
                    style={{
                      textDecoration:
                        "none",
                    }}
                  >
                    <motion.button
                      type="button"
                      whileHover={{
                        y: -2,
                      }}
                      whileTap={{
                        scale: 0.97,
                      }}
                      style={{
                        padding:
                          "11px 18px",
                        borderRadius:
                          12,
                        border:
                          "1px solid rgba(148,163,184,.18)",
                        background:
                          "rgba(255,255,255,.035)",
                        color:
                          "#94A3B8",
                        fontFamily: P,
                        fontSize: 15,
                        fontWeight:
                          700,
                        cursor:
                          "pointer",
                      }}
                    >
                      ← Cancel
                    </motion.button>
                  </Link>

                  <motion.button
                    type="submit"
                    disabled={
                      saving ||
                      success
                    }
                    whileHover={
                      !saving
                        ? {
                            scale: 1.02,
                            y: -2,
                          }
                        : undefined
                    }
                    whileTap={
                      !saving
                        ? {
                            scale: 0.97,
                          }
                        : undefined
                    }
                    style={{
                      minWidth: 170,
                      padding:
                        "11px 20px",
                      border: 0,
                      borderRadius:
                        12,
                      background:
                        saving
                          ? "rgba(124,58,237,.4)"
                          : "linear-gradient(90deg,#1565C0,#7C3AED,#06B6D4)",
                      color: "#fff",
                      fontFamily: P,
                      fontSize: 15,
                      fontWeight:
                        800,
                      cursor:
                        saving
                          ? "wait"
                          : "pointer",
                      boxShadow:
                        "0 8px 25px rgba(124,58,237,.22)",
                    }}
                  >
                    {saving ? (
                      <span
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius:
                              "50%",
                            border:
                              "2px solid rgba(255,255,255,.3)",
                            borderTopColor:
                              "#fff",
                            animation:
                              "addStudentSpin .7s linear infinite",
                          }}
                        />

                        Creating Learner...
                      </span>
                    ) : (
                      <>
                        🚀 Launch Learner
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SECTION
========================================================= */

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      style={{
        background:
          "rgba(15,23,55,.84)",
        border:
          "1px solid rgba(139,92,246,.15)",
        borderRadius: 22,
        padding: 22,
        marginBottom: 15,
        boxShadow:
          "0 15px 40px rgba(0,0,0,.14)",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap: 9,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            display:
              "grid",
            placeItems:
              "center",
            background:
              "rgba(124,58,237,.09)",
            border:
              "1px solid rgba(139,92,246,.14)",
            fontSize: 17,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              color:
                "#F8FAFC",
              fontSize: 16,
              fontWeight:
                800,
            }}
          >
            {title}
          </div>

          <div
            style={{
              color:
                "#64748B",
              fontSize: 16,
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      {children}
    </motion.section>
  );
}
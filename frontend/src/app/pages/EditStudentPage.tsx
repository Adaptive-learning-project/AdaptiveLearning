import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router";
import { motion, AnimatePresence } from "motion/react";
import API from "../api/studentApi";
import {
  Sidebar,
  TopBar,
} from "./DashboardPage";

const P = "Poppins, sans-serif";

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  icon?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#CBD5E1",
          fontFamily: P,
          fontWeight: 700,
          fontSize: 15,
          marginBottom: 7,
        }}
      >
        {icon && (
          <span
            className="material-icons-round"
            style={{
              color: "#67E8F9",
              fontSize: 18,
            }}
          >
            {icon}
          </span>
        )}

        {label}
      </label>

      {options ? (
        <select
          id={id}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 12px",
            borderRadius: 12,
            border:
              "1px solid rgba(148,163,184,.16)",
            background:
              "rgba(255,255,255,.045)",
            color: "#F8FAFC",
            fontFamily: P,
            fontSize: 17,
            outline: "none",
          }}
        >
          <option
            value=""
            style={{
              background: "#111936",
            }}
          >
            Select
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
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 12px",
            borderRadius: 12,
            border:
              "1px solid rgba(148,163,184,.16)",
            background:
              "rgba(255,255,255,.045)",
            color: "#F8FAFC",
            fontFamily: P,
            fontSize: 17,
            outline: "none",
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   EDIT STUDENT PAGE
========================================================= */

export default function EditStudentPage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const fileRef =
    useRef<HTMLInputElement>(null);

  const [photo, setPhoto] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

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
      setMessage("");
    };

  /* =======================================================
     LOAD STUDENT
  ======================================================= */

  useEffect(() => {
    loadStudent();
  }, [id]);

  async function loadStudent() {
    try {
      setLoading(true);

      const res =
        await API.get(`/${id}`);

      const s = res.data;

      setForm({
        fullName: s.name || "",
        age:
          s.age !== undefined
            ? String(s.age)
            : "",
        gender: s.gender || "",
        disability:
          s.disabilityLevel || "",
        learningLevel:
          s.learningLevel || "",
        facp:
          s.facpScore !== undefined
            ? String(s.facpScore)
            : "",
        guardian:
          s.guardianName || "",
        phone:
          s.guardianPhone || "",
        address:
          s.address || "",
      });

      if (s.photo) {
        setPreview(
          `http://localhost:5000${s.photo}`
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load student information."
      );
    } finally {
      setLoading(false);
    }
  }

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

    setMessage("");
    setError("");
  }

  /* =======================================================
     FORM COMPLETION
  ======================================================= */

  const fields = [
    form.fullName,
    form.age,
    form.gender,
    form.disability,
    form.learningLevel,
    form.facp,
    form.guardian,
    form.phone,
    form.address,
  ];

  const completed =
    fields.filter(Boolean).length;

  const completion = Math.round(
    (completed / fields.length) *
      100
  );

  /* =======================================================
     UPDATE
  ======================================================= */

  async function handleUpdate(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

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
        form.facp
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

      await API.put(
        `/${id}`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setMessage(
        "Student profile updated successfully."
      );

      setTimeout(() => {
        navigate("/students");
      }, 1200);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to update student. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#070B24",
          display: "grid",
          placeItems: "center",
          color: "#67E8F9",
          fontFamily: P,
        }}
      >
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          style={{
            textAlign: "center",
          }}
        >
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              fontSize: 48,
              marginBottom: 12,
            }}
          >
            🪐
          </motion.div>

          <div
            style={{
              fontWeight: 800,
              fontSize: 17,
            }}
          >
            Loading learner profile...
          </div>
        </motion.div>
      </div>
    );
  }

  /* =======================================================
     MAIN
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
          GALAXY ANIMATION
      ================================================= */}

      <style>{`
        @keyframes editStar {
          0%,100% {
            opacity:.2;
            transform:scale(.8);
          }

          50% {
            opacity:.9;
            transform:scale(1.25);
          }
        }

        @keyframes editPlanet {
          0%,100% {
            transform:translateY(0) rotate(-4deg);
          }

          50% {
            transform:translateY(-8px) rotate(4deg);
          }
        }

        .edit-star {
          animation:
            editStar
            3s
            ease-in-out
            infinite;
        }

        .edit-planet {
          animation:
            editPlanet
            4s
            ease-in-out
            infinite;
        }

        input::placeholder {
          color:rgba(148,163,184,.4);
        }

        select option {
          background:#111936;
          color:white;
        }
      `}</style>

      {/* =================================================
          BACKGROUND STARS
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
              className="edit-star"
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
            right: -180,
            top: 150,
            width: 450,
            height: 450,
            borderRadius:
              "50%",
            background:
              "radial-gradient(circle,rgba(124,58,237,.13),transparent 70%)",
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
            title="Edit Student"
            subtitle="Update learner profile and adaptive learning information"
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
                  gap: 8,
                  alignItems:
                    "center",
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
                  Edit Profile
                </span>
              </div>

              {/* =================================================
                  HEADER
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
                        fontSize: 31,
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
                        color:
                          "#F8FAFC",
                      }}
                    >
                      Edit Learner
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
                    Update the learner's
                    profile inside the
                    Learning Galaxy.
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
                        fontSize: 13,
                        fontWeight:
                          700,
                      }}
                    >
                      PROFILE COMPLETION
                    </div>

                    <strong
                      style={{
                        color:
                          "#67E8F9",
                        fontSize: 17,
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
                        height: "100%",
                        borderRadius:
                          99,
                        background:
                          "linear-gradient(90deg,#1565C0,#8B5CF6,#06B6D4)",
                      }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* =================================================
                  FORM CARD
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
                onSubmit={
                  handleUpdate
                }
                style={{
                  background:
                    "rgba(15,23,55,.84)",
                  border:
                    "1px solid rgba(139,92,246,.15)",
                  borderRadius: 24,
                  padding: 25,
                  boxShadow:
                    "0 18px 45px rgba(0,0,0,.22)",
                }}
              >
                {/* =================================================
                    PROFILE SECTION
                ================================================= */}

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "190px 1fr",
                    gap: 25,
                    marginBottom:
                      25,
                  }}
                >
                  {/* PHOTO */}

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        position:
                          "relative",
                        width: 145,
                        height: 145,
                      }}
                    >
                      <motion.div
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 18,
                          repeat:
                            Infinity,
                          ease: "linear",
                        }}
                        style={{
                          position:
                            "absolute",
                          inset: -8,
                          borderRadius:
                            "50%",
                          border:
                            "1px dashed rgba(103,232,249,.4)",
                        }}
                      />

                      <img
                        src={
                          preview ||
                          "https://placehold.co/160x160"
                        }
                        alt="Student"
                        style={{
                          width: 145,
                          height: 145,
                          borderRadius:
                            "50%",
                          objectFit:
                            "cover",
                          border:
                            "4px solid #111936",
                          boxShadow:
                            "0 0 30px rgba(124,58,237,.25)",
                        }}
                      />

                      <div
                        style={{
                          position:
                            "absolute",
                          right: 2,
                          bottom: 5,
                          width: 31,
                          height: 31,
                          borderRadius:
                            "50%",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          background:
                            "linear-gradient(135deg,#7C3AED,#06B6D4)",
                          border:
                            "3px solid #0F1737",
                          fontSize: 17,
                        }}
                      >
                        📷
                      </div>
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={
                        handlePhoto
                      }
                    />

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
                        marginTop: 17,
                        padding:
                          "9px 14px",
                        borderRadius:
                          11,
                        border:
                          "1px solid rgba(103,232,249,.2)",
                        background:
                          "rgba(6,182,212,.08)",
                        color:
                          "#67E8F9",
                        fontFamily: P,
                        fontSize: 15,
                        fontWeight:
                          700,
                        cursor:
                          "pointer",
                      }}
                    >
                      📸 Change Photo
                    </motion.button>

                    <span
                      style={{
                        marginTop: 7,
                        color:
                          "#475569",
                        fontSize: 13,
                      }}
                    >
                      JPG / PNG
                    </span>
                  </div>

                  {/* BASIC FIELDS */}

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2,1fr)",
                      gap: 14,
                      alignContent:
                        "start",
                    }}
                  >
                    <Field
                      label="FULL NAME"
                      id="name"
                      value={
                        form.fullName
                      }
                      onChange={set(
                        "fullName"
                      )}
                      icon="person"
                    />

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
                      icon="wc"
                    />

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
                      icon="psychology"
                    />
                  </div>
                </div>

                {/* =================================================
                    LEARNING INFORMATION
                ================================================= */}

                <div
                  style={{
                    borderTop:
                      "1px solid rgba(255,255,255,.06)",
                    paddingTop: 22,
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                      marginBottom:
                        15,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                      }}
                    >
                      🧠
                    </span>

                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight:
                            800,
                          color:
                            "#F8FAFC",
                        }}
                      >
                        Learning Profile
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          color:
                            "#64748B",
                        }}
                      >
                        Adaptive learning
                        configuration
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr 1fr",
                      gap: 14,
                    }}
                  >
                    <Field
                      label="LEARNING LEVEL"
                      id="learning"
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
                      icon="school"
                    />

                    <Field
                      label="FACP SCORE"
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
                          "10px 13px",
                        borderRadius:
                          13,
                        background:
                          "rgba(124,58,237,.07)",
                        border:
                          "1px solid rgba(139,92,246,.12)",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#94A3B8",
                          fontSize: 15,
                          marginBottom:
                            5,
                        }}
                      >
                        CURRENT FACP
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 10,
                        }}
                      >
                        <strong
                          style={{
                            color:
                              "#C4B5FD",
                            fontSize: 20,
                          }}
                        >
                          {form.facp ||
                            "0"}
                        </strong>

                        <div
                          style={{
                            flex: 1,
                            height: 5,
                            borderRadius:
                              99,
                            background:
                              "rgba(255,255,255,.07)",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(
                                Number(
                                  form.facp
                                ) || 0,
                                100
                              )}%`,
                              height:
                                "100%",
                              borderRadius:
                                99,
                              background:
                                "linear-gradient(90deg,#7C3AED,#06B6D4)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    GUARDIAN
                ================================================= */}

                <div
                  style={{
                    borderTop:
                      "1px solid rgba(255,255,255,.06)",
                    paddingTop: 22,
                    marginBottom: 22,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 8,
                      marginBottom:
                        15,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                      }}
                    >
                      👨‍👩‍👧
                    </span>

                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight:
                            800,
                          color:
                            "#F8FAFC",
                        }}
                      >
                        Guardian Information
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          color:
                            "#64748B",
                        }}
                      >
                        Parent / guardian
                        contact details
                      </div>
                    </div>
                  </div>

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
                      icon="person"
                    />

                    <Field
                      label="PHONE"
                      id="phone"
                      value={
                        form.phone
                      }
                      onChange={set(
                        "phone"
                      )}
                      icon="phone"
                    />
                  </div>
                </div>

                {/* =================================================
                    ADDRESS
                ================================================= */}

                <div
                  style={{
                    borderTop:
                      "1px solid rgba(255,255,255,.06)",
                    paddingTop: 22,
                    marginBottom: 22,
                  }}
                >
                  <Field
                    label="ADDRESS"
                    id="address"
                    value={
                      form.address
                    }
                    onChange={set(
                      "address"
                    )}
                    icon="location_on"
                  />
                </div>

                {/* =================================================
                    MESSAGE
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
                          "10px 13px",
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

                  {message && (
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
                          "10px 13px",
                        borderRadius:
                          11,
                        background:
                          "rgba(34,197,94,.08)",
                        border:
                          "1px solid rgba(74,222,128,.18)",
                        color:
                          "#4ADE80",
                        fontSize: 15,
                        fontWeight:
                          700,
                      }}
                    >
                      ✓ {message}
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
                    paddingTop: 4,
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
                          "rgba(255,255,255,.04)",
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
                    disabled={saving}
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
                      minWidth: 165,
                      padding:
                        "11px 18px",
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
                      cursor: saving
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
                              "editSpin .7s linear infinite",
                          }}
                        />

                        Updating Galaxy...
                      </span>
                    ) : (
                      <>
                        🚀 Update Student
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            </div>
          </main>
        </div>
      </div>

      <style>{`
        @keyframes editSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .edit-profile-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
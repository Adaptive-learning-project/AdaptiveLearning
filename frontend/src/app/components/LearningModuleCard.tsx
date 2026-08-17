import { motion } from "motion/react";
import { useNavigate } from "react-router";

interface LearningModule {
  moduleId: string;
  title: string;
  description: string;
  category: string;
  skill: string;
  level: string;
  duration: number;
  icon: string;
  color: string;
}

interface Props {
  module: LearningModule;
}

export default function LearningModuleCard({
  module,
}: Props) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{
        y: -5,
        boxShadow: "0 14px 35px rgba(21,101,192,0.15)",
      }}
      className="rounded-3xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid rgba(21,101,192,0.08)",
        boxShadow: "0 3px 15px rgba(21,101,192,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="p-6"
        style={{
          background: `${module.color}12`,
        }}
      >
        <div
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: 54,
            height: 54,
            background: module.color,
          }}
        >
          <span
            className="material-icons-round text-white"
            style={{ fontSize: 27 }}
          >
            {module.icon}
          </span>
        </div>

        <div
          className="mt-4 inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: `${module.color}18`,
            color: module.color,
          }}
        >
          {module.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#0D2137",
          }}
        >
          {module.title}
        </h3>

        <p
          className="mt-2"
          style={{
            fontFamily: "Poppins, sans-serif",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#607D8B",
          }}
        >
          {module.description}
        </p>

        <div className="flex gap-2 mt-4 flex-wrap">
          <span
            className="px-3 py-1 rounded-full text-xs"
            style={{
              background: "#F0F6FF",
              color: "#1565C0",
            }}
          >
            {module.skill}
          </span>

          <span
            className="px-3 py-1 rounded-full text-xs"
            style={{
              background: "#F5F5F5",
              color: "#546E7A",
            }}
          >
            {module.level}
          </span>

          <span
            className="px-3 py-1 rounded-full text-xs"
            style={{
              background: "#F5F5F5",
              color: "#546E7A",
            }}
          >
            {module.duration} min
          </span>
        </div>

        <button
          onClick={() =>
            navigate(`/learning-modules/${module.moduleId}`)
          }
          className="w-full mt-5 py-3 rounded-xl"
          style={{
            background: module.color,
            border: "none",
            color: "#fff",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View Module
          <span
            className="material-icons-round"
            style={{
              fontSize: 16,
              verticalAlign: "middle",
              marginLeft: 6,
            }}
          >
            arrow_forward
          </span>
        </button>
      </div>
    </motion.div>
  );
}
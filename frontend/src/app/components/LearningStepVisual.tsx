import { motion } from "motion/react";

interface Props {
  emoji?: string;
  image?: string;
  color: string;
  completed?: boolean;
}

export default function LearningStepVisual({
  emoji,
  image,
  color,
  completed,
}: Props) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      transition={{
        duration: 0.4,
        type: "spring",
      }}
      className="relative flex items-center justify-center mx-auto overflow-hidden rounded-[32px]"
      style={{
        width: "min(320px, 80vw)",
        height: 250,
        background: `linear-gradient(135deg, ${color}15, ${color}30)`,
        border: `3px solid ${color}20`,
      }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: 25,
          }}
        />
      ) : (
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [-2, 2, -2],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            fontSize: 120,
            lineHeight: 1,
          }}
        >
          {emoji || "🌱"}
        </motion.div>
      )}

      {completed && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-4 top-4 flex items-center justify-center rounded-full"
          style={{
            width: 52,
            height: 52,
            background: "#27AE60",
            color: "#fff",
            fontSize: 28,
          }}
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  );
}
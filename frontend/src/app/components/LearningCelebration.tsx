import { motion } from "motion/react";

interface Props {
  color: string;
}

export default function LearningCelebration({
  color,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,.82)",
        backdropFilter: "blur(8px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center rounded-[36px] p-10"
        style={{
          background: "#fff",
          boxShadow: "0 20px 70px rgba(21,101,192,.2)",
        }}
      >
        <motion.div
          animate={{
            rotate: [0, -10, 10, -10, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 1,
            repeat: 2,
          }}
          style={{
            fontSize: 90,
          }}
        >
          🌟
        </motion.div>

        <h2
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 800,
            fontSize: 28,
            color: "#0D2137",
            marginTop: 15,
          }}
        >
          Great Job! 🎉
        </h2>

        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            color: "#607D8B",
            marginTop: 8,
          }}
        >
          You completed the activity!
        </p>

        <div
          className="mx-auto mt-5 rounded-full"
          style={{
            width: 70,
            height: 6,
            background: color,
          }}
        />
      </motion.div>
    </div>
  );
}
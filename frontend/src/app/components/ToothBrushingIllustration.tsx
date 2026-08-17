import { motion } from "motion/react";

interface Props {
  step: number;
  className?: string;
}

/**
 * Real pictorial assets for the ADL - Brushing Teeth module.
 * Each image is an action-specific illustration generated for LearnAble.
 * Assets live in frontend/public/learning/brushing/ so Vite serves them directly.
 */
const BRUSHING_IMAGES = [
  "/learning/brushing/step1.png",
  "/learning/brushing/step2.png",
  "/learning/brushing/step3.png",
  "/learning/brushing/step4.png",
  "/learning/brushing/step5.png",
  "/learning/brushing/step6.png",
];

const STEP_LABELS = [
  "Pick up your toothbrush",
  "Put toothpaste on your toothbrush",
  "Brush the front teeth using up and down strokes",
  "Brush the back teeth on both sides",
  "Rinse your mouth with clean water",
  "Clean your toothbrush and keep it in place",
];

export default function ToothBrushingIllustration({ step, className = "" }: Props) {
  const safeStep = Math.min(Math.max(step, 0), BRUSHING_IMAGES.length - 1);

  return (
    <motion.div
      key={safeStep}
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`w-full overflow-hidden rounded-[28px] bg-white ${className}`}
      style={{
        border: "3px solid #D7EAF7",
        boxShadow: "0 10px 30px rgba(31, 79, 121, 0.10)",
      }}
    >
      <img
        src={BRUSHING_IMAGES[safeStep]}
        alt={`Brushing teeth step ${safeStep + 1}: ${STEP_LABELS[safeStep]}`}
        className="block w-full h-auto object-cover"
        draggable={false}
      />
    </motion.div>
  );
}

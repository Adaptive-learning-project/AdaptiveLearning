import { useState } from "react";
import { motion } from "motion/react";

interface Props {
  text: string;
  color: string;
}

export default function LearningAudioButton({
  text,
  color,
}: Props) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 0.8;
    utterance.pitch = 1.1;

    utterance.onstart = () => setSpeaking(true);

    utterance.onend = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={speak}
      className="flex items-center justify-center gap-2 mx-auto rounded-full"
      style={{
        padding: "12px 20px",
        background: `${color}12`,
        color,
        border: `2px solid ${color}25`,
        fontFamily: "Poppins, sans-serif",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <span className="material-icons-round">
        {speaking ? "volume_up" : "volume_up"}
      </span>

      {speaking ? "Listening..." : "🔊 Listen"}
    </motion.button>
  );
}
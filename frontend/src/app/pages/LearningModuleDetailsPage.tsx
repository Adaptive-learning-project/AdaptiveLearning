import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar, TopBar } from "./DashboardPage";
import { getLearningModule } from "../api/learningModuleApi";
import { getStudents } from "../api/studentApi";
import { saveResult, getAdaptiveSummary } from "../api/resultApi";
import type { LearningModule } from "../types/learningModule";
import ToothBrushingIllustration from "../components/ToothBrushingIllustration";

const P = "Poppins, sans-serif";
const galaxyStyles = `
  @keyframes floatPlanet {
    0%, 100% {
      transform: translateY(0) rotate(-4deg);
    }
    50% {
      transform: translateY(-12px) rotate(4deg);
    }
  }

  @keyframes twinkle {
    0%, 100% {
      opacity: .25;
      transform: scale(.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  @keyframes pulseMission {
    0%, 100% {
      box-shadow: 0 0 0 rgba(124,58,237,0);
    }
    50% {
      box-shadow: 0 0 35px rgba(124,58,237,.35);
    }
  }

  @keyframes progressGlow {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.25);
    }
  }

  .learning-planet {
    animation: floatPlanet 4s ease-in-out infinite;
  }

  .mission-button {
    animation: pulseMission 2.5s ease-in-out infinite;
  }

  .learning-progress {
    animation: progressGlow 2s ease-in-out infinite;
  }

  .galaxy-star {
    animation: twinkle 2s ease-in-out infinite;
  }
`;

const visualMap: Record<string, {
  emoji: string;
  background: string;
  accent: string;
  instruction: string;
}> = {
  "adl-brushing": {
    emoji: "🪥",
    background: "#E3F2FD",
    accent: "#1565C0",
    instruction: "Let's brush our teeth!",
  },

  "adl-combing": {
    emoji: "💇",
    background: "#F3E5F5",
    accent: "#8E44AD",
    instruction: "Let's comb our hair!",
  },

  "adl-dressing": {
    emoji: "👕",
    background: "#EDE7F6",
    accent: "#7E57C2",
    instruction: "Let's get dressed!",
  },

  "adl-buttoning": {
    emoji: "🔘",
    background: "#EDE7F6",
    accent: "#5E35B1",
    instruction: "Let's practise buttoning!",
  },

  "adl-toilet": {
    emoji: "🚽",
    background: "#E0F2F1",
    accent: "#00897B",
    instruction: "Let's follow the toilet routine!",
  },

  "adl-drinking": {
    emoji: "🥤",
    background: "#E1F5FE",
    accent: "#0288D1",
    instruction: "Let's practise drinking!",
  },

  "adl-eating": {
    emoji: "🍽️",
    background: "#FBE9E7",
    accent: "#FF7043",
    instruction: "Let's practise eating!",
  },

  "adl-grooming": {
    emoji: "🧼",
    background: "#E0F2F1",
    accent: "#26A69A",
    instruction: "Let's practise grooming!",
  },

  "academic-colours": {
    emoji: "🎨",
    background: "#FCE4EC",
    accent: "#E91E63",
    instruction: "Let's learn colours!",
  },

  "academic-numbers": {
    emoji: "🔢",
    background: "#E0F2F1",
    accent: "#26A69A",
    instruction: "Let's learn numbers!",
  },

  "academic-shapes": {
    emoji: "🔺",
    background: "#E3F2FD",
    accent: "#1565C0",
    instruction: "Let's learn shapes!",
  },

  "academic-time": {
    emoji: "⏰",
    background: "#E8EAF6",
    accent: "#3949AB",
    instruction: "Let's learn about time!",
  },

  "academic-money": {
    emoji: "💰",
    background: "#E8F5E9",
    accent: "#43A047",
    instruction: "Let's learn about money!",
  },

  "academic-reading": {
    emoji: "📖",
    background: "#FFF3E0",
    accent: "#EF6C00",
    instruction: "Let's practise reading!",
  },

  "academic-alphabet": {
    emoji: "🔤",
    background: "#F3E5F5",
    accent: "#AB47BC",
    instruction: "Let's learn letters!",
  },

  "academic-prewriting": {
    emoji: "✏️",
    background: "#FFF8E1",
    accent: "#FFA000",
    instruction: "Let's practise writing!",
  },

  "motor-fine": {
    emoji: "🤲",
    background: "#E8EAF6",
    accent: "#5C6BC0",
    instruction: "Let's practise our hands!",
  },

  "motor-coordination": {
    emoji: "👀",
    background: "#E0F7FA",
    accent: "#00ACC1",
    instruction: "Let's practise coordination!",
  },

  "motor-gross": {
    emoji: "🏃",
    background: "#E8F5E9",
    accent: "#43A047",
    instruction: "Let's move our body!",
  },

  "motor-physical": {
    emoji: "🤸",
    background: "#F1F8E9",
    accent: "#7CB342",
    instruction: "Let's exercise!",
  },

  "motor-outdoor": {
    emoji: "⚽",
    background: "#E8F5E9",
    accent: "#388E3C",
    instruction: "Let's play!",
  },

  "language-vocabulary": {
    emoji: "🗣️",
    background: "#FFF3E0",
    accent: "#FB8C00",
    instruction: "Let's learn new words!",
  },

  "language-receptive": {
    emoji: "👂",
    background: "#E3F2FD",
    accent: "#1976D2",
    instruction: "Listen carefully!",
  },

  "language-expressive": {
    emoji: "💬",
    background: "#F3E5F5",
    accent: "#8E24AA",
    instruction: "Let's communicate!",
  },

  "language-story": {
    emoji: "📚",
    background: "#FFF8E1",
    accent: "#F9A825",
    instruction: "Let's tell a story!",
  },

  "language-rhymes": {
    emoji: "🎵",
    background: "#FCE4EC",
    accent: "#D81B60",
    instruction: "Let's sing!",
  },

  "language-lip-tongue": {
    emoji: "👄",
    background: "#FBE9E7",
    accent: "#E64A19",
    instruction: "Let's practise!",
  },

  "language-sign": {
    emoji: "🤟",
    background: "#E8EAF6",
    accent: "#3949AB",
    instruction: "Let's communicate with signs!",
  },

  "vocational-tools": {
    emoji: "🔧",
    background: "#EFEBE9",
    accent: "#6D4C41",
    instruction: "Let's identify tools!",
  },

  "vocational-machines": {
    emoji: "⚙️",
    background: "#ECEFF1",
    accent: "#455A64",
    instruction: "Let's identify machines!",
  },

  "vocational-leather-tracing": {
    emoji: "📐",
    background: "#EFEBE9",
    accent: "#795548",
    instruction: "Let's practise tracing!",
  },

  "vocational-stitching": {
    emoji: "🧵",
    background: "#FCE4EC",
    accent: "#AD1457",
    instruction: "Let's practise stitching!",
  },

  "vocational-leather-cutting": {
    emoji: "✂️",
    background: "#EFEBE9",
    accent: "#6D4C41",
    instruction: "Let's practise cutting!",
  },

  "vocational-leather-pasting": {
    emoji: "🧴",
    background: "#FFF3E0",
    accent: "#EF6C00",
    instruction: "Let's practise pasting!",
  },

  "vocational-leather-punching": {
    emoji: "🔨",
    background: "#EFEBE9",
    accent: "#6D4C41",
    instruction: "Let's practise punching!",
  },

  "therapeutic-yoga": {
    emoji: "🧘",
    background: "#E8F5E9",
    accent: "#43A047",
    instruction: "Let's relax and move!",
  },

  "therapeutic-music": {
    emoji: "🎵",
    background: "#FFF3E0",
    accent: "#EF6C00",
    instruction: "Let's make music!",
  },

  "therapeutic-play": {
    emoji: "🧸",
    background: "#FBE9E7",
    accent: "#FF7043",
    instruction: "Let's play together!",
  },

  "therapeutic-gardening": {
    emoji: "🌱",
    background: "#F1F8E9",
    accent: "#558B2F",
    instruction: "Let's grow something!",
  },

  "therapeutic-computer": {
    emoji: "💻",
    background: "#E3F2FD",
    accent: "#1976D2",
    instruction: "Let's learn with technology!",
  },

  "therapeutic-social": {
    emoji: "🤝",
    background: "#E0F2F1",
    accent: "#00897B",
    instruction: "Let's interact!",
  },

  "specialized-adl": {
    emoji: "🌟",
    background: "#ECEFF1",
    accent: "#455A64",
    instruction: "Let's practise together!",
  },

  "specialized-intensive": {
    emoji: "🫶",
    background: "#ECEFF1",
    accent: "#546E7A",
    instruction: "We can do this together!",
  },

  "specialized-assessment": {
    emoji: "📋",
    background: "#ECEFF1",
    accent: "#37474F",
    instruction: "Let's learn step by step!",
  },
};

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.8;
  utterance.pitch = 1.1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

function Visual({
  module,
  step,
}: {
  module: LearningModule;
  step: number;
}) {
  const visual = visualMap[module.moduleId] || {
    emoji: "🌟",
    background: "#E3F2FD",
    accent: module.color,
    instruction: "Let's learn!",
  };

  const interactiveStep = module.interactiveSteps?.[step];

  if (module.moduleId === "academic-colours") {
    const colour = ["#E53935", "#1565C0", "#FBC02D"][step % 3];
    const label = ["RED", "BLUE", "YELLOW"][step % 3];
    return (
      <motion.div key={`colour-${step}`} initial={{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} className="mx-auto rounded-[32px] flex flex-col items-center justify-center" style={{width:"min(100%, 360px)",height:250,background:"#F7FBFF",border:"4px solid #E3EDF7"}}>
        <div style={{width:120,height:120,borderRadius:"50%",background:colour,boxShadow:"0 10px 24px rgba(13,33,55,.12)",position:"relative"}}>
          <div style={{position:"absolute",width:34,height:18,borderRadius:"50%",background:"rgba(255,255,255,.25)",top:22,left:20,transform:"rotate(-25deg)"}} />
        </div>
        <div style={{marginTop:14,fontFamily:P,fontSize:24,fontWeight:900,color:colour,letterSpacing:2}}>{label}</div>
        <div style={{fontFamily:P,fontSize: 16,color:"#607D8B",marginTop:3}}>Look • Listen • Learn</div>
      </motion.div>
    );
  }

  if (module.moduleId === "adl-brushing") {
    return (
      <motion.div
        key={`brushing-${step}`}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto w-full"
      >
        <ToothBrushingIllustration step={step} />
      </motion.div>
    );
  }

  return (
    <motion.div
      key={step}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }}
      transition={{ duration: 0.7, y: { duration: 2.2, repeat: Infinity } }}
      className="mx-auto rounded-[32px] flex items-center justify-center relative overflow-hidden"
      style={{
        width: "min(100%, 360px)",
        height: 250,
        background: visual.background,
        border: `4px solid ${visual.accent}20`,
      }}
    >
      <div
        className="absolute rounded-full"
        style={{ width: 170, height: 170, background: `${visual.accent}12` }}
      />

      {interactiveStep?.image ? (
        <img
          src={interactiveStep.image}
          alt={interactiveStep.title || module.title}
          className="relative z-10 w-full h-full object-contain p-5"
        />
      ) : (
        <motion.div
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ fontSize: 145, position: "relative", zIndex: 2, userSelect: "none" }}
        >
          {interactiveStep?.emoji || visual.emoji}
        </motion.div>
      )}

      <div
        className="absolute bottom-3 left-3 right-3 rounded-2xl px-4 py-2 z-20"
        style={{
          background: "rgba(255,255,255,.92)",
          fontFamily: P,
          fontWeight: 600,
          fontSize: 19,
          color: visual.accent,
        }}
      >
        {interactiveStep?.instruction || visual.instruction}
      </div>
    </motion.div>
  );
}


const BRUSHING_QUIZ = [
  {
    question: "Which picture shows putting toothpaste on the toothbrush?",
    options: [
      { label: "Pick up the toothbrush", image: "/learning/brushing/step1.png", correct: false },
      { label: "Put toothpaste on the toothbrush", image: "/learning/brushing/step2.png", correct: true },
      { label: "Rinse your mouth", image: "/learning/brushing/step5.png", correct: false },
    ],
  },
  {
    question: "Which picture shows brushing the front teeth?",
    options: [
      { label: "Brush the front teeth", image: "/learning/brushing/step3.png", correct: true },
      { label: "Put toothpaste on the toothbrush", image: "/learning/brushing/step2.png", correct: false },
      { label: "Clean and store the toothbrush", image: "/learning/brushing/step6.png", correct: false },
    ],
  },
  {
    question: "What should you do after brushing your teeth?",
    options: [
      { label: "Pick up the toothbrush", image: "/learning/brushing/step1.png", correct: false },
      { label: "Put toothpaste on the toothbrush", image: "/learning/brushing/step2.png", correct: false },
      { label: "Rinse your mouth with clean water", image: "/learning/brushing/step5.png", correct: true },
    ],
  },
];

function BrushingPracticeCheck({
  onComplete,
}: {
  onComplete: (result: { correct: number; total: number; helpRequests: number }) => void;
}) {
  const [question, setQuestion] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [helpRequests, setHelpRequests] = useState(0);

  const current = BRUSHING_QUIZ[question];

  const choose = (index: number) => {
    if (selected !== null) return;
    setSelected(index);

    const isCorrect = current.options[index].correct;
    if (isCorrect) {
      setCorrect((value) => value + 1);
      speak("Correct! Great job!");
    } else {
      speak("Not quite. Look at the pictures and try the next one.");
    }

    window.setTimeout(() => {
      if (question === BRUSHING_QUIZ.length - 1) {
        onComplete({
          correct: correct + (isCorrect ? 1 : 0),
          total: BRUSHING_QUIZ.length,
          helpRequests,
        });
      } else {
        setQuestion((value) => value + 1);
        setSelected(null);
      }
    }, 900);
  };

  const askForHelp = () => {
    setHelpRequests((value) => value + 1);
    speak("Let's look at the pictures together. Choose the picture that matches the instruction.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[32px] p-6 md:p-8"
      style={{ background: "#fff", boxShadow: "0 10px 35px rgba(21,101,192,.09)" }}
    >
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <span
            className="inline-block px-3 py-1 rounded-full"
            style={{ background: "#E8F5E9", color: "#2E7D32", fontFamily: P, fontWeight: 700, fontSize: 15 }}
          >
            PRACTICE CHECK
          </span>
          <h2 style={{ fontFamily: P, fontSize: 26, fontWeight: 800, color: "#0D2137", marginTop: 10 }}>
            Can you remember the steps? 🧠
          </h2>
          <p style={{ fontFamily: P, fontSize: 19, color: "#607D8B", marginTop: 5 }}>
            Look carefully at each picture and choose the correct one.
          </p>
        </div>
        <div
          className="px-4 py-3 rounded-2xl text-center"
          style={{ background: "#F0F6FF", color: "#1565C0", fontFamily: P, fontWeight: 700, minWidth: 90 }}
        >
          {question + 1} / {BRUSHING_QUIZ.length}
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-6" style={{ background: "#E7EEF5" }}>
        <motion.div
          animate={{ width: `${((question + 1) / BRUSHING_QUIZ.length) * 100}%` }}
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg,#42A5F5,#66BB6A)" }}
        />
      </div>

      <h3
        className="text-center mb-6"
        style={{ fontFamily: P, fontSize: 19, fontWeight: 800, color: "#0D2137", lineHeight: 1.4 }}
      >
        {current.question}
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {current.options.map((option, index) => {
          const chosen = selected === index;
          const correctAnswer = selected !== null && option.correct;
          const wrongChoice = chosen && selected !== null && !option.correct;

          return (
            <motion.button
              key={option.label}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => choose(index)}
              disabled={selected !== null}
              className="overflow-hidden rounded-3xl text-left p-0"
              style={{
                background: correctAnswer ? "#E8F5E9" : wrongChoice ? "#FFEBEE" : "#fff",
                border: `3px solid ${correctAnswer ? "#43A047" : wrongChoice ? "#E53935" : "#D9E6F2"}`,
                cursor: selected === null ? "pointer" : "default",
                opacity: selected !== null && !correctAnswer && !wrongChoice ? 0.72 : 1,
              }}
            >
              <img
                src={option.image}
                alt={option.label}
                className="w-full aspect-[4/3] object-cover"
                draggable={false}
              />
              <div className="p-4">
                <div style={{ fontFamily: P, fontSize: 19, fontWeight: 700, color: "#263238", lineHeight: 1.4 }}>
                  {option.label}
                </div>
                {correctAnswer && <div className="mt-2" style={{ color: "#2E7D32", fontWeight: 800, fontFamily: P, fontSize: 16 }}>✓ Correct!</div>}
                {wrongChoice && <div className="mt-2" style={{ color: "#C62828", fontWeight: 800, fontFamily: P, fontSize: 16 }}>Try the next one</div>}
              </div>
            </motion.button>
          );
        })}
      </div>

      <button
        onClick={askForHelp}
        className="w-full mt-5 py-3 rounded-2xl border-0"
        style={{ background: "#FFF4E5", color: "#E65100", fontFamily: P, fontWeight: 700, cursor: "pointer" }}
      >
        🫶 I Need Help — Show Me Again
      </button>
    </motion.div>
  );
}

function ColourRecognitionPracticeCheck({ onComplete }: { onComplete: (result: { correct: number; total: number; helpRequests: number }) => void }) {
  const questions = [
    { q: "Which colour is RED?", options: ["#E53935", "#1565C0", "#FBC02D"], correct: 0 },
    { q: "Which colour is BLUE?", options: ["#FBC02D", "#1565C0", "#E53935"], correct: 1 },
    { q: "Which colour is YELLOW?", options: ["#1565C0", "#E53935", "#FBC02D"], correct: 2 },
  ];
  const [q,setQ]=useState(0); const [selected,setSelected]=useState<number|null>(null); const [correct,setCorrect]=useState(0); const [help,setHelp]=useState(0); const current=questions[q];
  const choose=(i:number)=>{if(selected!==null)return;setSelected(i);const ok=i===current.correct;if(ok){setCorrect(x=>x+1);speak("Correct! Great job!")}else speak("Try again on the next question.");window.setTimeout(()=>{if(q===questions.length-1)onComplete({correct:correct+(ok?1:0),total:questions.length,helpRequests:help});else{setQ(x=>x+1);setSelected(null)}},700)};
  return <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} className="rounded-[32px] p-6 md:p-8" style={{background:"#fff",boxShadow:"0 10px 35px rgba(21,101,192,.09)"}}><span className="inline-block px-3 py-1 rounded-full" style={{background:"#E8F5E9",color:"#2E7D32",fontFamily:P,fontWeight:700,fontSize: 15}}>PRACTICE CHECK</span><h2 style={{fontFamily:P,fontSize:23,fontWeight:800,color:"#0D2137",marginTop:10}}>{current.q}</h2><p style={{fontFamily:P,fontSize: 16,color:"#607D8B"}}>Look at the colour and choose the matching one.</p><div className="grid grid-cols-3 gap-4 mt-6">{current.options.map((c,i)=><button key={c+i} onClick={()=>choose(i)} disabled={selected!==null} style={{height:150,borderRadius:24,border:`3px solid ${selected!==null&&i===current.correct?"#43A047":selected===i?"#E53935":"#D9E6F2"}`,background:"#fff",cursor:selected===null?"pointer":"default",display:"grid",placeItems:"center"}}><span style={{width:82,height:82,borderRadius:"50%",background:c,boxShadow:"0 8px 20px rgba(13,33,55,.12)"}} /></button>)}</div><button onClick={()=>{setHelp(x=>x+1);speak("Here is a clue. Listen to the colour name again.")}} className="w-full mt-5 py-3 rounded-2xl border-0" style={{background:"#FFF4E5",color:"#E65100",fontFamily:P,fontWeight:700,cursor:"pointer"}}>🫶 I Need Help — Hear a Clue</button></motion.div>;
}

function ChoiceActivity({
  module,
  step,
  onCorrect,
}: {
  module: LearningModule;
  step: number;
  onCorrect: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const choices = useMemo(() => {
    return [
      {
        id: "yes",
        text: "I can do it!",
        emoji: "👍",
      },
      {
        id: "help",
        text: "I need help",
        emoji: "🫶",
      },
      {
        id: "again",
        text: "Show again",
        emoji: "🔁",
      },
    ];
  }, [module, step]);

  const choose = (id: string) => {
    setSelected(id);

    speak(
      id === "yes"
        ? "Great job!"
        : id === "help"
        ? "That's okay. We can help you."
        : "Let's look at the step again."
    );

    if (id === "yes") {
      window.setTimeout(onCorrect, 500);
    }
  };

  return (
    <div className="mt-6">
      <p
        className="text-center mb-4"
        style={{
          fontFamily: P,
          fontSize: 19,
          color: "#607D8B",
        }}
      >
        What would you like to do?
      </p>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        }}
      >
        {choices.map((choice) => (
          <motion.button
            key={choice.id}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => choose(choice.id)}
            className="rounded-2xl p-4 border-0"
            style={{
              background:
                selected === choice.id
                  ? `${module.color}18`
                  : "#F7FAFD",
              border:
                selected === choice.id
                  ? `2px solid ${module.color}`
                  : "2px solid transparent",
              cursor: "pointer",
              fontFamily: P,
            }}
          >
            <div style={{ fontSize: 34 }}>{choice.emoji}</div>

            <div
              className="mt-2"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#263238",
              }}
            >
              {choice.text}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Confetti() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 20 }}
    >
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            y: -20,
            x: `${(i * 37) % 100}%`,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            y: "110vh",
            rotate: 360,
            opacity: 0,
          }}
          transition={{
            duration: 2 + (i % 4) * 0.3,
            delay: (i % 5) * 0.08,
          }}
          style={{
            position: "absolute",
            width: 10,
            height: 16,
            borderRadius: 4,
            background: [
              "#1565C0",
              "#27AE60",
              "#FF7043",
              "#AB47BC",
              "#FFA726",
            ][i % 5],
          }}
        />
      ))}
    </div>
  );
}

export default function LearningModuleDetailsPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [module, setModule] = useState<LearningModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [practiceResult, setPracticeResult] = useState<{ correct: number; total: number; helpRequests: number } | null>(null);
  const [students, setStudents] = useState<Array<{ _id: string; name: string; studentCode: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [savingResult, setSavingResult] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [adaptiveSummary, setAdaptiveSummary] = useState<any>(null);
  const selectedStudentName = students.find((student) => student._id === selectedStudent)?.name || "";

  useEffect(() => {
    if (!moduleId) return;

    let mounted = true;

    setLoading(true);

    getLearningModule(moduleId)
      .then((res) => {
        if (mounted) {
          setModule(res.data);
        }
      })
      .catch((err) => {
        console.error(err);

        if (mounted) {
          setError("Unable to load this learning module.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [moduleId]);

  useEffect(() => {
    getStudents()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStudents(list);
        if (list.length && !selectedStudent) {
          setSelectedStudent(list[0]._id);
        }
      })
      .catch((err) => console.error("Unable to load students:", err));
  }, []);

  useEffect(() => {
    if (!started || completed) return;

    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [started, completed]);

  useEffect(() => {
    if (!module || !started || !soundOn || completed) return;

    speak(module.interactiveSteps?.[step]?.audioText || module.interactiveSteps?.[step]?.instruction || module.steps[step]);
  }, [module, step, started, soundOn, completed]);

  const progress = module
    ? completed
      ? 100
      : practiceStarted
      ? 92
      : Math.round((step / module.steps.length) * 85)
    : 0;

  const time = `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(seconds % 60).padStart(2, "0")}`;

  const startActivity = () => {
    setStarted(true);
    setCompleted(false);
    setPracticeStarted(false);
    setPracticeResult(null);
    setStep(0);
    setSeconds(0);

    if (module && soundOn) {
      speak(module.interactiveSteps?.[0]?.audioText || module.interactiveSteps?.[0]?.instruction || module.steps[0]);
    }
  };

  const nextStep = () => {
    if (!module) return;

    if (step >= module.steps.length - 1) {
      setPracticeStarted(true);
      speak("Great work! Now let's check what you remember.");
      return;
    }

    setStep((value) => value + 1);
  };

  const finishPractice = async (result: { correct: number; total: number; helpRequests: number }) => {
    setPracticeResult(result);
    setPracticeStarted(false);
    setSavingResult(true);
    setSaveMessage("");

    const accuracy = Math.round((result.correct / result.total) * 100);

    if (!selectedStudent) {
      setSaveMessage("Select a student before completing the activity.");
      setSavingResult(false);
      setCompleted(true);
      speak("The lesson is complete. Please select a student to save the result.");
      return;
    }

    try {
      await saveResult({
        student: selectedStudent,
        activityName: module?.title || "Brushing Teeth",
        moduleId: module?.moduleId || "adl-brushing",
        domain: module?.category || "ADL",
        level: module?.level || "Beginner",
        totalQuestions: result.total,
        correctAnswers: result.correct,
        wrongAnswers: result.total - result.correct,
        score: accuracy,
        accuracy,
        timeTaken: seconds,
        attempts: 1,
        helpRequests: result.helpRequests,
      });

      const adaptive = await getAdaptiveSummary(selectedStudent);
      setAdaptiveSummary(adaptive.data);
      setSaveMessage("Performance saved successfully. Adaptive recommendation updated.");
    } catch (err) {
      console.error("Unable to save learning result:", err);
      setSaveMessage("Lesson completed, but the performance could not be saved. Please check that the backend is running.");
    } finally {
      setSavingResult(false);
      setCompleted(true);
      speak("Amazing! You completed the brushing teeth lesson!");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "#F0F6FF",
          fontFamily: P,
        }}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              fontSize: 42,
            }}
          >
            🌱
          </motion.div>

          <p
            className="mt-3"
            style={{
              color: "#607D8B",
              fontSize: 19,
            }}
          >
            Preparing your learning activity...
          </p>
        </div>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background: "#F0F6FF",
          fontFamily: P,
        }}
      >
        <div style={{ fontSize: 60 }}>😕</div>

        <p
          className="mt-4"
          style={{
            color: "#546E7A",
          }}
        >
          {error || "Module not found"}
        </p>

        <button
          onClick={() => navigate("/learning-modules")}
          className="mt-5 px-5 py-3 rounded-xl border-0 text-white"
          style={{
            background: "#1565C0",
            fontFamily: P,
            cursor: "pointer",
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen relative overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 75% 5%, rgba(124,58,237,.22), transparent 28%), radial-gradient(circle at 10% 80%, rgba(6,182,212,.12), transparent 30%), #070B24",
        fontFamily: P,
      }}
    >
      <style>{galaxyStyles}</style>

      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        {[
          ["8%", "12%"],
          ["18%", "72%"],
          ["32%", "20%"],
          ["48%", "83%"],
          ["63%", "10%"],
          ["78%", "66%"],
          ["91%", "25%"],
          ["96%", "82%"],
        ].map(([left, top], i) => (
          <span
            key={i}
            className="galaxy-star"
            style={{
              position: "absolute",
              left,
              top,
              color: i % 2 ? "#67E8F9" : "#A78BFA",
              fontSize: i % 2 ? 10 : 16,
              animationDelay: `${i * 0.25}s`,
            }}
          >
            {i % 2 ? "✧" : "✦"}
          </span>
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 5 }}>
        <Sidebar active="Activities" />
      </div>

      <div className="flex-1 min-w-0">
        <TopBar title="Learning Module" subtitle="Learn • Practise • Grow" />

        <main className="p-6 md:p-8 max-w-6xl mx-auto">
          <button
            onClick={() => navigate("/learning-modules")}
            className="flex items-center gap-1 mb-5 bg-transparent border-0"
            style={{
              color: "#1565C0",
              fontFamily: P,
              cursor: "pointer",
              fontSize: 19,
            }}
          >
            <span className="material-icons-round">arrow_back</span>
            Back to Learning Modules
          </button>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[34px] p-7 md:p-9 mb-6 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${module.color}, #312E81 58%, #111827)`,
              color: "#fff",
              boxShadow: `0 24px 70px ${module.color}35`,
              border: "1px solid rgba(255,255,255,.12)",
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: 280,
                height: 280,
                right: -80,
                top: -120,
                background: "rgba(255,255,255,.07)",
              }}
            />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-7">
              <motion.div
                className="learning-planet flex-shrink-0"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 68,
                  background:
                    "radial-gradient(circle at 30% 25%, #fff, rgba(255,255,255,.45) 15%, rgba(255,255,255,.08) 55%)",
                  boxShadow:
                    "inset -15px -15px 25px rgba(0,0,0,.18), 0 0 50px rgba(255,255,255,.18)",
                }}
              >
                {visualMap[module.moduleId]?.emoji || "🌟"}
              </motion.div>

              <div className="text-center md:text-left">
                <div
                  className="inline-flex px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(255,255,255,.14)",
                    border: "1px solid rgba(255,255,255,.16)",
                    fontFamily: P,
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  🚀 LEARNING MISSION
                </div>

                <h1
                  className="mt-3"
                  style={{
                    fontFamily: P,
                    fontSize: "clamp(26px,4vw,40px)",
                    lineHeight: 1.1,
                    fontWeight: 900,
                  }}
                >
                  {module.title}
                </h1>

                <p
                  className="mt-3"
                  style={{
                    fontFamily: P,
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,.82)",
                    maxWidth: 700,
                  }}
                >
                  {module.description}
                </p>

                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-5">
                  <span
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,.12)",
                      fontFamily: P,
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    ✨ {module.level}
                  </span>
                  <span
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,.12)",
                      fontFamily: P,
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    🎯 {module.category}
                  </span>
                  <span
                    className="px-3 py-1.5 rounded-full"
                    style={{
                      background: "rgba(255,255,255,.12)",
                      fontFamily: P,
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    🧩 {module.steps.length} steps
                  </span>
                </div>
              </div>
            </div>
          </motion.section>

          {!started ? (
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
              <div
                className="rounded-[30px] p-6"
                style={{
                  background: "#fff",
                  boxShadow: "0 5px 25px rgba(21,101,192,.08)",
                }}
              >
                <Visual module={module} step={0} />

                <button
                  onClick={() => speak(`${module.title}. ${module.description}`)}
                  className="w-full mt-5 py-3 rounded-xl border-0"
                  style={{
                    background: "#F0F6FF",
                    color: "#1565C0",
                    fontFamily: P,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🔊 Listen
                </button>
              </div>

              <div
                className="rounded-[30px] p-6"
                style={{
                  background: "#fff",
                  boxShadow: "0 5px 25px rgba(21,101,192,.08)",
                }}
              >
                <h2
                  style={{
                    fontFamily: P,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0D2137",
                  }}
                >
                  🎯 Today's Goals
                </h2>

                <div className="mt-5 space-y-3">
                  {module.objectives.map((objective, index) => (
                    <div key={objective} className="flex gap-3 items-start">
                      <div
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{
                          width: 28,
                          height: 28,
                          background: `${module.color}18`,
                          color: module.color,
                          fontFamily: P,
                          fontWeight: 700,
                          fontSize: 18,
                        }}
                      >
                        {index + 1}
                      </div>

                      <p
                        style={{
                          fontFamily: P,
                          fontSize: 19,
                          color: "#546E7A",
                          lineHeight: 1.5,
                        }}
                      >
                        {objective}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl p-4" style={{ background: "#F7FAFD", border: "1px solid #E2ECF4" }}>
                  <label style={{ display: "block", fontFamily: P, fontSize: 18, fontWeight: 700, color: "#456174", marginBottom: 8 }}>
                    LEARNING FOR
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full rounded-xl px-3 py-3"
                    style={{ border: "1px solid #CFE0EE", background: "#fff", color: "#0D2137", fontFamily: P, fontSize: 19, outline: "none" }}
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.studentCode})
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: 7, fontFamily: P, fontSize: 17, color: "#78909C" }}>
                    The practice result will be added to this learner's adaptive profile.
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.04, y: -3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={startActivity}
                  disabled={!selectedStudent}
                  className="mission-button w-full mt-4 py-4 rounded-2xl border-0 text-white"
                  style={{
                    background: "linear-gradient(135deg,#7C3AED,#2563EB)",
                    fontFamily: P,
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: selectedStudent ? "pointer" : "not-allowed",
                    opacity: selectedStudent ? 1 : 0.5,
                  }}
                >
                  🚀 Start Mission
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="rounded-3xl p-5 mb-5"
                style={{
                  background: "#fff",
                  boxShadow: "0 4px 20px rgba(21,101,192,.07)",
                }}
              >
                <div className="mb-4 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#EAF4FF", border: "1px solid #CFE3F5" }}>
                  <span className="material-icons-round" style={{ color: "#1565C0", fontSize: 20 }}>person</span>
                  <div>
                    <div style={{ fontFamily: P, fontSize: 16, fontWeight: 800, color: "#607D8B", letterSpacing: 0.6 }}>LEARNING FOR</div>
                    <div style={{ fontFamily: P, fontSize: 16, fontWeight: 800, color: "#0D2137" }}>{selectedStudentName || "Selected Student"}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div style={{ fontFamily: P, fontSize: 18, color: "#78909C" }}>
                      STEP {Math.min(step + 1, module.steps.length)} OF {module.steps.length}
                    </div>

                    <div className="mt-1" style={{ fontFamily: P, fontSize: 16, fontWeight: 700, color: "#0D2137" }}>
                      {completed ? "Activity Complete!" : "Keep going! 🌟"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSoundOn((value) => !value);
                        if (!soundOn && module) {
                          speak(module.interactiveSteps?.[step]?.audioText || module.interactiveSteps?.[step]?.instruction || module.steps[step]);
                        }
                      }}
                      className="flex items-center justify-center rounded-xl border-0"
                      style={{
                        width: 44,
                        height: 44,
                        background: "#F0F6FF",
                        cursor: "pointer",
                        color: "#1565C0",
                      }}
                    >
                      <span className="material-icons-round">{soundOn ? "volume_up" : "volume_off"}</span>
                    </button>

                    <div className="px-3 py-2 rounded-xl" style={{ background: "#F7FAFD", color: "#546E7A", fontFamily: P, fontSize: 18, fontWeight: 600 }}>
                      ⏱ {time}
                    </div>
                  </div>
                </div>

                <div className="h-3 rounded-full mt-5 overflow-hidden" style={{ background: "#E6EEF6" }}>
                  <motion.div
                    animate={{ width: `${completed ? 100 : Math.max(progress, 5)}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="learning-progress h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg,#8B5CF6,#06B6D4,#22C55E)",
                      boxShadow: "0 0 15px rgba(139,92,246,.55)",
                    }}
                  />
                </div>
              </div>

              {practiceStarted ? (
                <BrushingPracticeCheck onComplete={finishPractice} />
              ) : !completed ? (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[32px] p-6 md:p-8"
                  style={{ background: "#fff", boxShadow: "0 8px 35px rgba(21,101,192,.09)" }}
                >
                  <Visual module={module} step={step} />

                  <div className="mt-5 rounded-2xl px-4 py-3 text-center" style={{ background: "#F7FAFD", border: "1px solid #E2ECF4" }}>
                    <span style={{ fontFamily: P, fontSize: 17, color: "#607D8B", fontWeight: 700 }}>LEARNER: </span>
                    <span style={{ fontFamily: P, fontSize: 19, color: "#1565C0", fontWeight: 800 }}>{selectedStudentName}</span>
                  </div>

                  <div className="text-center mt-6">
                    <div className="inline-block px-4 py-2 rounded-full" style={{ background: `${module.color}12`, color: module.color, fontFamily: P, fontWeight: 700, fontSize: 16 }}>
                      Step {step + 1}
                    </div>

                    <h2 className="mt-4" style={{ fontFamily: P, fontSize: 27, fontWeight: 800, color: "#0D2137" }}>
                      {module.interactiveSteps?.[step]?.instruction || module.steps[step]}
                    </h2>

                    <p className="mt-3" style={{ fontFamily: P, fontSize: 19, color: "#607D8B" }}>
                      Take your time. You can listen again or ask for help.
                    </p>

                    <button
                      onClick={() => speak(module.steps[step])}
                      className="mt-4 px-5 py-2 rounded-xl border-0"
                      style={{
                        background: "#F0F6FF",
                        color: "#1565C0",
                        fontFamily: P,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      🔊 Hear the instruction
                    </button>

                    <ChoiceActivity module={module} step={step} onCorrect={nextStep} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-[32px] p-10 text-center"
                  style={{ background: "#fff", boxShadow: "0 10px 40px rgba(21,101,192,.1)" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1 }}
                    style={{ fontSize: 125 }}
                  >
                    🏆
                  </motion.div>

                  <h2 className="mt-5" style={{ fontFamily: P, fontSize: 31, fontWeight: 800, color: "#0D2137" }}>
                    Amazing Work! 🎉
                  </h2>

                  {module.moduleId === "adl-brushing" && practiceResult && (
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl p-4" style={{ background: "#E8F5E9" }}>
                        <div style={{ fontFamily: P, fontSize: 17, color: "#558B2F", fontWeight: 700 }}>ACCURACY</div>
                        <div style={{ fontFamily: P, fontSize: 31, color: "#2E7D32", fontWeight: 800, marginTop: 4 }}>
                          {Math.round((practiceResult.correct / practiceResult.total) * 100)}%
                        </div>
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: "#F0F6FF" }}>
                        <div style={{ fontFamily: P, fontSize: 17, color: "#607D8B", fontWeight: 700 }}>CORRECT</div>
                        <div style={{ fontFamily: P, fontSize: 31, color: "#1565C0", fontWeight: 800, marginTop: 4 }}>
                          {practiceResult.correct} / {practiceResult.total}
                        </div>
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: "#FFF4E5" }}>
                        <div style={{ fontFamily: P, fontSize: 17, color: "#E65100", fontWeight: 700 }}>HELP REQUESTS</div>
                        <div style={{ fontFamily: P, fontSize: 31, color: "#E65100", fontWeight: 800, marginTop: 4 }}>
                          {practiceResult.helpRequests}
                        </div>
                      </div>
                    </div>
                  )}

                  {module.moduleId === "adl-brushing" && practiceResult && (
                    <div className="mt-5 rounded-2xl p-4 text-left" style={{ background: "#F7FAFD", border: "1px solid #E2ECF4" }}>
                      <div style={{ fontFamily: P, fontSize: 18, color: "#607D8B", fontWeight: 700 }}>ADAPTIVE RECOMMENDATION</div>
                      <div style={{ fontFamily: P, fontSize: 17, color: "#0D2137", fontWeight: 700, marginTop: 6 }}>
                        {Math.round((practiceResult.correct / practiceResult.total) * 100) >= 80
                          ? "Excellent mastery. The learner can progress to the next ADL activity."
                          : Math.round((practiceResult.correct / practiceResult.total) * 100) >= 50
                            ? "Developing mastery. Repeat this lesson with the visual prompts before moving to the next activity."
                            : "Needs additional support. Repeat the pictorial lesson with more guided practice."}
                      </div>
                    </div>
                  )}

                  {savingResult && (
                    <div className="mt-4 rounded-2xl p-4 text-center" style={{ background: "#F0F6FF", color: "#1565C0", fontFamily: P, fontWeight: 700, fontSize: 17 }}>
                      Saving performance and updating adaptive profile...
                    </div>
                  )}

                  {saveMessage && (
                    <div className="mt-4 rounded-2xl p-4" style={{ background: saveMessage.startsWith("Performance saved") ? "#E8F5E9" : "#FFF4E5", color: saveMessage.startsWith("Performance saved") ? "#2E7D32" : "#E65100", fontFamily: P, fontWeight: 700, fontSize: 16 }}>
                      {saveMessage}
                    </div>
                  )}

                  {adaptiveSummary && (
                    <div className="mt-4 rounded-2xl p-5 text-left" style={{ background: "linear-gradient(135deg,#F8FBFF,#F3FAF6)", border: "1px solid #DCEAF4" }}>
                      <div style={{ fontFamily: P, fontSize: 17, fontWeight: 800, color: "#607D8B", letterSpacing: 0.5 }}>LEARNER ADAPTIVE PROFILE</div>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-3">
                        <div>
                          <div style={{ fontFamily: P, fontSize: 19, fontWeight: 700, color: "#0D2137" }}>ALPI</div>
                          <div style={{ fontFamily: P, fontSize: 34, fontWeight: 800, color: "#1565C0" }}>{adaptiveSummary.alpi}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: P, fontSize: 18, fontWeight: 700, color: "#455A64" }}>Domain mastery</div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(adaptiveSummary.domainMastery || []).map((item: any) => (
                              <span key={item.domain} className="px-3 py-1 rounded-full" style={{ background: "#E8F5E9", color: "#2E7D32", fontFamily: P, fontSize: 17, fontWeight: 700 }}>
                                {item.domain}: {item.mastery}%
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-4 rounded-xl" style={{ background: "#fff" }}>
                        <div style={{ fontFamily: P, fontSize: 17, fontWeight: 800, color: "#607D8B" }}>NEXT RECOMMENDATION</div>
                        <div style={{ fontFamily: P, fontSize: 17, fontWeight: 800, color: "#0D2137", marginTop: 5 }}>
                          {adaptiveSummary.recommendation?.title}
                        </div>
                        <div style={{ fontFamily: P, fontSize: 18, color: "#607D8B", marginTop: 4, lineHeight: 1.5 }}>
                          {adaptiveSummary.recommendation?.reason}
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="mt-3" style={{ fontFamily: P, color: "#607D8B", fontSize: 18 }}>
                    You completed <strong>{module.title}</strong>!
                  </p>

                  <div className="flex justify-center gap-2 mt-5" style={{ fontSize: 30 }}>
                    ⭐ ⭐ ⭐
                  </div>

                  <div className="mt-5 mx-auto rounded-2xl p-4" style={{ background: "#F0F6FF", maxWidth: 300 }}>
                    <div style={{ fontFamily: P, fontSize: 18, color: "#78909C" }}>Practice time</div>

                    <strong style={{ fontFamily: P, fontSize: 22, color: "#1565C0" }}>{time}</strong>
                  </div>

                  <div className="flex justify-center gap-3 mt-7">
                    <button
                      onClick={startActivity}
                      className="px-5 py-3 rounded-xl border-0"
                      style={{
                        background: "#F0F6FF",
                        color: "#1565C0",
                        fontFamily: P,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      🔁 Practise Again
                    </button>

                    <button
                      onClick={() => navigate("/learning-modules")}
                      className="px-5 py-3 rounded-xl border-0 text-white"
                      style={{
                        background: module.color,
                        fontFamily: P,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Back to Modules
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
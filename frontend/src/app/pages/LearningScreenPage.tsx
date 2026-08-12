import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

// ─── Style constants ───────────────────────────────────────────────────────────
const P = "Poppins, sans-serif";
// primary blue: #1565C0, green: #27ae60, bg: #F0F6FF, dark: #0D2137

// ─── Mascot ───────────────────────────────────────────────────────────────────
type MascotMood = "idle" | "happy" | "celebrate" | "thinking";

function Mascot({ mood }: { mood: MascotMood }) {
  const animProps = (() => {
    switch (mood) {
      case "happy":
        return {
          animate: { scale: [1, 1.1, 1] },
          transition: { duration: 0.6, repeat: Infinity },
        };
      case "celebrate":
        return {
          animate: { scale: [1, 1.2, 1], rotate: [-10, 10, -10, 0] },
          transition: { duration: 0.4, repeat: Infinity },
        };
      case "thinking":
        return {
          animate: { rotate: [-5, 5, -5] },
          transition: { duration: 1.2, repeat: Infinity },
        };
      default:
        return {
          animate: { y: [0, -6, 0] },
          transition: { duration: 2, repeat: Infinity },
        };
    }
  })();

  return (
    <motion.div {...animProps} style={{ display: "inline-block" }}>
      <svg width="100" height="110" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <ellipse cx="50" cy="72" rx="34" ry="36" fill="#F4900C" />
        {/* Belly */}
        <ellipse cx="50" cy="78" rx="20" ry="24" fill="#FDEBD0" />
        {/* Left Wing */}
        <ellipse cx="18" cy="75" rx="10" ry="18" fill="#E67E22" transform="rotate(-20 18 75)" />
        {/* Right Wing */}
        <ellipse cx="82" cy="75" rx="10" ry="18" fill="#E67E22" transform="rotate(20 82 75)" />
        {/* Head */}
        <ellipse cx="50" cy="38" rx="28" ry="26" fill="#F4900C" />
        {/* Left Ear tuft */}
        <polygon points="26,18 20,4 34,14" fill="#E67E22" />
        {/* Right Ear tuft */}
        <polygon points="74,18 80,4 66,14" fill="#E67E22" />
        {/* Left Eye white */}
        <circle cx="37" cy="38" r="11" fill="white" />
        {/* Right Eye white */}
        <circle cx="63" cy="38" r="11" fill="white" />
        {/* Left Pupil */}
        <circle cx="38" cy="39" r="6" fill="#0D2137" />
        {/* Right Pupil */}
        <circle cx="64" cy="39" r="6" fill="#0D2137" />
        {/* Left Eye shine */}
        <circle cx="40" cy="36" r="2" fill="white" />
        {/* Right Eye shine */}
        <circle cx="66" cy="36" r="2" fill="white" />
        {/* Beak */}
        <polygon points="50,46 44,54 56,54" fill="#F39C12" />
        {/* Feet */}
        <ellipse cx="38" cy="106" rx="8" ry="4" fill="#E67E22" />
        <ellipse cx="62" cy="106" rx="8" ry="4" fill="#E67E22" />
        {/* Belly texture lines */}
        <path d="M42 70 Q50 66 58 70" stroke="#F4D03F" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M40 78 Q50 74 60 78" stroke="#F4D03F" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    </motion.div>
  );
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────
function SpeechBubble({ message }: { message: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, scale: 0.85, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.25 }}
        style={{
          background: "white",
          borderRadius: 16,
          padding: "10px 14px",
          fontSize: 18,
          fontFamily: P,
          fontWeight: 600,
          color: "#0D2137",
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          position: "relative",
          maxWidth: 160,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        {message}
        {/* Tail */}
        <div style={{
          position: "absolute",
          bottom: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "10px solid white",
        }} />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function Timer({ seconds, total }: { seconds: number; total: number }) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  const isOrange = seconds < 60;
  const isRed = seconds < 20;

  return (
    <motion.div
      animate={isRed ? { scale: [1, 1.06, 1] } : {}}
      transition={isRed ? { duration: 0.6, repeat: Infinity } : {}}
      style={{
        background: isRed ? "#FFF0F0" : isOrange ? "#FFF8EE" : "white",
        border: `2.5px solid ${isRed ? "#E53935" : isOrange ? "#FB8C00" : "#1565C0"}`,
        borderRadius: 999,
        padding: "6px 18px",
        fontFamily: P,
        fontWeight: 700,
        fontSize: 18,
        color: isRed ? "#E53935" : isOrange ? "#E65100" : "#1565C0",
        letterSpacing: 1,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        minWidth: 90,
        textAlign: "center",
      }}
    >
      {/* eslint-disable-next-line */}
      ⏱ {mins}:{secs}
    </motion.div>
  );
}

// ─── Game Progress Bar ────────────────────────────────────────────────────────
function GameProgressBar({ done, total, color }: { done: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min((done / total) * 100, 100) : 0;
  return (
    <div style={{ background: "#E0E9FF", borderRadius: 999, height: 10, overflow: "hidden" }}>
      <motion.div
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={{ height: "100%", background: color, borderRadius: 999 }}
      />
    </div>
  );
}

// ─── Celebration Burst ────────────────────────────────────────────────────────
const CONFETTI = ["🎉", "⭐", "🌟", "✨", "🎊", "💫", "🏆", "🌈"];

function CelebrationBurst() {
  const items = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    emoji: CONFETTI[i % CONFETTI.length],
    x: (Math.random() - 0.5) * 500,
    delay: Math.random() * 0.4,
    size: 20 + Math.random() * 20,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ y: 0, x: item.x * 0.2, opacity: 1, scale: 0.5 }}
          animate={{ y: -400, x: item.x, opacity: 0, scale: 1.2 }}
          transition={{ duration: 1.4, delay: item.delay, ease: "easeOut" }}
          style={{ position: "absolute", fontSize: item.size }}
        >
          {item.emoji}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Score Card ───────────────────────────────────────────────────────────────
function ScoreCard({
  score,
  total,
  time,
  activityTitle,
  onNext,
  onRetry,
}: {
  score: number;
  total: number;
  time: number;
  activityTitle: string;
  onNext: () => void;
  onRetry: () => void;
}) {
  const pct = total > 0 ? score / total : 0;
  const stars = pct >= 1 ? 3 : pct >= 0.66 ? 2 : 1;
  const timeTaken = 120 - time;
  const mins = Math.floor(timeTaken / 60).toString().padStart(2, "0");
  const secs = (timeTaken % 60).toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(13,33,55,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        fontFamily: P,
      }}
    >
      <div style={{
        background: "white",
        borderRadius: 28,
        padding: "48px 40px",
        maxWidth: 420,
        width: "90%",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0D2137", margin: "0 0 4px" }}>
          {activityTitle}
        </h2>
        <p style={{ color: "#546E7A", fontSize: 19, margin: "0 0 24px" }}>Activity Complete!</p>

        <div style={{ fontSize: 52, fontWeight: 900, color: "#1565C0", marginBottom: 4 }}>
          {score}<span style={{ fontSize: 28, color: "#90A4AE" }}>/{total}</span>
        </div>
        <p style={{ color: "#78909C", fontSize: 18, margin: "0 0 16px" }}>Time: {mins}:{secs}</p>

        <div style={{ fontSize: 36, marginBottom: 24 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>⭐</span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
          <Link
            to="/activities"
            onClick={onNext}
            style={{
              background: "#1565C0",
              color: "white",
              borderRadius: 16,
              padding: "18px 32px",
              fontFamily: P,
              fontWeight: 700,
              fontSize: 18,
              textDecoration: "none",
              display: "block",
            }}
          >
            Next Activity 🚀
          </Link>
          <button
            onClick={onRetry}
            style={{
              background: "#F0F6FF",
              color: "#1565C0",
              border: "2px solid #1565C0",
              borderRadius: 16,
              padding: "16px 32px",
              fontFamily: P,
              fontWeight: 700,
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            Try Again 🔄
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Activity Registry ────────────────────────────────────────────────────────
type GameType = "drag-match" | "tap-match" | "letter-match" | "picture-id";

interface ActivityConfig {
  title: string;
  instruction: string;
  color: string;
  icon: string;
  totalItems: number;
  gameType: GameType;
}

const REGISTRY: Record<string, ActivityConfig> = {
  "shape-matching": {
    title: "Shape Matching",
    instruction: "Drag each shape to its matching outline!",
    color: "#7B1FA2",
    icon: "🔷",
    totalItems: 4,
    gameType: "drag-match",
  },
  "colour-matching": {
    title: "Colour Matching",
    instruction: "Tap a colour, then tap its name!",
    color: "#E91E8C",
    icon: "🎨",
    totalItems: 4,
    gameType: "tap-match",
  },
  "animal-matching": {
    title: "Animal Matching",
    instruction: "Match each animal to its name!",
    color: "#27ae60",
    icon: "🐾",
    totalItems: 4,
    gameType: "tap-match",
  },
  "alphabet-matching": {
    title: "Alphabet Matching",
    instruction: "Match each big letter to its small letter!",
    color: "#1565C0",
    icon: "🔤",
    totalItems: 4,
    gameType: "letter-match",
  },
  "fruit-matching": {
    title: "Fruit Matching",
    instruction: "Tap a fruit, then tap its name!",
    color: "#F57F17",
    icon: "🍎",
    totalItems: 4,
    gameType: "tap-match",
  },
  "picture-id": {
    title: "Picture ID",
    instruction: "Tap the correct answer for each picture!",
    color: "#00838F",
    icon: "🖼️",
    totalItems: 4,
    gameType: "picture-id",
  },
  "drag-drop-sorting": {
    title: "Sorting Game",
    instruction: "Sort animals and vehicles into the right bins!",
    color: "#AD1457",
    icon: "🗂️",
    totalItems: 6,
    gameType: "drag-match",
  },
  "number-matching": {
    title: "Number Matching",
    instruction: "Match each number to its dot pattern!",
    color: "#1565C0",
    icon: "🔢",
    totalItems: 4,
    gameType: "letter-match",
  },
  "size-sorting": {
    title: "Size Sorting",
    instruction: "Tap the circles from smallest to largest!",
    color: "#6A1B9A",
    icon: "📏",
    totalItems: 3,
    gameType: "picture-id",
  },
  "sound-matching": {
    title: "Sound Matching",
    instruction: "Match each animal to the sound it makes!",
    color: "#00695C",
    icon: "🔊",
    totalItems: 4,
    gameType: "tap-match",
  },
};

// ─── Shape SVGs ───────────────────────────────────────────────────────────────
interface ShapeDef {
  label: string;
  color: string;
  element: React.ReactNode;
}

const SHAPES: Record<string, ShapeDef> = {
  circle: {
    label: "Circle",
    color: "#42A5F5",
    element: (
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="#42A5F5" />
        <circle cx="28" cy="24" r="8" fill="white" opacity="0.35" />
      </svg>
    ),
  },
  square: {
    label: "Square",
    color: "#66BB6A",
    element: (
      <svg width="80" height="80" viewBox="0 0 80 80">
        <rect x="6" y="6" width="68" height="68" rx="10" fill="#66BB6A" />
        <rect x="14" y="12" width="20" height="12" rx="4" fill="white" opacity="0.35" />
      </svg>
    ),
  },
  triangle: {
    label: "Triangle",
    color: "#FFA726",
    element: (
      <svg width="80" height="80" viewBox="0 0 80 80">
        <polygon points="40,6 74,74 6,74" fill="#FFA726" />
        <polygon points="40,14 52,36 28,36" fill="white" opacity="0.3" />
      </svg>
    ),
  },
  star: {
    label: "Star",
    color: "#AB47BC",
    element: (
      <svg width="80" height="80" viewBox="0 0 80 80">
        <polygon
          points="40,6 49,30 75,30 54,47 62,72 40,56 18,72 26,47 5,30 31,30"
          fill="#AB47BC"
        />
        <circle cx="40" cy="30" r="6" fill="white" opacity="0.3" />
      </svg>
    ),
  },
};

// ─── Drag-Match Game: Shape Matching ─────────────────────────────────────────
function ShapeMatchGame({ onScore }: { onScore: (n: number) => void }) {
  const shapeIds = ["circle", "square", "triangle", "star"];
  const [placed, setPlaced] = useState<Record<string, string>>({}); // zoneId -> shapeId
  const [wrong, setWrong] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const score = shapeIds.filter((id) => placed[id] === id).length;

  useEffect(() => { onScore(score); }, [score, onScore]);

  const handleDrop = (zoneId: string, e: React.DragEvent) => {
    e.preventDefault();
    const shapeId = e.dataTransfer.getData("shapeId");
    if (shapeId === zoneId) {
      setPlaced((p) => ({ ...p, [zoneId]: shapeId }));
    } else {
      setWrong(zoneId);
      setTimeout(() => setWrong(null), 700);
    }
  };

  const placedShapeIds = new Set(Object.values(placed));

  return (
    <div style={{ width: "100%", fontFamily: P }}>
      {/* Drop Zones */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
        {shapeIds.map((id) => {
          const shape = SHAPES[id];
          const isCorrect = placed[id] === id;
          const isWrong = wrong === id;
          return (
            <div
              key={id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(id, e)}
              style={{
                width: 110,
                height: 130,
                borderRadius: 16,
                border: `3px dashed ${isCorrect ? "#27ae60" : isWrong ? "#E53935" : "#90A4AE"}`,
                background: isCorrect ? "#E8F5E9" : isWrong ? "#FFEBEE" : "#F8F9FA",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
              }}
            >
              {isCorrect ? (
                <>
                  {shape.element}
                  <span style={{ fontSize: 22 }}>✅</span>
                </>
              ) : (
                <>
                  <div style={{ opacity: 0.2 }}>{shape.element}</div>
                  <span style={{ fontSize: 17, fontWeight: 600, color: "#546E7A" }}>{shape.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Draggable Pool */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        {shapeIds.map((id) => {
          const shape = SHAPES[id];
          const isPlaced = placedShapeIds.has(id);
          return (
            <motion.div
              key={id}
              animate={isPlaced ? { opacity: 0.25, scale: 0.9 } : { opacity: 1, scale: 1 }}
              draggable={!isPlaced}
              onDragStart={(e: any) => {
                const dragEvent = e as React.DragEvent<HTMLDivElement>;
                dragEvent.dataTransfer.setData("shapeId", id);
                setDragging(id);
              }}
              onDragEnd={() => setDragging(null)}
              style={{
                width: 110,
                height: 130,
                borderRadius: 16,
                background: `${shape.color}22`,
                border: `3px solid ${dragging === id ? shape.color : shape.color + "88"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: isPlaced ? "default" : "grab",
                userSelect: "none",
              }}
            >
              {shape.element}
              <span style={{ fontSize: 17, fontWeight: 700, color: "#0D2137" }}>{shape.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Drag-Match Game: Sorting ─────────────────────────────────────────────────
const SORT_ITEMS = [
  { id: "dog", label: "Dog 🐕", category: "animals" },
  { id: "cat", label: "Cat 🐱", category: "animals" },
  { id: "bird", label: "Bird 🐦", category: "animals" },
  { id: "car", label: "Car 🚗", category: "vehicles" },
  { id: "bus", label: "Bus 🚌", category: "vehicles" },
  { id: "plane", label: "Plane ✈️", category: "vehicles" },
];

const BINS = [
  { id: "animals", label: "Animals 🐾", color: "#27ae60" },
  { id: "vehicles", label: "Vehicles 🚗", color: "#1565C0" },
];

function SortingGame({ onScore }: { onScore: (n: number) => void }) {
  const [binContents, setBinContents] = useState<Record<string, string[]>>({
    animals: [],
    vehicles: [],
  });
  const [wrongBin, setWrongBin] = useState<string | null>(null);

  const allSorted = Object.values(binContents).flat();
  const score = allSorted.filter((itemId) => {
    const item = SORT_ITEMS.find((i) => i.id === itemId)!;
    const binId = Object.entries(binContents).find(([, ids]) => ids.includes(itemId))?.[0];
    return item.category === binId;
  }).length;

  useEffect(() => { onScore(score); }, [score, onScore]);

  const handleDrop = (binId: string, e: React.DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    const item = SORT_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    if (item.category === binId) {
      setBinContents((prev) => ({
        ...prev,
        [binId]: [...prev[binId], itemId],
      }));
    } else {
      setWrongBin(binId);
      setTimeout(() => setWrongBin(null), 700);
    }
  };

  const sortedIds = new Set(Object.values(binContents).flat());

  return (
    <div style={{ width: "100%", fontFamily: P }}>
      {/* Bins */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
        {BINS.map((bin) => (
          <div
            key={bin.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(bin.id, e)}
            style={{
              flex: 1,
              minHeight: 130,
              maxWidth: 200,
              borderRadius: 20,
              border: `3px dashed ${wrongBin === bin.id ? "#E53935" : bin.color}`,
              background: wrongBin === bin.id ? "#FFEBEE" : `${bin.color}18`,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 19, color: bin.color, marginBottom: 4 }}>{bin.label}</span>
            {binContents[bin.id].map((itemId) => {
              const item = SORT_ITEMS.find((i) => i.id === itemId)!;
              return (
                <div key={itemId} style={{
                  background: `${bin.color}33`,
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#0D2137",
                }}>
                  {item.label} ✅
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Items pool */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {SORT_ITEMS.map((item) => {
          const isPlaced = sortedIds.has(item.id);
          return (
            <div
              key={item.id}
              draggable={!isPlaced}
              onDragStart={(e: React.DragEvent<HTMLDivElement>) => e.dataTransfer.setData("itemId", item.id)}
              style={{
                padding: "12px 18px",
                background: "white",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                color: "#0D2137",
                border: "2px solid #B0BEC5",
                cursor: isPlaced ? "default" : "grab",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                opacity: isPlaced ? 0.2 : 1,
                transform: isPlaced ? "scale(0.9)" : "scale(1)",
                transition: "opacity 0.2s, transform 0.2s",
              }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tap-Match Game ───────────────────────────────────────────────────────────
interface TapMatchPair {
  id: string;
  leftLabel: React.ReactNode;
  rightLabel: string;
}

function TapMatchGame({
  pairs,
  onScore,
}: {
  pairs: TapMatchPair[];
  onScore: (n: number) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [wrongLeft, setWrongLeft] = useState<string | null>(null);
  const [wrongRight, setWrongRight] = useState<string | null>(null);

  const score = locked.size;
  useEffect(() => { onScore(score); }, [score, onScore]);

  const shuffledRight = useRef(
    [...pairs].sort(() => Math.random() - 0.5)
  ).current;

  const handleLeftTap = (id: string) => {
    if (locked.has(id)) return;
    setSelectedLeft((prev) => prev === id ? null : id);
  };

  const handleRightTap = (id: string) => {
    if (locked.has(id)) return;
    if (!selectedLeft) return;

    if (selectedLeft === id) {
      setLocked((prev) => new Set([...prev, id]));
      setSelectedLeft(null);
    } else {
      setWrongLeft(selectedLeft);
      setWrongRight(id);
      setTimeout(() => {
        setWrongLeft(null);
        setWrongRight(null);
        setSelectedLeft(null);
      }, 700);
    }
  };

  const cardBase: React.CSSProperties = {
    borderRadius: 16,
    padding: "14px 10px",
    minWidth: 100,
    minHeight: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontFamily: P,
    fontWeight: 700,
    fontSize: 19,
    transition: "all 0.15s",
    userSelect: "none",
    border: "3px solid transparent",
    boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
  };

  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "center", width: "100%", fontFamily: P }}>
      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pairs.map((p) => {
          const isLocked = locked.has(p.id);
          const isSelected = selectedLeft === p.id;
          const isWrong = wrongLeft === p.id;
          return (
            <motion.div
              key={p.id}
              animate={isWrong ? { x: [-6, 6, -6, 0] } : {}}
              transition={{ duration: 0.3 }}
              onClick={() => handleLeftTap(p.id)}
              style={{
                ...cardBase,
                background: isLocked ? "#E8F5E9" : isSelected ? "#E3F2FD" : "white",
                border: `3px solid ${isLocked ? "#27ae60" : isWrong ? "#E53935" : isSelected ? "#1565C0" : "#CFD8DC"}`,
                color: "#0D2137",
                fontSize: 32,
              }}
            >
              {p.leftLabel}
              {isLocked && <span style={{ fontSize: 18, marginLeft: 4 }}>✅</span>}
            </motion.div>
          );
        })}
      </div>

      {/* Right column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {shuffledRight.map((p) => {
          const isLocked = locked.has(p.id);
          const isWrong = wrongRight === p.id;
          const isHinted = selectedLeft !== null && !isLocked;
          return (
            <motion.div
              key={p.id}
              animate={isWrong ? { x: [-6, 6, -6, 0] } : {}}
              transition={{ duration: 0.3 }}
              onClick={() => handleRightTap(p.id)}
              style={{
                ...cardBase,
                background: isLocked ? "#E8F5E9" : isWrong ? "#FFEBEE" : isHinted ? "#F8FBFF" : "white",
                border: `3px solid ${isLocked ? "#27ae60" : isWrong ? "#E53935" : isHinted ? "#90CAF9" : "#CFD8DC"}`,
                color: isLocked ? "#27ae60" : "#0D2137",
              }}
            >
              {p.rightLabel}
              {isLocked && " ✅"}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Picture ID Game ──────────────────────────────────────────────────────────
const PIC_QUESTIONS = [
  { id: "sun", emoji: "🌞", label: "Sun", options: ["Sun", "Moon", "Star", "Cloud"] },
  { id: "house", emoji: "🏠", label: "House", options: ["Car", "House", "Tree", "Boat"] },
  { id: "car", emoji: "🚗", label: "Car", options: ["Bus", "Train", "Car", "Plane"] },
  { id: "tree", emoji: "🌳", label: "Tree", options: ["Flower", "Rock", "Tree", "River"] },
];

function PictureIDGame({ onScore }: { onScore: (n: number) => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [wrongOpt, setWrongOpt] = useState<string | null>(null);

  const score = Object.values(answered).filter(Boolean).length;
  useEffect(() => { onScore(score); }, [score, onScore]);

  const q = PIC_QUESTIONS[currentQ];
  const shuffledOptions = useRef(
    PIC_QUESTIONS.map((pq) => [...pq.options].sort(() => Math.random() - 0.5))
  ).current;

  const handleAnswer = (opt: string) => {
    if (feedback || answered[currentQ]) return;
    if (opt === q.label) {
      setFeedback("correct");
      setAnswered((prev) => ({ ...prev, [currentQ]: true }));
      setTimeout(() => {
        setFeedback(null);
        if (currentQ < PIC_QUESTIONS.length - 1) setCurrentQ((c) => c + 1);
      }, 600);
    } else {
      setFeedback("wrong");
      setWrongOpt(opt);
      setTimeout(() => {
        setFeedback(null);
        setWrongOpt(null);
      }, 700);
    }
  };

  return (
    <div style={{ width: "100%", fontFamily: P, textAlign: "center" }}>
      <motion.div
        key={currentQ}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          fontSize: 140,
          marginBottom: 8,
          filter: feedback === "correct" ? "drop-shadow(0 0 20px #27ae60)" : undefined,
        }}
      >
        {q.emoji}
      </motion.div>
      <p style={{ fontSize: 19, color: "#546E7A", marginBottom: 20 }}>
        Question {currentQ + 1} of {PIC_QUESTIONS.length}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 340, margin: "0 auto" }}>
        {shuffledOptions[currentQ].map((opt) => {
          const isCorrect = feedback === "correct" && opt === q.label;
          const isWrong = wrongOpt === opt;
          return (
            <motion.button
              key={opt}
              animate={isWrong ? { x: [-6, 6, -6, 0] } : isCorrect ? { scale: [1, 1.08, 1] } : {}}
              onClick={() => handleAnswer(opt)}
              style={{
                padding: "18px 12px",
                borderRadius: 16,
                border: `3px solid ${isCorrect ? "#27ae60" : isWrong ? "#E53935" : "#CFD8DC"}`,
                background: isCorrect ? "#E8F5E9" : isWrong ? "#FFEBEE" : "white",
                fontFamily: P,
                fontWeight: 700,
                fontSize: 16,
                color: "#0D2137",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
              }}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
        {PIC_QUESTIONS.map((_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: "50%",
            background: answered[i] ? "#27ae60" : i === currentQ ? "#1565C0" : "#CFD8DC",
            transition: "background 0.3s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Size Sorting Game ────────────────────────────────────────────────────────
const SIZE_ITEMS = [
  { id: "small", label: "Small", size: 48, correct: 0 },
  { id: "medium", label: "Medium", size: 80, correct: 1 },
  { id: "large", label: "Large", size: 112, correct: 2 },
];

function SizeSortingGame({ onScore }: { onScore: (n: number) => void }) {
  const shuffledRef = useRef([...SIZE_ITEMS].sort(() => Math.random() - 0.5));
  const [tapOrder, setTapOrder] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const score = (() => {
    let s = 0;
    for (let i = 0; i < tapOrder.length; i++) {
      const item = SIZE_ITEMS.find((x) => x.id === tapOrder[i]);
      if (item && item.correct === i) s++;
    }
    return s;
  })();

  useEffect(() => { if (done) onScore(score); }, [score, done, onScore]);

  const handleTap = (id: string) => {
    if (done || tapOrder.includes(id)) return;
    const newOrder = [...tapOrder, id];
    setTapOrder(newOrder);
    if (newOrder.length === SIZE_ITEMS.length) {
      setDone(true);
    }
  };

  return (
    <div style={{ width: "100%", textAlign: "center", fontFamily: P }}>
      <p style={{ color: "#546E7A", fontSize: 19, marginBottom: 24 }}>
        Tap from smallest to largest!
      </p>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "flex-end", marginBottom: 24 }}>
        {shuffledRef.current.map((item) => {
          const tappedIndex = tapOrder.indexOf(item.id);
          const isTapped = tappedIndex !== -1;
          const isCorrect = done && SIZE_ITEMS.find((x) => x.id === item.id)!.correct === tappedIndex;
          return (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleTap(item.id)}
              style={{
                width: item.size,
                height: item.size,
                borderRadius: "50%",
                background: isTapped
                  ? (isCorrect || !done) ? "#42A5F5" : "#EF5350"
                  : "#90CAF9",
                border: "4px solid #1565C0",
                cursor: isTapped ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "white",
                transition: "background 0.3s",
              }}
            >
              {isTapped ? tappedIndex + 1 : ""}
            </motion.div>
          );
        })}
      </div>
      {done && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 18, fontWeight: 700, color: score === 3 ? "#27ae60" : "#E53935" }}
        >
          {score === 3 ? "Perfect! 🎉" : `${score}/3 correct!`}
        </motion.p>
      )}
    </div>
  );
}

// ─── Game Resolver ────────────────────────────────────────────────────────────
function GameView({
  activityId,
  onScore,
}: {
  activityId: string;
  onScore: (n: number) => void;
}) {
  switch (activityId) {
    case "shape-matching":
      return <ShapeMatchGame onScore={onScore} />;

    case "drag-drop-sorting":
      return <SortingGame onScore={onScore} />;

    case "colour-matching":
      return (
        <TapMatchGame
          pairs={[
            { id: "red", leftLabel: <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#E53935" }} />, rightLabel: "Red" },
            { id: "blue", leftLabel: <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#1565C0" }} />, rightLabel: "Blue" },
            { id: "green", leftLabel: <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#27ae60" }} />, rightLabel: "Green" },
            { id: "yellow", leftLabel: <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#F9A825" }} />, rightLabel: "Yellow" },
          ]}
          onScore={onScore}
        />
      );

    case "animal-matching":
      return (
        <TapMatchGame
          pairs={[
            { id: "cat", leftLabel: "🐱", rightLabel: "Cat" },
            { id: "dog", leftLabel: "🐕", rightLabel: "Dog" },
            { id: "bird", leftLabel: "🐦", rightLabel: "Bird" },
            { id: "fish", leftLabel: "🐟", rightLabel: "Fish" },
          ]}
          onScore={onScore}
        />
      );

    case "fruit-matching":
      return (
        <TapMatchGame
          pairs={[
            { id: "apple", leftLabel: "🍎", rightLabel: "Apple" },
            { id: "banana", leftLabel: "🍌", rightLabel: "Banana" },
            { id: "orange", leftLabel: "🍊", rightLabel: "Orange" },
            { id: "grape", leftLabel: "🍇", rightLabel: "Grape" },
          ]}
          onScore={onScore}
        />
      );

    case "sound-matching":
      return (
        <TapMatchGame
          pairs={[
            { id: "lion", leftLabel: "🦁", rightLabel: "Roar" },
            { id: "duck", leftLabel: "🦆", rightLabel: "Quack" },
            { id: "dogSound", leftLabel: "🐕", rightLabel: "Woof" },
            { id: "catSound", leftLabel: "🐱", rightLabel: "Meow" },
          ]}
          onScore={onScore}
        />
      );

    case "alphabet-matching":
      return (
        <TapMatchGame
          pairs={[
            { id: "A", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#E53935" }}>A</span>, rightLabel: "a" },
            { id: "B", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#1565C0" }}>B</span>, rightLabel: "b" },
            { id: "C", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#27ae60" }}>C</span>, rightLabel: "c" },
            { id: "D", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#F57F17" }}>D</span>, rightLabel: "d" },
          ]}
          onScore={onScore}
        />
      );

    case "number-matching":
      return (
        <TapMatchGame
          pairs={[
            { id: "1", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#1565C0" }}>1</span>, rightLabel: "•" },
            { id: "2", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#E53935" }}>2</span>, rightLabel: "• •" },
            { id: "3", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#27ae60" }}>3</span>, rightLabel: "• • •" },
            { id: "4", leftLabel: <span style={{ fontSize: 42, fontWeight: 900, color: "#F57F17" }}>4</span>, rightLabel: "• • • •" },
          ]}
          onScore={onScore}
        />
      );

    case "picture-id":
      return <PictureIDGame onScore={onScore} />;

    case "size-sorting":
      return <SizeSortingGame onScore={onScore} />;

    default:
      return (
        <div style={{ textAlign: "center", color: "#546E7A", fontFamily: P, fontSize: 18 }}>
          Activity not found.
        </div>
      );
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LearningScreenPage() {
  const { activityId = "shape-matching" } =
    useParams<{ activityId: string }>();

  const navigate = useNavigate();

  const config =
    REGISTRY[activityId] ?? REGISTRY["shape-matching"];

  const TOTAL_TIME = 120;

  const [timeLeft, setTimeLeft] =
    useState(TOTAL_TIME);

  const [score, setScore] = useState(0);

  const [celebrate, setCelebrate] =
    useState(false);

  const [showScore, setShowScore] =
    useState(false);

  const [mascotMood, setMascotMood] =
    useState<MascotMood>("idle");

  const [message, setMessage] =
    useState("Let's explore! 🚀");

  const [gameKey, setGameKey] =
    useState(0);

  const timerRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const activeRef = useRef(true);

  const stopTimer = useCallback(() => {
    activeRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    activeRef.current = true;

    timerRef.current = setInterval(() => {
      if (!activeRef.current) return;

      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setShowScore(true);
          return 0;
        }

        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    setTimeLeft(TOTAL_TIME);
    setScore(0);
    setShowScore(false);
    setCelebrate(false);
    setMascotMood("idle");
    setMessage("Let's explore! 🚀");

    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey]);

  const handleScore = useCallback((n: number) => {
    setScore((prev) => {

      if (n > prev) {
        setMascotMood("happy");
        setMessage("Amazing! ⭐");

        setTimeout(() => {
          setMascotMood("idle");
          setMessage("Keep exploring! 🚀");
        }, 1200);
      }

      return n;
    });
  }, []);

  const handleSubmit = () => {
    stopTimer();

    if (score === config.totalItems) {
      setCelebrate(true);
      setMascotMood("celebrate");
      setMessage("Mission complete! 🎉");

      setTimeout(() => {
        setCelebrate(false);
      }, 2200);
    }

    setShowScore(true);
  };

  const handleRetry = () => {
    setGameKey((k) => k + 1);
  };

  const allDone =
    score >= config.totalItems;

  const progress =
    config.totalItems > 0
      ? Math.min(
          (score / config.totalItems) * 100,
          100
        )
      : 0;

  const timeProgress =
    Math.max(
      0,
      Math.min(
        (timeLeft / TOTAL_TIME) * 100,
        100
      )
    );

  const isLowTime = timeLeft <= 30;

  const activityName =
    config.title ||
    activityId
      .replaceAll("-", " ")
      .replace(/\b\w/g, (c) =>
        c.toUpperCase()
      );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% -10%, rgba(124,58,237,.35), transparent 35%), radial-gradient(circle at 100% 60%, rgba(6,182,212,.12), transparent 30%), #070b24",
        color: "#fff",
        fontFamily: P,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >

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
          ["8%", "15%", "✦"],
          ["18%", "72%", "✧"],
          ["30%", "10%", "·"],
          ["45%", "80%", "✦"],
          ["62%", "18%", "✧"],
          ["74%", "70%", "·"],
          ["88%", "24%", "✦"],
          ["94%", "82%", "✧"],
        ].map(([left, top, symbol], i) => (
          <motion.span
            key={i}
            animate={{
              opacity: [0.15, 0.7, 0.15],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + i * 0.35,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            style={{
              position: "absolute",
              left,
              top,
              color:
                i % 2 === 0
                  ? "#a78bfa"
                  : "#67e8f9",
              fontSize:
                i % 3 === 0 ? 18 : 11,
            }}
          >
            {symbol}
          </motion.span>
        ))}

      </div>

      {/* =====================================================
          TOP MISSION BAR
      ===================================================== */}

      <header
        style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          background:
            "rgba(7,11,36,.88)",
          borderBottom:
            "1px solid rgba(255,255,255,.08)",
          backdropFilter:
            "blur(20px)",
        }}
      >

        {/* Exit */}

        <Link
          to="/activities"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 14px",
            borderRadius: 12,
            color: "#94a3b8",
            background:
              "rgba(255,255,255,.04)",
            border:
              "1px solid rgba(255,255,255,.07)",
            fontSize: 15,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          ← Exit
        </Link>

        {/* Mission title */}

        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
          }}
        >

          <motion.div
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            style={{
              fontSize: 25,
            }}
          >
            {config.icon}
          </motion.div>

          <div
            style={{
              minWidth: 0,
              textAlign: "center",
            }}
          >

            <div
              style={{
                color: "#64748b",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".2em",
                textTransform: "uppercase",
              }}
            >
              ACTIVE MISSION
            </div>

            <h1
              style={{
                margin: "2px 0 0",
                fontSize: 16,
                fontWeight: 900,
                color: "#fff",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activityName}
            </h1>

          </div>

        </div>

        {/* XP */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >

          <div
            style={{
              display: "none",
            }}
            className="sm:flex"
          >
            ⭐
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              background:
                "rgba(250,204,21,.07)",
              border:
                "1px solid rgba(250,204,21,.12)",
              color: "#facc15",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            {score} XP
          </div>

        </div>

        {/* Timer */}

        <div
          style={{
            minWidth: 88,
            padding: "8px 12px",
            borderRadius: 12,
            textAlign: "center",
            background: isLowTime
              ? "rgba(244,63,94,.1)"
              : "rgba(34,211,238,.06)",
            border: isLowTime
              ? "1px solid rgba(244,63,94,.25)"
              : "1px solid rgba(34,211,238,.12)",
          }}
        >

          <motion.div
            animate={
              isLowTime
                ? {
                    scale: [1, 1.06, 1],
                  }
                : {}
            }
            transition={{
              duration: 0.6,
              repeat: Infinity,
            }}
            style={{
              color: isLowTime
                ? "#fb7185"
                : "#67e8f9",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            ⏱{" "}
            {Math.floor(timeLeft / 60)
              .toString()
              .padStart(2, "0")}
            :
            {(timeLeft % 60)
              .toString()
              .padStart(2, "0")}
          </motion.div>

        </div>

      </header>

      {/* =====================================================
          MISSION PROGRESS
      ===================================================== */}

      <div
        style={{
          position: "relative",
          zIndex: 4,
          padding: "12px 20px",
          background:
            "rgba(7,11,36,.72)",
        }}
      >

        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontSize: 12,
              fontWeight: 900,
              color: "#64748b",
              letterSpacing: ".12em",
            }}
          >
            <span>
              MISSION PROGRESS
            </span>

            <span
              style={{
                color: config.color,
              }}
            >
              {score} / {config.totalItems}
            </span>
          </div>

          <div
            style={{
              height: 8,
              borderRadius: 999,
              background:
                "rgba(255,255,255,.06)",
              overflow: "hidden",
            }}
          >

            <motion.div
              animate={{
                width: `${progress}%`,
              }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 20,
              }}
              style={{
                height: "100%",
                borderRadius: 999,
                background:
                  `linear-gradient(90deg, ${config.color}, #67e8f9)`,
                boxShadow:
                  `0 0 18px ${config.color}66`,
              }}
            />

          </div>

        </div>

      </div>

      {/* =====================================================
          MAIN GAME AREA
      ===================================================== */}

      <main
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          width: "100%",
          maxWidth: 1150,
          margin: "0 auto",
          padding: "20px 18px 110px",
          boxSizing: "border-box",
        }}
      >

        {/* Mission instruction */}

        <motion.div
          initial={{
            opacity: 0,
            y: -8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          style={{
            maxWidth: 700,
            margin: "0 auto 18px",
            textAlign: "center",
          }}
        >

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 13px",
              borderRadius: 999,
              background:
                `${config.color}12`,
              border:
                `1px solid ${config.color}2e`,
              color: config.color,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: ".05em",
            }}
          >
            🎯 {config.instruction}
          </div>

        </motion.div>

        {/* =================================================
            GAME CARD
        ================================================= */}

        <div
          style={{
            maxWidth: 950,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns:
              "minmax(150px,190px) 1fr",
            gap: 18,
            alignItems: "stretch",
          }}
          className="max-md:grid-cols-1"
        >

          {/* ===============================================
              MASCOT PANEL
          =============================================== */}

          <motion.aside
            initial={{
              opacity: 0,
              x: -15,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                "linear-gradient(145deg,rgba(124,58,237,.1),rgba(6,182,212,.05))",
              border:
                "1px solid rgba(255,255,255,.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 300,
            }}
          >

            <div
              style={{
                marginBottom: 10,
                color: "#64748b",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: ".18em",
              }}
            >
              YOUR GUIDE
            </div>

            <SpeechBubble
              message={message}
            />

            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            >
              <Mascot
                mood={mascotMood}
              />
            </motion.div>

            {/* Score */}

            <div
              style={{
                width: "100%",
                marginTop: 12,
                padding: "12px",
                borderRadius: 16,
                background:
                  "rgba(255,255,255,.04)",
                border:
                  "1px solid rgba(255,255,255,.07)",
                textAlign: "center",
              }}
            >

              <div
                style={{
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: ".14em",
                }}
              >
                SCORE
              </div>

              <div
                style={{
                  marginTop: 3,
                  color: config.color,
                  fontSize: 23,
                  fontWeight: 900,
                }}
              >
                {score}
                <span
                  style={{
                    color: "#475569",
                    fontSize: 16,
                  }}
                >
                  {" "}
                  / {config.totalItems}
                </span>
              </div>

            </div>

          </motion.aside>

          {/* ===============================================
              GAME
          =============================================== */}

          <motion.section
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.35,
            }}
            style={{
              position: "relative",
              minHeight: 400,
              borderRadius: 28,
              background:
                "rgba(255,255,255,.035)",
              border:
                "1px solid rgba(255,255,255,.09)",
              boxShadow:
                "0 25px 70px rgba(0,0,0,.22)",
              overflow: "hidden",
            }}
          >

            {/* Game card glow */}

            <div
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background:
                  `${config.color}12`,
                filter: "blur(60px)",
                left: "50%",
                top: "20%",
                transform:
                  "translate(-50%,-50%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                minHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 22,
                boxSizing: "border-box",
              }}
            >

              <AnimatePresence
                mode="wait"
              >
                <motion.div
                  key={gameKey}
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -16,
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent:
                      "center",
                  }}
                >
                  <GameView
                    activityId={activityId}
                    onScore={handleScore}
                  />
                </motion.div>
              </AnimatePresence>

            </div>

          </motion.section>

        </div>

      </main>

      {/* =====================================================
          BOTTOM CONTROL BAR
      ===================================================== */}

      <footer
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          padding: "11px 18px",
          background:
            "rgba(7,11,36,.9)",
          borderTop:
            "1px solid rgba(255,255,255,.08)",
          backdropFilter:
            "blur(18px)",
        }}
      >

        <div
          style={{
            maxWidth: 1150,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >

          {/* Progress dots */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >

            {Array.from(
              {
                length:
                  config.totalItems,
              },
              (_, i) => (
                <motion.div
                  key={i}
                  animate={
                    i < score
                      ? {
                          scale: [1, 1.2, 1],
                        }
                      : {}
                  }
                  style={{
                    width: i < score ? 11 : 8,
                    height: i < score ? 11 : 8,
                    borderRadius: "50%",
                    background:
                      i < score
                        ? config.color
                        : "rgba(255,255,255,.12)",
                    boxShadow:
                      i < score
                        ? `0 0 10px ${config.color}`
                        : "none",
                  }}
                />
              )
            )}

          </div>

          {/* Time progress */}

          <div
            style={{
              display: "none",
            }}
            className="md:flex"
          >
            <div
              style={{
                width: 130,
                height: 4,
                borderRadius: 999,
                background:
                  "rgba(255,255,255,.06)",
                overflow: "hidden",
              }}
            >

              <motion.div
                animate={{
                  width: `${timeProgress}%`,
                }}
                style={{
                  height: "100%",
                  borderRadius: 999,
                  background: isLowTime
                    ? "#fb7185"
                    : "#67e8f9",
                }}
              />

            </div>
          </div>

          {/* Actions */}

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >

            <motion.button
              whileHover={{
                scale: 1.04,
              }}
              whileTap={{
                scale: 0.96,
              }}
              onClick={handleRetry}
              style={{
                border:
                  "1px solid rgba(255,255,255,.1)",
                background:
                  "rgba(255,255,255,.05)",
                color: "#94a3b8",
                borderRadius: 11,
                padding:
                  "9px 13px",
                fontFamily: P,
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🔄 Reset
            </motion.button>

            <motion.button
              whileHover={
                allDone
                  ? {
                      scale: 1.04,
                      y: -1,
                    }
                  : {}
              }
              whileTap={
                allDone
                  ? {
                      scale: 0.96,
                    }
                  : {}
              }
              onClick={
                allDone
                  ? handleSubmit
                  : undefined
              }
              disabled={!allDone}
              style={{
                border: "none",
                borderRadius: 11,
                padding:
                  "9px 18px",
                fontFamily: P,
                fontSize: 14,
                fontWeight: 900,
                cursor: allDone
                  ? "pointer"
                  : "not-allowed",
                color: "#fff",
                background: allDone
                  ? `linear-gradient(135deg,${config.color},#7c3aed)`
                  : "rgba(255,255,255,.08)",
                opacity: allDone
                  ? 1
                  : 0.55,
                boxShadow: allDone
                  ? `0 8px 25px ${config.color}33`
                  : "none",
              }}
            >
              🚀 Finish Mission
            </motion.button>

          </div>

        </div>

      </footer>

      {/* =====================================================
          CELEBRATION
      ===================================================== */}

      <AnimatePresence>
        {celebrate && (
          <CelebrationBurst />
        )}
      </AnimatePresence>

      {/* =====================================================
          SCORE SCREEN
      ===================================================== */}

      <AnimatePresence>
        {showScore && (
          <ScoreCard
            score={score}
            total={config.totalItems}
            time={timeLeft}
            activityTitle={
              config.title
            }
            onNext={() =>
              navigate("/activities")
            }
            onRetry={
              handleRetry
            }
          />
        )}
      </AnimatePresence>

    </div>
  );
}
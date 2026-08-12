import { useEffect, useState } from "react";

interface Props {
  onScore: (score: number) => void;
}

const P = "Poppins, sans-serif";

/* =========================================================
   SORTING ITEMS
========================================================= */

const SORT_ITEMS = [
  {
    id: "dog",
    label: "Dog",
    emoji: "🐕",
    category: "animals",
  },
  {
    id: "cat",
    label: "Cat",
    emoji: "🐱",
    category: "animals",
  },
  {
    id: "bird",
    label: "Bird",
    emoji: "🐦",
    category: "animals",
  },
  {
    id: "car",
    label: "Car",
    emoji: "🚗",
    category: "vehicles",
  },
  {
    id: "bus",
    label: "Bus",
    emoji: "🚌",
    category: "vehicles",
  },
  {
    id: "plane",
    label: "Plane",
    emoji: "✈️",
    category: "vehicles",
  },
];

/* =========================================================
   DROP ZONES
========================================================= */

const BINS = [
  {
    id: "animals",
    label: "Animals",
    icon: "🐾",
    color: "#8B5CF6",
    glow: "rgba(139,92,246,.18)",
    description: "Living creatures",
  },
  {
    id: "vehicles",
    label: "Vehicles",
    icon: "🚀",
    color: "#06B6D4",
    glow: "rgba(6,182,212,.18)",
    description: "Things that travel",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function DragDropSorting({
  onScore,
}: Props) {
  const [binContents, setBinContents] =
    useState<Record<string, string[]>>({
      animals: [],
      vehicles: [],
    });

  const [wrongBin, setWrongBin] =
    useState<string | null>(null);

  const [dragging, setDragging] =
    useState<string | null>(null);

  const [hoverBin, setHoverBin] =
    useState<string | null>(null);

  const [lastCorrect, setLastCorrect] =
    useState<string | null>(null);

  /* =====================================================
     SCORE
  ===================================================== */

  const allSorted =
    Object.values(binContents).flat();

  const score = allSorted.filter((id) => {
    const item = SORT_ITEMS.find(
      (i) => i.id === id
    );

    if (!item) return false;

    const currentBin =
      Object.entries(binContents).find(
        ([, items]) =>
          items.includes(id)
      )?.[0];

    return item.category === currentBin;
  }).length;

  useEffect(() => {
    onScore(score);
  }, [score, onScore]);

  /* =====================================================
     DROP HANDLER
  ===================================================== */

  const handleDrop = (
    binId: string,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    setHoverBin(null);

    const itemId =
      e.dataTransfer.getData(
        "itemId"
      );

    const item = SORT_ITEMS.find(
      (i) => i.id === itemId
    );

    if (!item) return;

    /* -----------------------------------------------
       CORRECT
    ----------------------------------------------- */

    if (item.category === binId) {
      setBinContents((prev) => {
        if (
          prev[binId].includes(itemId)
        ) {
          return prev;
        }

        return {
          ...prev,
          [binId]: [
            ...prev[binId],
            itemId,
          ],
        };
      });

      setLastCorrect(itemId);

      window.setTimeout(() => {
        setLastCorrect(null);
      }, 900);
    }

    /* -----------------------------------------------
       WRONG
    ----------------------------------------------- */

    else {
      setWrongBin(binId);

      window.setTimeout(() => {
        setWrongBin(null);
      }, 700);
    }

    setDragging(null);
  };

  /* =====================================================
     DRAG START
  ===================================================== */

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    itemId: string
  ) => {
    e.dataTransfer.setData(
      "itemId",
      itemId
    );

    e.dataTransfer.effectAllowed =
      "move";

    setDragging(itemId);
  };

  /* =====================================================
     DRAG END
  ===================================================== */

  const handleDragEnd = () => {
    setDragging(null);
    setHoverBin(null);
  };

  /* =====================================================
     SORTED ITEMS
  ===================================================== */

  const sortedIds = new Set(
    Object.values(binContents).flat()
  );

  const remainingCount =
    SORT_ITEMS.length -
    sortedIds.size;

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      style={{
        width: "100%",
        fontFamily: P,
      }}
    >
      {/* =================================================
          GALAXY HEADER
      ================================================= */}

      <div style={styles.header}>
        <div>
          <div
            style={
              styles.eyebrow
            }
          >
            🚀 GALAXY SORTING MISSION
          </div>

          <h2
            style={
              styles.title
            }
          >
            Send each object
            to its planet
          </h2>

          <p
            style={
              styles.subtitle
            }
          >
            Drag every object into
            the correct category.
          </p>
        </div>

        {/* Floating planet */}

        <div
          className="sortingPlanet"
          style={
            styles.planet
          }
        >
          🪐
        </div>
      </div>

      {/* =================================================
          PROGRESS
      ================================================= */}

      <div
        style={
          styles.progressArea
        }
      >
        <div
          style={
            styles.progressHeader
          }
        >
          <span>
            Mission Progress
          </span>

          <strong>
            {score} /{" "}
            {SORT_ITEMS.length}
          </strong>
        </div>

        <div
          style={
            styles.progressTrack
          }
        >
          <div
            style={{
              ...styles.progressFill,
              width: `${
                (score /
                  SORT_ITEMS.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      {/* =================================================
          DROP PLANETS
      ================================================= */}

      <div
        style={
          styles.bins
        }
      >
        {BINS.map((bin) => {
          const isWrong =
            wrongBin === bin.id;

          const isHover =
            hoverBin === bin.id;

          return (
            <div
              key={bin.id}
              onDragOver={(e) => {
                e.preventDefault();

                if (
                  dragging
                ) {
                  setHoverBin(
                    bin.id
                  );
                }
              }}
              onDragLeave={() =>
                setHoverBin(null)
              }
              onDrop={(e) =>
                handleDrop(
                  bin.id,
                  e
                )
              }
              style={{
                ...styles.bin,
                borderColor:
                  isWrong
                    ? "#EF4444"
                    : isHover
                    ? bin.color
                    : "rgba(148,163,184,.35)",

                background:
                  isWrong
                    ? "rgba(239,68,68,.10)"
                    : isHover
                    ? bin.glow
                    : "#F8FBFF",

                boxShadow:
                  isHover
                    ? `0 0 30px ${bin.glow}`
                    : "none",

                transform:
                  isHover
                    ? "translateY(-4px) scale(1.02)"
                    : "translateY(0) scale(1)",
              }}
            >
              {/* Planet icon */}

              <div
                style={{
                  ...styles.binIcon,
                  background:
                    bin.glow,
                  borderColor:
                    bin.color,
                }}
              >
                {bin.icon}
              </div>

              {/* Title */}

              <div
                style={{
                  ...styles.binTitle,
                  color:
                    bin.color,
                }}
              >
                {bin.label}
              </div>

              <div
                style={
                  styles.binDescription
                }
              >
                {isWrong
                  ? "❌ Try another planet"
                  : isHover
                  ? "✨ Release here!"
                  : bin.description}
              </div>

              {/* Placed objects */}

              <div
                style={
                  styles.placedItems
                }
              >
                {binContents[
                  bin.id
                ].map((id) => {
                  const item =
                    SORT_ITEMS.find(
                      (i) =>
                        i.id === id
                    );

                  if (!item)
                    return null;

                  const justPlaced =
                    lastCorrect ===
                    id;

                  return (
                    <div
                      key={id}
                      style={{
                        ...styles.placedItem,
                        borderColor:
                          bin.color,
                        background:
                          `${bin.color}12`,
                        animation:
                          justPlaced
                            ? "correctPop .5s ease"
                            : undefined,
                      }}
                    >
                      <span
                        style={
                          styles.placedEmoji
                        }
                      >
                        {
                          item.emoji
                        }
                      </span>

                      <span>
                        {item.label}
                      </span>

                      <span>
                        ✓
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}

              {binContents[
                bin.id
              ].length === 0 && (
                <div
                  style={
                    styles.emptyBin
                  }
                >
                  {isHover
                    ? "Drop object here"
                    : "Drop items here"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =================================================
          OBJECTS
      ================================================= */}

      <div
        style={
          styles.objectsHeader
        }
      >
        <div>
          <span>
            🛰️ Objects waiting
          </span>

          <small>
            Drag them to the
            correct planet
          </small>
        </div>

        <strong>
          {remainingCount}{" "}
          remaining
        </strong>
      </div>

      <div
        style={
          styles.objects
        }
      >
        {SORT_ITEMS.map(
          (item) => {
            const placed =
              sortedIds.has(
                item.id
              );

            const isDragging =
              dragging ===
              item.id;

            return (
              <div
                key={item.id}
                draggable={!placed}
                onDragStart={(e) =>
                  handleDragStart(
                    e,
                    item.id
                  )
                }
                onDragEnd={
                  handleDragEnd
                }
                style={{
                  ...styles.object,
                  opacity: placed
                    ? 0.25
                    : 1,

                  transform:
                    isDragging
                      ? "translateY(-8px) scale(1.05)"
                      : placed
                      ? "scale(.92)"
                      : "scale(1)",

                  borderColor:
                    isDragging
                      ? "#8B5CF6"
                      : "#D7E1EA",

                  boxShadow:
                    isDragging
                      ? "0 14px 30px rgba(139,92,246,.25)"
                      : "0 5px 15px rgba(21,101,192,.06)",

                  cursor: placed
                    ? "default"
                    : "grab",
                }}
              >
                {/* Emoji */}

                <span
                  style={
                    styles.objectEmoji
                  }
                >
                  {item.emoji}
                </span>

                {/* Name */}

                <span>
                  {item.label}
                </span>

                {/* Drag indicator */}

                {!placed &&
                  isDragging && (
                    <span
                      style={
                        styles.dragIndicator
                      }
                    >
                      ✦
                    </span>
                  )}

                {/* Completed */}

                {placed && (
                  <span
                    style={
                      styles.completed
                    }
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* =================================================
          COMPLETION MESSAGE
      ================================================= */}

      {score ===
        SORT_ITEMS.length && (
        <div
          style={
            styles.complete
          }
        >
          <div
            style={
              styles.completeIcon
            }
          >
            🏆
          </div>

          <div>
            <strong>
              Mission Complete!
            </strong>

            <span>
              You sorted every
              object correctly! 🚀
            </span>
          </div>
        </div>
      )}

      {/* =================================================
          TIP
      ================================================= */}

      <div
        style={
          styles.tip
        }
      >
        💡 Tip: Look at the
        object and decide which
        planet it belongs to.
      </div>

      {/* =================================================
          ANIMATIONS
      ================================================= */}

      <style>{`
        @keyframes sortingPlanetFloat {
          0%, 100% {
            transform: translateY(0px) rotate(-4deg);
          }

          50% {
            transform: translateY(-8px) rotate(4deg);
          }
        }

        @keyframes correctPop {
          0% {
            transform: scale(.7);
            opacity: .4;
          }

          70% {
            transform: scale(1.08);
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes completeGlow {
          0%, 100% {
            box-shadow:
              0 0 0 rgba(139,92,246,0);
          }

          50% {
            box-shadow:
              0 0 30px rgba(139,92,246,.25);
          }
        }

        .sortingPlanet {
          animation:
            sortingPlanetFloat
            4s
            ease-in-out
            infinite;
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles: any = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 20,
    marginBottom: 20,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: 800,
    color: "#8B5CF6",
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  title: {
    fontFamily: P,
    fontSize: 23,
    fontWeight: 800,
    color: "#0D2137",
    margin:
      "0 0 4px",
  },

  subtitle: {
    fontFamily: P,
    fontSize: 11,
    color: "#4A6580",
    margin: 0,
  },

  planet: {
    width: 70,
    height: 70,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 40,
    flexShrink: 0,
    background:
      "radial-gradient(circle at 30% 25%, #E0F2FE, #A78BFA 45%, #312E81)",
    boxShadow:
      "0 0 30px rgba(139,92,246,.22)",
  },

  progressArea: {
    marginBottom: 22,
  },

  progressHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    fontSize: 9,
    color: "#64748B",
    marginBottom: 6,
    fontFamily: P,
  },

  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 99,
    background:
      "#E8EEF5",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 99,
    background:
      "linear-gradient(90deg,#1565C0,#8B5CF6,#06B6D4)",
    transition:
      "width .4s ease",
  },

  bins: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 16,
    marginBottom: 24,
  },

  bin: {
    minHeight: 210,
    border:
      "2px dashed",
    borderRadius: 20,
    padding: 18,
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    transition:
      "all .2s ease",
  },

  binIcon: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    border: "1px solid",
    display: "grid",
    placeItems: "center",
    fontSize: 27,
    marginBottom: 7,
  },

  binTitle: {
    fontFamily: P,
    fontSize: 15,
    fontWeight: 800,
  },

  binDescription: {
    fontFamily: P,
    fontSize: 9,
    color: "#7A91A8",
    marginTop: 3,
    minHeight: 16,
  },

  placedItems: {
    width: "100%",
    display: "flex",
    flexDirection:
      "column",
    gap: 6,
    marginTop: 10,
  },

  placedItem: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    gap: 7,
    border:
      "1px solid",
    borderRadius: 10,
    padding:
      "6px 9px",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: P,
    color: "#263B50",
  },

  placedEmoji: {
    fontSize: 17,
  },

  emptyBin: {
    color: "#94A3B8",
    fontSize: 9,
    marginTop: 15,
    fontFamily: P,
  },

  objectsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 10,
    fontFamily: P,
  },

  objects: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent:
      "center",
    gap: 10,
    minHeight: 62,
  },

  object: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding:
      "11px 15px",
    background: "#fff",
    border:
      "1.5px solid",
    borderRadius: 14,
    fontFamily: P,
    fontSize: 11,
    fontWeight: 800,
    color: "#263B50",
    userSelect: "none",
    transition:
      "all .2s ease",
  },

  objectEmoji: {
    fontSize: 21,
  },

  dragIndicator: {
    position: "absolute",
    right: -6,
    top: -7,
    width: 18,
    height: 18,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "#8B5CF6",
    color: "#fff",
    fontSize: 9,
  },

  completed: {
    color: "#16A34A",
    fontWeight: 900,
  },

  complete: {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "center",
    gap: 12,
    margin:
      "20px auto 0",
    padding:
      "12px 18px",
    width: "fit-content",
    borderRadius: 14,
    background:
      "linear-gradient(90deg,rgba(139,92,246,.08),rgba(6,182,212,.08))",
    border:
      "1px solid rgba(139,92,246,.18)",
    animation:
      "completeGlow 2s ease-in-out infinite",
  },

  completeIcon: {
    fontSize: 30,
  },

  tip: {
    textAlign: "center",
    marginTop: 18,
    color: "#64748B",
    fontSize: 10,
    fontFamily: P,
  },
};
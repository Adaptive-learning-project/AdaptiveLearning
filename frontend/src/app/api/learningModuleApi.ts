import axios from "axios";

const BASE = axios.create({ baseURL: "http://localhost:5000" });

// ── topic display metadata ─────────────────────────────────────────────────────

const TOPIC_META: Record<string, { color: string; icon: string; skill: string }> = {
  "Hosts and access networks": { color: "#7c3aed", icon: "computer",    skill: "Networking Basics"      },
  "Physical media":            { color: "#0891b2", icon: "cable",        skill: "Hardware Concepts"      },
  "Packet switching":          { color: "#059669", icon: "swap_horiz",   skill: "Data Transmission"      },
  "Circuit switching":         { color: "#d97706", icon: "device_hub",   skill: "Network Protocols"      },
  "Internet structure":        { color: "#dc2626", icon: "language",     skill: "Internet Architecture"  },
};

function toModule(item: any) {
  const meta = TOPIC_META[item.id] ?? { color: "#7c3aed", icon: "school", skill: "Computer Networks" };
  return {
    _id:          item.id,
    moduleId:     item.id,
    title:        item.title,
    description:  item.description ?? `Learn about ${item.title}`,
    category:     item.category ?? "Academic",
    skill:        meta.skill,
    level:        "Beginner",
    duration:     item.estimatedTime ?? 15,
    ageGroups:    ["All ages"],
    objectives:   [`Understand ${item.title}`],
    steps:        ["Read content", "Answer question", "Get feedback"],
    adaptations:  ["Text explanations", "Hints available"],
    icon:         meta.icon,
    color:        meta.color,
    status:       "available",
  };
}

const FALLBACK_MODULES = Object.keys(TOPIC_META).map((id) =>
  toModule({ id, title: id, description: `Learn about ${id}`, estimatedTime: 15 })
);

// ── API calls ──────────────────────────────────────────────────────────────────

export const getLearningModules = (_params?: { category?: string }) => {
  return BASE.get("/api/learning-modules")
    .then((res) => {
      const items: any[] = res.data?.data ?? [];
      return { data: items.map(toModule) };
    })
    .catch(() => ({ data: FALLBACK_MODULES }));
};

export const getLearningModule = (
  moduleId: string,
  difficulty = "easy",
  studentId = "anonymous"
) => {
  return BASE.get(`/api/learning-modules/${encodeURIComponent(moduleId)}`, {
    params: { difficulty, student_id: studentId },
  }).then((res) => ({ data: res.data }));
};

export const submitAnswer = (
  moduleId: string,
  data: { student_id: string; answer: string }
) => {
  return BASE.post(
    `/api/learning-modules/${encodeURIComponent(moduleId)}/answer`,
    { student_id: data.student_id, answer: data.answer, question_id: "" }
  ).then((res) => ({ data: res.data }));
};

export const getSession = (studentId: string, moduleId: string) => {
  return BASE.get("/api/session", {
    params: { student_id: studentId, module_id: moduleId },
  }).then((res) => ({ data: res.data }));
};

export const getMastery = (studentId: string) => {
  return BASE.get(`/api/mastery/${encodeURIComponent(studentId)}`).then(
    (res) => ({ data: res.data })
  );
};

export default BASE;

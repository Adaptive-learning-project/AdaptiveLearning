import axios from "axios";

const BASE = axios.create({ baseURL: "" }); // proxied via Vite → http://127.0.0.1:5000

// ── Student adaptive API (real flow) ──────────────────────────────────────────
// All topic/content data comes from the backend — nothing hardcoded here.

export const getLearningModules = (_params?: { category?: string }) => {
  // Fetch only approved topics from the real student API
  return BASE.get("/api/student/topics").then((res) => {
    const topics: any[] = res.data?.topics ?? [];
    // Only expose topics that have at least one approved subtopic
    const ready = topics.filter((t: any) => t.approved_subtopics > 0);
    return {
      data: ready.map((t: any) => ({
        _id:         t.unit_id,
        moduleId:    t.unit_id,
        title:       t.topic,
        description: `${t.approved_subtopics} lesson${t.approved_subtopics !== 1 ? "s" : ""} ready`,
        category:    "Academic",
        skill:       t.topic,
        level:       "Adaptive",
        duration:    t.approved_subtopics * 10,
        ageGroups:   ["All ages"],
        objectives:  [`Understand ${t.topic}`],
        steps:       ["Read content", "Answer question", "Get adaptive feedback"],
        adaptations: ["Hint system", "Simplified re-explanation", "Teacher escalation"],
        icon:        "school",
        color:       "#7c3aed",
        status:      "available",
      })),
    };
  });
};

// Not used in the new adaptive flow — kept for backward compat with LearningModuleDetailsPage
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

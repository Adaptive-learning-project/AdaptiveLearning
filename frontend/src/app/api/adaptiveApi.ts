import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:5000" });

// ── Teacher ────────────────────────────────────────────────────────────────

export const teacherApi = {
  createUnit: (data: { teacher_id: string; topic: string; subtopics: string[]; reference_text?: string }) =>
    api.post("/api/teacher/units", data).then(r => r.data),

  generateContent: (unit_id: string) =>
    api.post(`/api/teacher/units/${unit_id}/generate`).then(r => r.data),

  getUnitStatus: (unit_id: string) =>
    api.get(`/api/teacher/units/${unit_id}/status`).then(r => r.data),

  reviewContent: (unit_id: string) =>
    api.get(`/api/teacher/units/${unit_id}/review`).then(r => r.data),

  approveSubtopic: (subtopic_id: string) =>
    api.post("/api/teacher/approve", { subtopic_id }).then(r => r.data),

  listUnits: (teacher_id: string) =>
    api.get("/api/teacher/units", { params: { teacher_id } }).then(r => r.data),

  getEscalations: () =>
    api.get("/api/teacher/escalations").then(r => r.data),

  resolveEscalation: (escalation_id: string, teacher_note?: string) =>
    api.post("/api/teacher/escalations/resolve", { escalation_id, teacher_note }).then(r => r.data),
};

// ── Student ────────────────────────────────────────────────────────────────

export const studentApi = {
  getTopics: () =>
    api.get("/api/student/topics").then(r => r.data),

  getNextActivity: (student_id: string, unit_id: string) =>
    api.get("/api/student/next-activity", { params: { student_id, unit_id } }).then(r => r.data),

  submitAnswer: (data: { student_id: string; subtopic_id: string; selected_option: number; hint_used: boolean }) =>
    api.post("/api/student/submit-answer", data).then(r => r.data),

  getMastery: (student_id: string, unit_id: string) =>
    api.get("/api/student/mastery", { params: { student_id, unit_id } }).then(r => r.data),
};

export default api;

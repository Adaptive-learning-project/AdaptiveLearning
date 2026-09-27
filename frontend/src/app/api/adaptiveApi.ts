import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// EXISTING TYPES
// ============================================================

export interface TopicItem {
  unit_id: string;
  topic: string;
  approved_subtopics: number;
}

export interface PedagogicalActivityPayload {
  type:
    | "question"
    | "scaffold_hint"
    | "analogy_stepdown";
  badge?: string;
  tier?: string;
  explanation?: string;
  hint?: string;
  analogy_text?: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface ActivityResponse {
  unit_id: string;
  subtopic_id: string;
  subtopic_name: string;
  topic?: string;
  mastery_score: number;
  p_l: number;
  cognitive_state: string;
  action?: string;
  consecutive_wrong?: number;
  progress?: {
    done: number;
    total: number;
  };
  zone?: string;
  completed?: boolean;
  message?: string;
  activity_payload?: PedagogicalActivityPayload;

  question?: {
    text: string;
    options: string[];
    correct: number;
    difficulty: "easy" | "medium" | "hard";
    explanation: string;
    error_tags?: string[];
  } | null;

  content?: any;
  content_type?: string | null;
  diagnostic_question?: any;
}

export interface SubmitAnswerPayload {
  student_id: string;
  unit_id: string;
  subtopic_id: string;
  subtopic_name?: string;
  selected_option: number;
  correct_option?: number;
  correct?: boolean;
  hint_used?: boolean;
  question_type?: string;
  response_time_ms: number;
  option_switch_count: number;
  current_difficulty?: number;
  recent_errors?: string[];
}

export interface SubmitAnswerResponse {
  correct: boolean;
  p_l: number;
  mastery_score: number;
  mastery_delta: number;
  cognitive_state: string;
  pedagogical_action: string;
  activity_payload: PedagogicalActivityPayload;

  completed?: boolean;
  subtopic_name?: string;
  p_l_after?: number;
  zone_after?: string;
  just_mastered?: boolean;

  pedagogical_decision?: {
    concept: string;
    action: string;
    difficulty: number;
    cognitive_state: string;
    intervention_goal: string;
    specific_error?: string;
  };

  next_on_the_fly_activity?: any;
}

export interface AffectiveTelemetryPayload {
  student_id: string;
  subtopic_id: string;
  question_text: string;
  click_timestamps: number[];
  option_switch_count: number;
  time_spent_seconds: number;
  total_session_seconds: number;
}

// ============================================================
// D1 - TEACHING / QUESTION TYPES
// ============================================================

export type JITActivityType =
  | "picture_choice"
  | "picture_sort"
  | "picture_match";

export interface JITVisualChoice {
  image_key: string;
  is_correct: boolean;
}

export interface JITVisualActivity {
  activity_type: JITActivityType;
  spoken_prompt: string;
  choices: JITVisualChoice[];
  generation_attempts?: number;
}

export interface JITTeachingVisual {
  image_key: string;
  role: string;
}

export interface JITTeachingContent {
  phase: "teach";
  spoken_teaching: string;
  visuals: JITTeachingVisual[];
}

export interface JITTeachingAdaptiveInfo {
  subtopic_id: string;
  subtopic_name?: string;
  learning_objective: string;
  difficulty: "easy" | "medium" | "hard";
  zone?: string;
  reason?: string;
  p_l: number;
}

export interface JITTeachingRequest {
  student_id: string;
  unit_id?: string;
  subtopic_id?: string;
}

export interface JITTeachingResponse {
  success: boolean;
  phase: "teach";
  teaching: JITTeachingContent;
  adaptive?: JITTeachingAdaptiveInfo;
  model?: string;
  generation_attempts?: number;
}

export interface JITQuestionRequest {
  student_id: string;
  unit_id?: string;
  subtopic_id?: string;
}

export interface JITQuestionResponse {
  success: boolean;
  phase: "question";
  question_id: string;
  activity: JITVisualActivity;
  adaptive?: {
    subtopic_id: string;
    learning_objective: string;
    difficulty: "easy" | "medium" | "hard";
    p_l: number;
  };
  model?: string;
  generation_attempts?: number;
}

export interface JITSubmitAnswerRequest {
  student_id: string;
  question_id: string;
  answer: string;
  response_time_ms?: number;
  option_switch_count?: number;
  audio_replay_count?: number;
  active_scaffold?: string;
}

export interface JITSubmitAnswerResponse {
  student_id: string;
  question_id: string;
  subtopic_id: string;
  correct: boolean;
  previous_mastery: number;
  new_mastery: number;
  status: "MASTERED" | "NEEDS_REMEDIATION" | "CONTINUE";
  next_step?: string;
}

export interface JITSessionResponse {
  success: boolean;
  active: boolean;
  subtopic_id?: string;
  session?: {
    phase: "teach" | "question";
    learning_objective?: string;
    difficulty?: "easy" | "medium" | "hard";
    activity_type?: JITActivityType;
    allowed_image_keys?: string[];
    teaching?: JITTeachingContent;
    question_id?: string;
    question?: JITVisualActivity;
  };
}

// ============================================================
// AUTH API
// ============================================================

export const authApi = {
  login: (
    identifier: string,
    role: string = "Student"
  ) =>
    api
      .post<{
        status: string;
        student_id?: string;
        user_id?: string;
        student_name?: string;
        name?: string;
        role: string;
      }>("/api/login", {
        identifier,
        role,
      })
      .then((r) => r.data),
};

// ============================================================
// STUDENT API
// ============================================================

export const studentApi = {
  login: (identifier: string) =>
    authApi.login(identifier, "Student"),

  getModules: () =>
    api
      .get<{
        modules: Array<{
          unit_id: string;
          topic: string;
          subtopics: string[];
          status: string;
        }>;
      }>("/api/student/modules")
      .then((r) => r.data),

  getTopics: () =>
    api
      .get<{ topics: TopicItem[] }>(
        "/api/student/topics"
      )
      .then((r) => r.data),

  getNextActivity: (
    student_id: string,
    unit_id: string
  ) =>
    api
      .get<ActivityResponse>(
        `/api/student/next-activity?student_id=${encodeURIComponent(
          student_id
        )}&unit_id=${encodeURIComponent(unit_id)}`
      )
      .then((r) => r.data),

  submitAnswer: (
    data: SubmitAnswerPayload
  ) =>
    api
      .post<SubmitAnswerResponse>(
        "/api/student/submit-answer",
        data
      )
      .then((r) => r.data),

  sendAffectiveTelemetry: (
    data: AffectiveTelemetryPayload
  ) =>
    api
      .post(
        "/api/student/affective-telemetry",
        data
      )
      .then((r) => r.data),

  getDeescalation: (
    data: {
      subtopic_name: string;
      question_text: string;
    }
  ) =>
    api
      .post(
        "/api/student/deescalate-cognitive-load",
        data
      )
      .then((r) => r.data),

  skipActivity: (
    data: {
      student_id: string;
      subtopic_id: string;
      unit_id: string;
    }
  ) =>
    api
      .post(
        "/api/student/skip-activity",
        data
      )
      .then((r) => r.data),

  submitDiagnostic: (
    data: {
      student_id: string;
      unit_id: string;
      answers: {
        subtopic_id: string;
        correct: boolean;
      }[];
    }
  ) =>
    api
      .post(
        "/api/student/diagnostic",
        data
      )
      .then((r) => r.data),
};

// ============================================================
// D1 - JIT API
// ============================================================

export const jitApi = {
  /**
   * Stage 1:
   *
   * Frontend sends learner/context identifiers only.
   * Backend decides the adaptive objective/difficulty/assets
   * and calls the teaching LLM.
   */
  generateTeaching: (
    data: JITTeachingRequest
  ) =>
    api
      .post<JITTeachingResponse>(
        "/api/student/jit-teaching",
        data
      )
      .then((r) => r.data),

  /**
   * Stage 2:
   *
   * Frontend calls this ONLY after the learner presses
   * "I Understand".
   *
   * Backend retrieves the stored teaching and generates
   * a question grounded in exactly what was taught.
   */
  generateQuestion: (
    data: JITQuestionRequest
  ) =>
    api
      .post<JITQuestionResponse>(
        "/api/student/jit-question",
        data
      )
      .then((r) => r.data),

  /**
   * Stage 3:
   *
   * Submit the selected visual image_key.
   * Backend grades it and updates BKT.
   */
  submitAnswer: (
    data: JITSubmitAnswerRequest
  ) =>
    api
      .post<JITSubmitAnswerResponse>(
        "/api/submit",
        data
      )
      .then((r) => r.data),

  /**
   * Optional recovery endpoint for browser refresh.
   */
  getSession: (
    studentId: string
  ) =>
    api
      .get<JITSessionResponse>(
        `/api/student/jit-session/${encodeURIComponent(
          studentId
        )}`
      )
      .then((r) => r.data),
};

// ============================================================
// ADMIN API
// ============================================================

export const adminApi = {
  createUnit: (data: {
    topic: string;
    subtopics: string[];
    reference_text?: string;
    teacher_id?: string;
  }) =>
    api
      .post("/api/admin/units", data)
      .then((r) => r.data),

  listUnits: () =>
    api
      .get("/api/admin/units")
      .then((r) => r.data),

  getReview: (unit_id: string) =>
    api
      .get(`/api/admin/units/${unit_id}/review`)
      .then((r) => r.data),

  getEscalations: () =>
    api
      .get("/api/admin/escalations")
      .then((r) => r.data),

  resolveEscalation: (data: {
    escalation_id: string;
    teacher_note: string;
  }) =>
    api
      .post(
        "/api/admin/escalations/resolve",
        data
      )
      .then((r) => r.data),

  listStudents: () =>
    api
      .get<{
        students: Array<{
          student_id: string;
          name: string;
          email: string;
          enabled: boolean;
          grade_or_level: string;
        }>;
      }>("/api/admin/students")
      .then((r) => r.data),

  addStudent: (data: {
    name: string;
    email?: string;
    grade_or_level?: string;
  }) =>
    api
      .post(
        "/api/admin/students",
        data
      )
      .then((r) => r.data),

  toggleStudent: (student_id: string) =>
    api
      .patch(
        `/api/admin/students/${student_id}/toggle`
      )
      .then((r) => r.data),
};

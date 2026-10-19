export interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  prompt: string;
  options: string[];
  correct_index: number;
}

export interface SubjectScore {
  subject: string;
  score: number;
  correct: number;
  wrong: number;
  blank: number;
  target: number;
}

export interface AssessmentResult {
  id: string;
  score: number;
  net: number;
  percentile: string;
  strengths: string[];
  gaps: string[];
  subjects: SubjectScore[];
  message: string;
  completed_at: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  tone: string;
}

export interface Recommendation {
  id: string;
  tag: string;
  subject: string;
  title: string;
  detail: string;
  gain: string;
  duration: string;
  tone: string;
}

export interface DashboardData {
  greeting: string;
  streak: number;
  weekly_goal: number;
  weekly_progress: number;
  metrics: DashboardMetric[];
  subject_scores: SubjectScore[];
  trend: { name: string; net: number }[];
  recommendations: Recommendation[];
  next_session: { title: string; subtitle: string; time: string; progress: string };
}

export interface ClassroomOverview {
  active_students: number;
  average_net: number;
  pending_reviews: number;
  live_room: { title: string; teacher: string; status: string };
  common_mistakes: { topic: string; count: string; note: string }[];
  students: { name: string; class: string; net: string; status: string }[];
}

export interface AdminOverview {
  active_users: number;
  weekly_completion: string;
  question_bank: number;
  role_breakdown: { role: string; value: string; percent: string }[];
  system_notes: string[];
}

export interface ChatStreamEvent {
  type: "delta" | "done";
  content?: string;
  session_id?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
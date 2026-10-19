// Hand-written mirrors of backend/models/academy.py — keep in sync with the Pydantic models.
export type Role = "student" | "teacher" | "admin";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  grade: string;
  target: string;
  class_name: string;
  bio: string;
  points: number;
  placement_done: boolean;
  overall_level: number;
  subject_levels: Record<string, number>;
  subject_scores: Record<string, number>;
}

export interface QuestionOut {
  id: string;
  subject: string;
  topic: string;
  level: number;
  context: string;
  prompt: string;
  options: string[];
}

export interface PlacementTest {
  questions: QuestionOut[];
  duration_minutes: number;
  rule: string;
}

export interface SubjectScore {
  subject: string;
  score: number;
  correct: number;
  wrong: number;
  blank: number;
  level: number;
  level_name: string;
}

export interface QuestionReview {
  question_id: string;
  subject: string;
  topic: string;
  your_answer: number;
  correct_index: number;
  explanation: string;
}

export interface PlacementResult {
  id: string;
  score: number;
  net: number;
  overall_level: number;
  level_name: string;
  subjects: SubjectScore[];
  strengths: string[];
  gaps: string[];
  message: string;
  review: QuestionReview[];
  points_awarded: number;
  completed_at: string;
}

export interface PracticeSet {
  subject: string;
  level: number;
  level_name: string;
  questions: QuestionOut[];
}

export interface PracticeAnswerOut {
  correct: boolean;
  correct_index: number;
  explanation: string;
  points_awarded: number;
  total_points: number;
}

export interface Metric {
  label: string;
  value: string;
  hint: string;
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
  level: number;
}

export interface TrendPoint {
  name: string;
  net: number;
}

export interface Dashboard {
  user: PublicUser;
  metrics: Metric[];
  subject_scores: SubjectScore[];
  trend: TrendPoint[];
  recommendations: Recommendation[];
  pending_assignments: number;
  today_pomodoros: number;
}

export interface Assignment {
  id: string;
  teacher_name: string;
  title: string;
  subject: string;
  topic: string;
  question_count: number;
  due_date: string;
  assignee_count: number;
  completed_count: number;
  target_all: boolean;
  created_at: string;
}

export interface StudentAssignment {
  id: string;
  teacher_name: string;
  title: string;
  subject: string;
  topic: string;
  question_count: number;
  due_date: string;
  completed: boolean;
}

export interface AssignmentCompleteOut {
  points_awarded: number;
  total_points: number;
}

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  class_name: string;
  grade: string;
  overall_level: number;
  points: number;
  placement_done: boolean;
  last_net: number | null;
}

export interface Participant {
  id: string;
  name: string;
  role: Role;
  overall_level: number;
}

export interface ClassMessage {
  id: string;
  user_id: string;
  user_name: string;
  role: Role;
  overall_level: number;
  kind: "message" | "question";
  text: string;
  created_at: string;
}

export interface ClassroomSummary {
  id: string;
  title: string;
  subject: string;
  code: string;
  teacher_name: string;
  status: "active" | "ended";
  participant_count: number;
  created_at: string;
}

export interface ClassroomDetail extends ClassroomSummary {
  video_url: string;
  is_teacher: boolean;
  participants: Participant[];
  messages: ClassMessage[];
}

export interface ExamRow {
  subject: string;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
  max_questions: number;
  rate: number;
  level: number;
  advice: string;
}

export type ExamType = "TYT" | "AYT-SAY" | "AYT-EA" | "AYT-SOZ";

export interface DistributionItem {
  subject: string;
  questions: number;
  group: string;
}

export interface ExamDistribution {
  exam_type: ExamType;
  label: string;
  total_questions: number;
  duration_minutes: number;
  items: DistributionItem[];
}

export interface ExamParse {
  exam_type: ExamType;
  source: string;
  parsed: boolean;
  message: string;
  rows: ExamRow[];
}

export interface ExamResult {
  id: string;
  name: string;
  exam_type: ExamType;
  total_questions: number;
  total_net: number;
  estimated_score: number;
  rows: ExamRow[];
  weakest: string;
  strongest: string;
  advice: string[];
  created_at: string;
}

export interface Author {
  id: string;
  name: string;
  overall_level: number;
  points: number;
  role: Role;
}

export interface PostAnswer {
  id: string;
  author: Author;
  text: string;
  created_at: string;
}

export interface Post {
  id: string;
  author: Author;
  subject: string;
  text: string;
  answers: PostAnswer[];
  created_at: string;
}

export interface LeaderEntry {
  id: string;
  name: string;
  points: number;
  overall_level: number;
  grade: string;
}

export interface PomodoroOut {
  points_awarded: number;
  total_points: number;
  today_count: number;
}

export interface ProfileStats {
  practice_solved: number;
  practice_correct: number;
  pomodoros: number;
  focus_minutes: number;
  posts: number;
  answers: number;
  assignments_done: number;
  exams: number;
}

export interface Profile {
  user: PublicUser;
  stats: ProfileStats;
  badges: string[];
  rank: number;
}

export interface AdminOverview {
  counts: Record<string, number>;
  users: PublicUser[];
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

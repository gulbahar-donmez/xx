from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------- Users & auth ----------
class PublicUser(BaseModel):
    id: str
    email: str
    name: str
    role: str
    grade: str = ""
    target: str = ""
    class_name: str = ""
    bio: str = ""
    points: int = 0
    placement_done: bool = False
    overall_level: int = 0
    subject_levels: Dict[str, int] = Field(default_factory=dict)
    subject_scores: Dict[str, int] = Field(default_factory=dict)


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    grade: str = "12. sınıf"
    target: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OkOut(BaseModel):
    ok: bool = True


# ---------- Questions, placement, practice ----------
class QuestionOut(BaseModel):
    id: str
    subject: str
    topic: str
    level: int
    context: str
    prompt: str
    options: List[str]


class PlacementTest(BaseModel):
    questions: List[QuestionOut]
    duration_minutes: int
    rule: str


class AnswersIn(BaseModel):
    answers: Dict[str, int] = Field(default_factory=dict)


class SubjectScore(BaseModel):
    subject: str
    score: int
    correct: int
    wrong: int
    blank: int
    level: int
    level_name: str


class QuestionReview(BaseModel):
    question_id: str
    subject: str
    topic: str
    your_answer: int
    correct_index: int
    explanation: str


class PlacementResult(BaseModel):
    id: str
    score: int
    net: float
    overall_level: int
    level_name: str
    subjects: List[SubjectScore]
    strengths: List[str]
    gaps: List[str]
    message: str
    review: List[QuestionReview]
    points_awarded: int
    completed_at: str


class PracticeSet(BaseModel):
    subject: str
    level: int
    level_name: str
    questions: List[QuestionOut]


class PracticeAnswerIn(BaseModel):
    question_id: str
    answer: int


class PracticeAnswerOut(BaseModel):
    correct: bool
    correct_index: int
    explanation: str
    points_awarded: int
    total_points: int


# ---------- Dashboard & recommendations ----------
class Metric(BaseModel):
    label: str
    value: str
    hint: str
    tone: str


class Recommendation(BaseModel):
    id: str
    tag: str
    subject: str
    title: str
    detail: str
    gain: str
    duration: str
    tone: str
    level: int


class TrendPoint(BaseModel):
    name: str
    net: float


class Dashboard(BaseModel):
    user: PublicUser
    metrics: List[Metric]
    subject_scores: List[SubjectScore]
    trend: List[TrendPoint]
    recommendations: List[Recommendation]
    pending_assignments: int
    today_pomodoros: int


# ---------- Assignments ----------
class AssignmentIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    subject: str
    topic: str = Field(min_length=2, max_length=120)
    question_count: int = Field(ge=1, le=200)
    due_date: str
    target_all: bool = False
    student_ids: List[str] = Field(default_factory=list)


class Assignment(BaseModel):
    id: str
    teacher_name: str
    title: str
    subject: str
    topic: str
    question_count: int
    due_date: str
    assignee_count: int
    completed_count: int
    target_all: bool
    created_at: str


class StudentAssignment(BaseModel):
    id: str
    teacher_name: str
    title: str
    subject: str
    topic: str
    question_count: int
    due_date: str
    completed: bool


class AssignmentCompleteOut(BaseModel):
    points_awarded: int
    total_points: int


class StudentRow(BaseModel):
    id: str
    name: str
    email: str
    class_name: str
    grade: str
    overall_level: int
    points: int
    placement_done: bool
    last_net: Optional[float] = None


# ---------- Live classroom ----------
class ClassroomIn(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    subject: str


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=12)


class ClassMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    kind: str = Field(default="message", pattern="^(message|question)$")


class Participant(BaseModel):
    id: str
    name: str
    role: str
    overall_level: int


class ClassMessage(BaseModel):
    id: str
    user_id: str
    user_name: str
    role: str
    overall_level: int
    kind: str
    text: str
    created_at: str


class ClassroomSummary(BaseModel):
    id: str
    title: str
    subject: str
    code: str
    teacher_name: str
    status: str
    participant_count: int
    created_at: str


class ClassroomDetail(ClassroomSummary):
    video_url: str
    is_teacher: bool
    participants: List[Participant]
    messages: List[ClassMessage]


# ---------- Exam upload ----------
class ExamRow(BaseModel):
    subject: str = Field(min_length=1, max_length=60)
    correct: int = Field(ge=0, le=200)
    wrong: int = Field(ge=0, le=200)
    blank: int = Field(ge=0, le=200)
    net: float = 0
    max_questions: int = 0
    rate: int = 0
    level: int = 0
    advice: str = ""


class DistributionItem(BaseModel):
    subject: str
    questions: int
    group: str


class ExamDistribution(BaseModel):
    exam_type: str
    label: str
    total_questions: int
    duration_minutes: int
    items: List[DistributionItem]


class ExamParse(BaseModel):
    exam_type: str
    source: str
    parsed: bool
    message: str
    rows: List[ExamRow]


class ExamIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    exam_type: str = Field(default="TYT", pattern="^(TYT|AYT-SAY|AYT-EA|AYT-SOZ)$")
    rows: List[ExamRow] = Field(min_length=1)


class ExamResult(BaseModel):
    id: str
    name: str
    exam_type: str
    total_questions: int
    total_net: float
    estimated_score: float
    rows: List[ExamRow]
    weakest: str
    strongest: str
    advice: List[str]
    created_at: str


# ---------- Social, pomodoro, profile ----------
class Author(BaseModel):
    id: str
    name: str
    overall_level: int
    points: int
    role: str


class PostIn(BaseModel):
    subject: str
    text: str = Field(min_length=5, max_length=2000)


class AnswerIn(BaseModel):
    text: str = Field(min_length=2, max_length=2000)


class PostAnswer(BaseModel):
    id: str
    author: Author
    text: str
    created_at: str


class Post(BaseModel):
    id: str
    author: Author
    subject: str
    text: str
    answers: List[PostAnswer]
    created_at: str


class LeaderEntry(BaseModel):
    id: str
    name: str
    points: int
    overall_level: int
    grade: str


class PomodoroIn(BaseModel):
    minutes: int = Field(ge=1, le=90)
    subject: str = "Genel"


class PomodoroOut(BaseModel):
    points_awarded: int
    total_points: int
    today_count: int


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    grade: Optional[str] = None
    target: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=280)


class ProfileStats(BaseModel):
    practice_solved: int
    practice_correct: int
    pomodoros: int
    focus_minutes: int
    posts: int
    answers: int
    assignments_done: int
    exams: int


class Profile(BaseModel):
    user: PublicUser
    stats: ProfileStats
    badges: List[str]
    rank: int


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=4000)


class AdminOverview(BaseModel):
    counts: Dict[str, int]
    users: List[PublicUser]

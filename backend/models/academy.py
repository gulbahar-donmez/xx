from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import uuid


class Question(BaseModel):
    id: str
    subject: str
    topic: str
    difficulty: str
    prompt: str
    options: List[str]
    correct_index: int


class AssessmentQuestions(BaseModel):
    questions: List[Question]
    total: int
    rule: str


class SubjectScore(BaseModel):
    subject: str
    score: int
    correct: int
    wrong: int
    blank: int
    target: int


class AssessmentSubmit(BaseModel):
    answers: Dict[str, int] = Field(default_factory=dict)


class AssessmentResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    score: int
    net: float
    percentile: str
    strengths: List[str]
    gaps: List[str]
    subjects: List[SubjectScore]
    message: str
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DashboardMetric(BaseModel):
    label: str
    value: str
    change: str
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


class DashboardData(BaseModel):
    greeting: str
    streak: int
    weekly_goal: int
    weekly_progress: int
    metrics: List[DashboardMetric]
    subject_scores: List[SubjectScore]
    trend: List[Dict[str, float | str]]
    recommendations: List[Recommendation]
    next_session: Dict[str, str]


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    context: Optional[Dict[str, str]] = None


class ClassroomOverview(BaseModel):
    active_students: int
    average_net: float
    pending_reviews: int
    live_room: Dict[str, str]
    common_mistakes: List[Dict[str, str]]
    students: List[Dict[str, str]]


class AdminOverview(BaseModel):
    active_users: int
    weekly_completion: str
    question_bank: int
    role_breakdown: List[Dict[str, str]]
    system_notes: List[str]
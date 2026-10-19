"""Yanlış defteri: auto-collected wrong answers + a weekly review test built from open mistakes."""

from fastapi import APIRouter, Depends

from lib.auth import require_roles
from lib.db import db
from lib.levels import SUBJECTS, now_iso
from lib.points import week_key
from lib.question_bank import public_question
from models.academy import MistakeNotebook, WeeklyReview

router = APIRouter(tags=["mistakes"])
student_only = require_roles("student")
REVIEW_SIZE = 10


@router.get("/mistakes", response_model=MistakeNotebook)
async def notebook(user: dict = Depends(student_only)):
    docs = await db.mistakes.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    questions = {q["id"]: q for q in await db.questions.find({"id": {"$in": [d["question_id"] for d in docs]}}, {"_id": 0}).to_list(2000)}
    docs = [d for d in docs if d["question_id"] in questions]
    docs.sort(key=lambda d: d["last_wrong_at"], reverse=True)
    docs.sort(key=lambda d: d["resolved"])  # stable: open first, newest mistakes on top
    open_count = sum(1 for d in docs if not d["resolved"])
    return {
        "total": len(docs), "open": open_count, "resolved": len(docs) - open_count,
        "by_subject": [{"subject": s, "open": sum(1 for d in docs if d["subject"] == s and not d["resolved"])} for s in SUBJECTS],
        "items": [{
            "question": public_question(questions[d["question_id"]]), "correct_index": questions[d["question_id"]]["correct_index"],
            "explanation": questions[d["question_id"]].get("explanation", ""), "wrong_count": d["wrong_count"],
            "last_wrong_at": d["last_wrong_at"], "resolved": d["resolved"],
        } for d in docs],
    }


@router.get("/mistakes/review", response_model=WeeklyReview)
async def weekly_review(user: dict = Depends(student_only)):
    """One review test per ISO week: the oldest open mistakes (max 10), frozen once created."""
    week = week_key()
    review = await db.mistake_reviews.find_one({"user_id": user["id"], "week": week}, {"_id": 0})
    open_docs = await db.mistakes.find({"user_id": user["id"], "resolved": False}, {"_id": 0, "question_id": 1}).sort("last_wrong_at", 1).to_list(2000)
    if not review or not review["question_ids"]:
        review = {"user_id": user["id"], "week": week, "question_ids": [d["question_id"] for d in open_docs[:REVIEW_SIZE]], "created_at": now_iso()}
        await db.mistake_reviews.update_one({"user_id": user["id"], "week": week}, {"$set": review}, upsert=True)
    ids = review["question_ids"]
    by_id = {q["id"]: q for q in await db.questions.find({"id": {"$in": ids}}, {"_id": 0}).to_list(REVIEW_SIZE)}
    resolved = await db.mistakes.find({"user_id": user["id"], "question_id": {"$in": ids}, "resolved": True}, {"_id": 0, "question_id": 1}).to_list(REVIEW_SIZE)
    return {"week": week, "created_at": review["created_at"], "questions": [public_question(by_id[i]) for i in ids if i in by_id],
            "resolved_ids": [r["question_id"] for r in resolved], "total_open": len(open_docs)}

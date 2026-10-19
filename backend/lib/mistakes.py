"""Mistake notebook ledger: every wrong answer (placement or practice) is upserted per
user+question; a later correct answer marks it resolved ("öğrenildi")."""

import uuid

from lib.db import db
from lib.levels import now_iso


async def record_answer(user_id: str, question: dict, correct: bool) -> None:
    key = {"user_id": user_id, "question_id": question["id"]}
    if correct:
        await db.mistakes.update_one({**key, "resolved": False}, {"$set": {"resolved": True, "resolved_at": now_iso()}})
        return
    await db.mistakes.update_one(key, {
        "$inc": {"wrong_count": 1},
        "$set": {"resolved": False, "last_wrong_at": now_iso(), "subject": question["subject"], "topic": question["topic"]},
        "$setOnInsert": {"id": str(uuid.uuid4()), "first_wrong_at": now_iso()},
    }, upsert=True)

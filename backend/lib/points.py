"""Points ledger: every award increments users.points and is logged per ISO week,
which powers the weekly class/platform league (pomodoro + help points)."""

import uuid
from datetime import date, timedelta

from lib.dates import today_iso
from lib.db import db
from lib.levels import now_iso

LEAGUE_REASONS = ["pomodoro", "answer"]


def week_key(day: date | None = None) -> str:
    year, week, _ = (day or date.fromisoformat(today_iso())).isocalendar()
    return f"{year}-W{week:02d}"


def previous_week_key() -> str:
    return week_key(date.fromisoformat(today_iso()) - timedelta(days=7))


async def award(user_id: str, amount: int, reason: str) -> int:
    if amount <= 0:
        doc = await db.users.find_one({"id": user_id}, {"_id": 0, "points": 1})
        return doc.get("points", 0) if doc else 0
    doc = await db.users.find_one_and_update({"id": user_id}, {"$inc": {"points": amount}}, projection={"_id": 0, "points": 1}, return_document=True)
    await db.points_log.insert_one({"id": str(uuid.uuid4()), "user_id": user_id, "amount": amount, "reason": reason, "week": week_key(), "created_at": now_iso()})
    return doc["points"] if doc else 0

"""Points ledger: every award increments users.points and is logged per ISO week,
which powers the weekly class/platform league (pomodoro + help points)."""

import uuid
from datetime import date, timedelta

from lib.dates import today_iso
from lib.db import db
from lib.levels import now_iso

LEAGUE_REASONS = ["pomodoro", "answer", "camp"]
CAMP_DAYS = 7  # "Kamp Ustası": 7 consecutive days with at least one pomodoro
CAMP_BONUS = 100


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


async def pomodoro_streak(user_id: str) -> int:
    """Consecutive days with a pomodoro, ending today (or yesterday if none yet today)."""
    days = set(await db.pomodoros.distinct("day", {"user_id": user_id}))
    day = date.fromisoformat(today_iso())
    if day.isoformat() not in days:
        day -= timedelta(days=1)
    streak = 0
    while day.isoformat() in days:
        streak += 1
        day -= timedelta(days=1)
    return streak

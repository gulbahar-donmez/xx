"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("email", ASCENDING)], name="email", unique=True), IndexModel([("role", ASCENDING), ("points", DESCENDING)], name="role_points")],
    "placement_results": [IndexModel([("user_id", ASCENDING), ("completed_at", DESCENDING)], name="user_completed")],
    "practice_attempts": [IndexModel([("user_id", ASCENDING), ("question_id", ASCENDING)], name="user_question")],
    "pomodoros": [IndexModel([("user_id", ASCENDING), ("day", ASCENDING)], name="user_day")],
    "assignments": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("assignee_ids", ASCENDING), ("due_date", ASCENDING)], name="assignee_due"), IndexModel([("teacher_id", ASCENDING), ("created_at", DESCENDING)], name="teacher_created")],
    "classrooms": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("code", ASCENDING), ("status", ASCENDING)], name="code_status"), IndexModel([("participants.id", ASCENDING)], name="participants")],
    "exam_results": [IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="user_created")],
    "posts": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("created_at", DESCENDING)], name="created_desc")],
    "chat_messages": [IndexModel([("session_id", ASCENDING), ("created_at", ASCENDING)], name="session_created")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)

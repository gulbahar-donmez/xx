"""Peer question board (students ask, classmates answer and earn points) + admin overview."""

import uuid

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user, require_roles
from lib.db import db
from lib.points import award
from lib.levels import POINTS, author, now_iso, public_user
from models.academy import AdminOverview, AnswerIn, Post, PostIn

router = APIRouter(tags=["social"])


async def hydrate(posts: list[dict]) -> list[dict]:
    ids = {p["author_id"] for p in posts} | {a["author_id"] for p in posts for a in p["answers"]}
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": list(ids)}}, {"_id": 0, "password_hash": 0}).to_list(1000)}
    return [{
        "id": p["id"], "subject": p["subject"], "text": p["text"], "created_at": p["created_at"], "author": author(users.get(p["author_id"])),
        "answers": [{"id": a["id"], "text": a["text"], "created_at": a["created_at"], "author": author(users.get(a["author_id"]))} for a in p["answers"]],
    } for p in posts]


@router.get("/social/posts", response_model=list[Post])
async def list_posts(user: dict = Depends(current_user)):
    return await hydrate(await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(40))


@router.post("/social/posts", response_model=Post)
async def create_post(payload: PostIn, user: dict = Depends(current_user)):
    doc = {"id": str(uuid.uuid4()), "author_id": user["id"], "subject": payload.subject, "text": payload.text.strip(), "answers": [], "created_at": now_iso()}
    await db.posts.insert_one(doc)
    await award(user["id"], POINTS["post"], "post")
    return (await hydrate([doc]))[0]


@router.post("/social/posts/{post_id}/answers", response_model=Post)
async def answer_post(post_id: str, payload: AnswerIn, user: dict = Depends(current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")
    answer = {"id": str(uuid.uuid4()), "author_id": user["id"], "text": payload.text.strip(), "created_at": now_iso()}
    await db.posts.update_one({"id": post_id}, {"$push": {"answers": answer}})
    if post["author_id"] != user["id"]:
        await award(user["id"], POINTS["answer"], "answer")
    post["answers"].append(answer)
    return (await hydrate([post]))[0]


@router.get("/admin/overview", response_model=AdminOverview)
async def admin_overview(user: dict = Depends(require_roles("admin"))):
    counts = {
        "students": await db.users.count_documents({"role": "student"}),
        "teachers": await db.users.count_documents({"role": "teacher"}),
        "admins": await db.users.count_documents({"role": "admin"}),
        "placements": await db.users.count_documents({"role": "student", "placement_done": True}),
        "exams": await db.exam_results.count_documents({}),
        "posts": await db.posts.count_documents({}),
        "active_classrooms": await db.classrooms.count_documents({"status": "active"}),
        "assignments": await db.assignments.count_documents({}),
        "pomodoros": await db.pomodoros.count_documents({}),
    }
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(200)
    return {"counts": counts, "users": [public_user(u) for u in users]}

"""Teacher tools: assignments (single student / whole class) and live classrooms."""

import os
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import current_user, require_roles
from lib.db import db
from lib.levels import POINTS, now_iso
from models.academy import (
    Assignment, AssignmentCompleteOut, AssignmentIn, ClassMessageIn, ClassroomDetail, ClassroomIn,
    ClassroomSummary, JoinIn, OkOut, StudentAssignment, StudentRow,
)

router = APIRouter(tags=["teaching"])
teacher_only = require_roles("teacher", "admin")
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


# ---------- Students ----------
@router.get("/teacher/students", response_model=list[StudentRow])
async def list_students(user: dict = Depends(teacher_only)):
    students = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(500)
    rows = []
    for s in students:
        last = await db.exam_results.find_one({"user_id": s["id"]}, {"_id": 0, "total_net": 1}, sort=[("created_at", -1)])
        rows.append({"id": s["id"], "name": s["name"], "email": s["email"], "class_name": s.get("class_name", ""), "grade": s.get("grade", ""), "overall_level": s.get("overall_level", 0), "points": s.get("points", 0), "placement_done": s.get("placement_done", False), "last_net": last["total_net"] if last else None})
    return rows


# ---------- Assignments ----------
def assignment_out(doc: dict) -> dict:
    return {**{k: doc[k] for k in ("id", "teacher_name", "title", "subject", "topic", "question_count", "due_date", "target_all", "created_at")}, "assignee_count": len(doc["assignee_ids"]), "completed_count": len(doc["completed_ids"])}


@router.post("/assignments", response_model=Assignment)
async def create_assignment(payload: AssignmentIn, user: dict = Depends(teacher_only)):
    if payload.target_all:
        assignees = [s["id"] for s in await db.users.find({"role": "student"}, {"_id": 0, "id": 1}).to_list(1000)]
    else:
        assignees = [s["id"] for s in await db.users.find({"role": "student", "id": {"$in": payload.student_ids}}, {"_id": 0, "id": 1}).to_list(1000)]
    if not assignees:
        raise HTTPException(status_code=422, detail="En az bir öğrenci seçmelisin")
    doc = {**payload.model_dump(exclude={"student_ids"}), "id": str(uuid.uuid4()), "teacher_id": user["id"], "teacher_name": user["name"], "assignee_ids": assignees, "completed_ids": [], "created_at": now_iso()}
    await db.assignments.insert_one(doc)
    return assignment_out(doc)


@router.get("/assignments", response_model=list[Assignment])
async def teacher_assignments(user: dict = Depends(teacher_only)):
    query = {} if user["role"] == "admin" else {"teacher_id": user["id"]}
    return [assignment_out(d) for d in await db.assignments.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)]


@router.get("/assignments/mine", response_model=list[StudentAssignment])
async def my_assignments(user: dict = Depends(require_roles("student"))):
    docs = await db.assignments.find({"assignee_ids": user["id"]}, {"_id": 0}).sort("due_date", 1).to_list(200)
    return [{**{k: d[k] for k in ("id", "teacher_name", "title", "subject", "topic", "question_count", "due_date")}, "completed": user["id"] in d["completed_ids"]} for d in docs]


@router.post("/assignments/{assignment_id}/complete", response_model=AssignmentCompleteOut)
async def complete_assignment(assignment_id: str, user: dict = Depends(require_roles("student"))):
    doc = await db.assignments.find_one({"id": assignment_id, "assignee_ids": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ödev bulunamadı")
    if user["id"] in doc["completed_ids"]:
        return {"points_awarded": 0, "total_points": user.get("points", 0)}
    await db.assignments.update_one({"id": assignment_id}, {"$addToSet": {"completed_ids": user["id"]}})
    updated = await db.users.find_one_and_update({"id": user["id"]}, {"$inc": {"points": POINTS["assignment"]}}, projection={"_id": 0, "points": 1}, return_document=True)
    return {"points_awarded": POINTS["assignment"], "total_points": updated["points"]}


# ---------- Live classrooms ----------
def summary(doc: dict) -> dict:
    return {**{k: doc[k] for k in ("id", "title", "subject", "code", "teacher_name", "status", "created_at")}, "participant_count": len(doc["participants"])}


async def detail(doc: dict, user: dict) -> dict:
    domain = os.environ.get("JITSI_DOMAIN", "meet.jit.si")
    return {**summary(doc), "video_url": f"https://{domain}/{doc['room_name']}", "is_teacher": doc["teacher_id"] == user["id"], "participants": doc["participants"], "messages": doc["messages"][-100:]}


def participant(user: dict) -> dict:
    return {"id": user["id"], "name": user["name"], "role": user["role"], "overall_level": user.get("overall_level", 0)}


async def load_room(classroom_id: str, user: dict) -> dict:
    doc = await db.classrooms.find_one({"id": classroom_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Sınıf bulunamadı")
    if doc["teacher_id"] != user["id"] and user["role"] != "admin" and all(p["id"] != user["id"] for p in doc["participants"]):
        raise HTTPException(status_code=403, detail="Bu sınıfa önce oda koduyla katılmalısın")
    return doc


@router.post("/classrooms", response_model=ClassroomDetail)
async def create_classroom(payload: ClassroomIn, user: dict = Depends(teacher_only)):
    doc = {
        "id": str(uuid.uuid4()), "title": payload.title, "subject": payload.subject,
        "code": "".join(secrets.choice(CODE_ALPHABET) for _ in range(6)),
        "room_name": f"AkademiAI-{secrets.token_urlsafe(18).replace('-', '').replace('_', '')}",
        "teacher_id": user["id"], "teacher_name": user["name"], "status": "active",
        "participants": [participant(user)], "messages": [], "created_at": now_iso(),
    }
    await db.classrooms.insert_one(doc)
    return await detail(doc, user)


@router.get("/classrooms", response_model=list[ClassroomSummary])
async def list_classrooms(user: dict = Depends(current_user)):
    if user["role"] == "student":
        query = {"participants.id": user["id"]}
    elif user["role"] == "teacher":
        query = {"teacher_id": user["id"]}
    else:
        query = {}
    return [summary(d) for d in await db.classrooms.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)]


@router.post("/classrooms/join", response_model=ClassroomDetail)
async def join_classroom(payload: JoinIn, user: dict = Depends(current_user)):
    doc = await db.classrooms.find_one({"code": payload.code.strip().upper(), "status": "active"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Oda kodu geçersiz veya oturum sona ermiş")
    if all(p["id"] != user["id"] for p in doc["participants"]):
        await db.classrooms.update_one({"id": doc["id"]}, {"$push": {"participants": participant(user)}})
        doc["participants"].append(participant(user))
    return await detail(doc, user)


@router.get("/classrooms/{classroom_id}", response_model=ClassroomDetail)
async def get_classroom(classroom_id: str, user: dict = Depends(current_user)):
    return await detail(await load_room(classroom_id, user), user)


@router.post("/classrooms/{classroom_id}/messages", response_model=ClassroomDetail)
async def post_class_message(classroom_id: str, payload: ClassMessageIn, user: dict = Depends(current_user)):
    doc = await load_room(classroom_id, user)
    if doc["status"] != "active":
        raise HTTPException(status_code=409, detail="Oturum sona erdi")
    message = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"], "role": user["role"], "overall_level": user.get("overall_level", 0), "kind": payload.kind, "text": payload.text, "created_at": now_iso()}
    await db.classrooms.update_one({"id": classroom_id}, {"$push": {"messages": message}})
    doc["messages"].append(message)
    return await detail(doc, user)


@router.post("/classrooms/{classroom_id}/end", response_model=OkOut)
async def end_classroom(classroom_id: str, user: dict = Depends(teacher_only)):
    result = await db.classrooms.update_one({"id": classroom_id, "teacher_id": user["id"]}, {"$set": {"status": "ended"}})
    if result.matched_count != 1:
        raise HTTPException(status_code=404, detail="Sınıf bulunamadı")
    return OkOut()

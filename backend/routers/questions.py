"""Yeni nesil questions, teacher/admin question-bank management, topic cards and
the weekly league (pomodoro + help points, class or platform scope)."""

import json
import logging
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import ValidationError

from lib.auth import current_user, require_roles
from lib.ai import gemini_chat
from lib.db import db
from lib.levels import now_iso
from lib.points import LEAGUE_REASONS, previous_week_key, week_key
from lib.question_bank import public_question
from lib.topic_cards import TOPIC_CARDS
from models.academy import FigureUploadOut, League, OkOut, QuestionAdmin, QuestionGenerateIn, QuestionIn, QuestionOut, TopicCard

router = APIRouter(tags=["questions"])
staff_only = require_roles("teacher", "admin")
MEDALS = ["gold", "silver", "bronze"]


# ---------- Yeni nesil & topic cards ----------
@router.get("/questions/new-gen", response_model=list[QuestionOut])
async def new_gen_questions(subject: Optional[str] = None, user: dict = Depends(current_user)):
    query: dict = {"kind": "new_gen"}
    if subject:
        query["subject"] = subject
    docs = await db.questions.find(query, {"_id": 0}).sort([("subject", 1), ("level", 1), ("id", 1)]).to_list(500)
    return [public_question(d) for d in docs]


@router.get("/topics", response_model=list[TopicCard])
async def topic_cards(subject: Optional[str] = None, level: Optional[int] = None, user: dict = Depends(current_user)):
    cards = [c for c in TOPIC_CARDS if not subject or c["subject"] == subject]
    if level:
        cards = [c for c in cards if c["level"] == min(max(level, 1), 3)]
    return cards


# ---------- Question bank management ----------
def admin_view(doc: dict) -> dict:
    return {**public_question(doc), "correct_index": doc["correct_index"], "explanation": doc.get("explanation", ""), "origin": doc.get("origin", "system"), "created_by_name": doc.get("created_by_name", "")}


@router.get("/questions/bank", response_model=list[QuestionAdmin])
async def question_bank(subject: Optional[str] = None, kind: Optional[str] = None, user: dict = Depends(staff_only)):
    query: dict = {"placement": {"$ne": True}}
    if subject:
        query["subject"] = subject
    if kind:
        query["kind"] = kind
    docs = await db.questions.find(query, {"_id": 0}).sort([("origin", -1), ("subject", 1), ("level", 1), ("id", 1)]).to_list(1000)
    return [admin_view(d) for d in docs]


@router.post("/questions", response_model=QuestionAdmin)
async def create_question(payload: QuestionIn, user: dict = Depends(staff_only)):
    if payload.correct_index >= len(payload.options):
        raise HTTPException(status_code=422, detail="Doğru cevap seçeneklerden biri olmalı")
    if any(not o.strip() for o in payload.options):
        raise HTTPException(status_code=422, detail="Seçenekler boş bırakılamaz")
    doc = {**payload.model_dump(), "id": f"t-{uuid.uuid4().hex[:10]}", "placement": False, "source": payload.source.strip() or f"{user['name']} (öğretmen)",
           "origin": "teacher", "created_by": user["id"], "created_by_name": user["name"], "created_at": now_iso()}
    await db.questions.insert_one(doc)
    return admin_view(doc)


# ---------- AI question drafts (Gemini) ----------
LEVEL_HINT = {1: "Başlangıç: tek adımlı, temel kavram", 2: "Gelişen: iki-üç adımlı, orta zorluk", 3: "Yetkin: çok adımlı, yorum ve çıkarım gerektiren"}


def parse_draft(raw: str) -> dict:
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        raise ValueError("JSON bulunamadı")
    return json.loads(match.group(0))


@router.post("/questions/generate", response_model=QuestionIn)
async def generate_question(payload: QuestionGenerateIn, user: dict = Depends(staff_only)):
    from emergentintegrations.llm.chat import UserMessage

    chat = gemini_chat(f"qgen-{uuid.uuid4().hex}", "Sen Türkiye Yüzyılı Maarif Modeli'ne (TYMM) uygun, özgün, bağlam temelli YKS soruları yazan uzman bir soru yazarısın. ÖSYM veya yayınevi sorularını kopyalama. Yalnızca geçerli JSON döndür.")
    if not chat:
        raise HTTPException(status_code=503, detail="Gemini anahtarı tanımlı değil")
    style = "yeni nesil (gerçek hayat senaryosu, tablo veya veri yorumlama)" if payload.kind == "new_gen" else "kazanım odaklı pratik"
    prompt = (
        f"Ders: {payload.subject}. Konu: {payload.topic}. Seviye {payload.level} ({LEVEL_HINT[payload.level]}). Soru türü: {style}. "
        f"Ek not: {payload.notes or 'yok'}.\nTürkçe tek bir çoktan seçmeli soru yaz. Matematiği Unicode ile yaz (x², √, π), LaTeX ve Markdown kullanma. "
        'Şu JSON şemasını kullan: {"context": "10-1200 karakter bağlam/senaryo (tablo gerekiyorsa satırlarla)", "prompt": "soru kökü", '
        '"options": ["A", "B", "C", "D", "E"], "correct_index": 0-4, "explanation": "adım adım kısa çözüm"}. Seçenekler harf içermesin, tek doğru cevap olsun.'
    )
    try:
        data = parse_draft(await chat.send_message(UserMessage(text=prompt)))
        return QuestionIn.model_validate({
            "subject": payload.subject, "topic": payload.topic, "level": payload.level, "kind": payload.kind,
            "context": data.get("context", ""), "prompt": data.get("prompt", ""), "options": [str(o).strip() for o in data.get("options", [])][:5],
            "correct_index": data.get("correct_index", 0), "explanation": data.get("explanation", ""), "source": "AkademiAI · Gemini taslağı (öğretmen onaylı)", "figure": "",
        })
    except (ValueError, ValidationError) as exc:
        logging.getLogger(__name__).warning("Gemini draft invalid: %s", exc)
        raise HTTPException(status_code=502, detail="Gemini geçerli bir soru taslağı üretemedi, tekrar dene")
    except Exception as exc:
        logging.getLogger(__name__).warning("Gemini draft failed: %s", exc)
        raise HTTPException(status_code=502, detail="Gemini şu an yanıt vermiyor, biraz sonra tekrar dene")


# ---------- Figure upload (stored in Mongo, served same-origin) ----------
MAX_FIGURE_BYTES = 2 * 1024 * 1024


def sniff_image(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.post("/questions/figure", response_model=FigureUploadOut)
async def upload_figure(file: UploadFile = File(...), user: dict = Depends(staff_only)):
    data = await file.read(MAX_FIGURE_BYTES + 1)
    if len(data) > MAX_FIGURE_BYTES:
        raise HTTPException(status_code=413, detail="Görsel en fazla 2 MB olabilir")
    content_type = sniff_image(data)
    if not content_type:
        raise HTTPException(status_code=415, detail="Yalnızca PNG, JPG, WEBP veya GIF yükleyebilirsin")
    figure_id = uuid.uuid4().hex
    await db.figures.insert_one({"id": figure_id, "content_type": content_type, "data": data, "size": len(data), "name": file.filename or "", "created_by": user["id"], "created_at": now_iso()})
    return {"url": f"/api/figures/{figure_id}"}


@router.get("/figures/{figure_id}")
async def get_figure(figure_id: str, user: dict = Depends(current_user)):
    doc = await db.figures.find_one({"id": figure_id}, {"_id": 0, "data": 1, "content_type": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Görsel bulunamadı")
    return Response(content=bytes(doc["data"]), media_type=doc["content_type"], headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})


@router.delete("/questions/{question_id}", response_model=OkOut)
async def delete_question(question_id: str, user: dict = Depends(staff_only)):
    query = {"id": question_id, "origin": "teacher"}
    if user["role"] != "admin":
        query["created_by"] = user["id"]
    result = await db.questions.delete_one(query)
    if result.deleted_count != 1:
        raise HTTPException(status_code=404, detail="Silinebilecek soru bulunamadı (sistem soruları silinemez)")
    return OkOut()


# ---------- Weekly league ----------
async def standings(week: str, student_ids: list[str], students: dict) -> list[dict]:
    rows = await db.points_log.aggregate([
        {"$match": {"week": week, "reason": {"$in": LEAGUE_REASONS}, "user_id": {"$in": student_ids}}},
        {"$group": {"_id": {"user": "$user_id", "reason": "$reason"}, "sum": {"$sum": "$amount"}}},
    ]).to_list(5000)
    totals: dict[str, dict] = {}
    for r in rows:
        t = totals.setdefault(r["_id"]["user"], {"pomodoro": 0, "answer": 0, "camp": 0})
        t[r["_id"]["reason"]] += r["sum"]
    campers = set(await db.camp_awards.distinct("user_id", {"user_id": {"$in": student_ids}}))
    ranked = sorted(totals.items(), key=lambda kv: (-sum(kv[1].values()), students[kv[0]]["name"]))
    return [{
        "id": uid, "name": students[uid]["name"], "class_name": students[uid].get("class_name", ""), "overall_level": students[uid].get("overall_level", 0),
        "pomodoro_points": t["pomodoro"], "help_points": t["answer"], "camp_points": t["camp"], "camp_master": uid in campers, "total": sum(t.values()), "rank": i + 1, "medal": MEDALS[i] if i < 3 else "",
    } for i, (uid, t) in enumerate(ranked)]


@router.get("/league", response_model=League)
async def league(scope: str = "class", class_name: Optional[str] = None, user: dict = Depends(current_user)):
    target_class = class_name or user.get("class_name") or "12-A"
    query: dict = {"role": "student"}
    if scope == "class":
        query["class_name"] = target_class
    students = {s["id"]: s for s in await db.users.find(query, {"_id": 0, "id": 1, "name": 1, "class_name": 1, "overall_level": 1}).to_list(5000)}
    ids = list(students)
    scope_key = f"class:{target_class}" if scope == "class" else "all"
    scope_label = f"{target_class} sınıf ligi" if scope == "class" else "Platform ligi"
    current = await standings(week_key(), ids, students)
    last = await standings(previous_week_key(), ids, students)
    for entry in last[:3]:  # finalize last week's medals idempotently
        if entry["total"] > 0:
            await db.league_awards.update_one({"week": previous_week_key(), "scope": scope_key, "user_id": entry["id"]},
                                              {"$setOnInsert": {"medal": entry["medal"], "scope_label": scope_label, "created_at": now_iso()}}, upsert=True)
    return {"week": week_key(), "scope": scope, "scope_label": scope_label, "entries": current, "last_week": last[:3]}

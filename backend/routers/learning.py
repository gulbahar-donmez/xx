"""Student learning flow: placement test, level-based practice, recommendations,
dashboard, pomodoro, profile, leaderboard and the AI coach."""

import json
import uuid
from typing import AsyncIterator, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from lib.auth import current_user, require_roles
from lib.dates import today_iso
from lib.db import db
from lib.ai import gemini_chat
from lib.mistakes import record_answer
from lib.points import CAMP_BONUS, CAMP_DAYS, award, pomodoro_streak
from lib.levels import LEVEL_NAMES, POINTS, SUBJECTS, level_for, now_iso, public_user
from lib.question_bank import BY_ID, QUESTIONS, placement_questions, public_question
from models.academy import (
    AnswersIn, ChatRequest, Dashboard, LeaderEntry, PlacementResult, PlacementTest, PomodoroIn, PomodoroOut, PomodoroStreak,
    PracticeAnswerIn, PracticeAnswerOut, PracticeSet, Profile, ProfileUpdate, PublicUser, Recommendation,
)

router = APIRouter(tags=["learning"])
student_only = require_roles("student")

LEVEL_PLANS = {
    1: ("Temel kavram anlatımı + 5 başlangıç sorusu", "30 dk", "+3,00 net"),
    2: ("Kısa konu özeti + 8 orta seviye bağlam temelli soru", "35 dk", "+2,25 net"),
    3: ("10 ileri seviye soru + hata kökü analizi", "40 dk", "+1,50 net"),
    4: ("Deneme temposunda 12 soru ile kazanımı koru", "25 dk", "Koruma"),
}


async def add_points(user_id: str, amount: int, reason: str) -> int:
    return await award(user_id, amount, reason)


def exam_recommendation(exam: dict | None) -> list[dict]:
    """Highest-weight weak subject from the latest uploaded deneme (YKS question counts)."""
    if not exam or not exam.get("rows"):
        return []
    row = max(exam["rows"], key=lambda r: (r.get("max_questions", 0) - r["correct"]) * (1 - r.get("rate", 0) / 100))
    level = row.get("level") or 1
    missing = max(0, row.get("max_questions", 0) - row["correct"])
    return [{
        "id": f"rec-exam-{row['subject'].lower()}", "tag": f"{exam.get('exam_type', 'TYT')} denemesinden", "subject": row["subject"],
        "title": f"{row['subject']} · {row.get('max_questions', '?')} soruda {row['net']} net", "detail": f"{missing} soruluk net potansiyeli var. {LEVEL_PLANS[min(level, 4)][0]}",
        "gain": f"+{round(missing * 0.25, 1)} net hedefi", "duration": LEVEL_PLANS[min(level, 4)][1], "tone": "amber", "level": level,
    }]


def build_recommendations(user: dict, exam: dict | None = None) -> list[dict]:
    scores: dict = user.get("subject_scores", {})
    if not scores:
        return exam_recommendation(exam)
    ordered = sorted(scores.items(), key=lambda item: item[1])
    picks = ordered[:2] + ([ordered[-1]] if len(ordered) > 2 else [])
    tags = [("Öncelikli eksik", "amber"), ("Gelişim alanı", "blue"), ("Kazanımı koru", "green")]
    recs = []
    for (subject, _score), (tag, tone) in zip(picks, tags):
        level = user.get("subject_levels", {}).get(subject, 1)
        topics = [q["topic"] for q in QUESTIONS if q["subject"] == subject and q["level"] == min(level, 3)]
        detail, duration, gain = LEVEL_PLANS[level]
        recs.append({
            "id": f"rec-{subject.lower()}", "tag": tag, "subject": subject,
            "title": f"{subject} · {topics[0] if topics else 'Genel tekrar'}", "detail": detail,
            "gain": gain, "duration": duration, "tone": tone, "level": level,
        })
    return exam_recommendation(exam) + recs


async def latest_exam(user_id: str) -> dict | None:
    return await db.exam_results.find_one({"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)])


def subject_rows(user: dict) -> list[dict]:
    rows = []
    for subject in SUBJECTS:
        score = user.get("subject_scores", {}).get(subject)
        if score is None:
            continue
        level = user.get("subject_levels", {}).get(subject, level_for(score))
        rows.append({"subject": subject, "score": score, "correct": 0, "wrong": 0, "blank": 0, "level": level, "level_name": LEVEL_NAMES[level]})
    return rows


# ---------- Placement ----------
@router.get("/placement/test", response_model=PlacementTest)
async def get_placement(user: dict = Depends(student_only)):
    return {"questions": [public_question(q) for q in placement_questions()], "duration_minutes": 30, "rule": "4 yanlış 1 doğruyu götürür · zor sorular daha fazla puan değerindedir"}


@router.post("/placement/submit", response_model=PlacementResult)
async def submit_placement(payload: AnswersIn, user: dict = Depends(student_only)):
    stats = {s: {"correct": 0, "wrong": 0, "blank": 0, "earned": 0.0, "max": 0} for s in SUBJECTS}
    review, correct_total, wrong_total = [], 0, 0
    for q in placement_questions():
        s = stats[q["subject"]]
        s["max"] += q["level"]
        answer = payload.answers.get(q["id"], -1)
        if answer < 0:
            s["blank"] += 1
        elif answer == q["correct_index"]:
            s["correct"] += 1
            s["earned"] += q["level"]
            correct_total += 1
        else:
            s["wrong"] += 1
            s["earned"] -= q["level"] / 4
            wrong_total += 1
            await record_answer(user["id"], q, False)
        if answer != q["correct_index"]:
            review.append({"question_id": q["id"], "subject": q["subject"], "topic": q["topic"], "your_answer": answer, "correct_index": q["correct_index"], "explanation": q["explanation"]})
    subjects, scores, levels = [], {}, {}
    for subject, s in stats.items():
        score = round(max(0.0, s["earned"]) / s["max"] * 100) if s["max"] else 0
        level = level_for(score)
        scores[subject], levels[subject] = score, level
        subjects.append({"subject": subject, "score": score, "correct": s["correct"], "wrong": s["wrong"], "blank": s["blank"], "level": level, "level_name": LEVEL_NAMES[level]})
    overall_score = round(sum(scores.values()) / len(scores))
    overall = level_for(overall_score)
    first_time = not user.get("placement_done")
    awarded = POINTS["placement"] if first_time else 0
    await db.users.update_one({"id": user["id"]}, {"$set": {"placement_done": True, "overall_level": overall, "subject_levels": levels, "subject_scores": scores}})
    await award(user["id"], awarded, "placement")
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    result = {
        "id": str(uuid.uuid4()), "score": overall_score, "net": round(correct_total - wrong_total / 4, 2),
        "overall_level": overall, "level_name": LEVEL_NAMES[overall], "subjects": subjects,
        "strengths": [s for s, v in ranked[:2] if v > 0] or ["Henüz belirgin değil"],
        "gaps": [s for s, _ in ranked[-2:]][::-1],
        "message": f"Genel seviyen: {LEVEL_NAMES[overall]}. Önce {ranked[-1][0]} dersindeki temel kazanımları güçlendirip {ranked[0][0]} dersindeki ritmini koruyacağız.",
        "review": review, "points_awarded": awarded, "completed_at": now_iso(),
    }
    await db.placement_results.insert_one({**result, "user_id": user["id"]})
    return result


@router.get("/placement/latest", response_model=Optional[PlacementResult])
async def latest_placement(user: dict = Depends(student_only)):
    return await db.placement_results.find_one({"user_id": user["id"]}, {"_id": 0, "user_id": 0}, sort=[("completed_at", -1)])


# ---------- Practice ----------
@router.get("/practice", response_model=PracticeSet)
async def get_practice(subject: Optional[str] = None, user: dict = Depends(student_only)):
    if not user.get("placement_done"):
        raise HTTPException(status_code=409, detail="Önce seviye tespit sınavını tamamla")
    scores = user.get("subject_scores", {})
    subject = subject if subject in SUBJECTS else min(scores, key=scores.get)
    level = user.get("subject_levels", {}).get(subject, 1)
    band = {min(level, 3), min(level + 1, 3)}
    pool = await db.questions.find({"subject": subject, "kind": "practice", "placement": {"$ne": True}}, {"_id": 0}).sort([("level", 1), ("id", 1)]).to_list(500)
    chosen = [q for q in pool if q["level"] in band] or pool
    return {"subject": subject, "level": level, "level_name": LEVEL_NAMES[level], "questions": [public_question(q) for q in chosen]}


@router.post("/practice/answer", response_model=PracticeAnswerOut)
async def answer_practice(payload: PracticeAnswerIn, user: dict = Depends(student_only)):
    q = await db.questions.find_one({"id": payload.question_id}, {"_id": 0}) or BY_ID.get(payload.question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Soru bulunamadı")
    correct = payload.answer == q["correct_index"]
    already = await db.practice_attempts.find_one({"user_id": user["id"], "question_id": q["id"], "correct": True})
    awarded = POINTS["practice"] if correct and not already else 0
    await db.practice_attempts.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "question_id": q["id"], "subject": q["subject"], "correct": correct, "created_at": now_iso()})
    await record_answer(user["id"], q, correct)
    total = await add_points(user["id"], awarded, "practice") if awarded else user.get("points", 0)
    return {"correct": correct, "correct_index": q["correct_index"], "explanation": q["explanation"], "points_awarded": awarded, "total_points": total}


# ---------- Dashboard & recommendations ----------
@router.get("/recommendations", response_model=list[Recommendation])
async def recommendations(user: dict = Depends(student_only)):
    return build_recommendations(user, await latest_exam(user["id"]))


@router.get("/dashboard", response_model=Dashboard)
async def dashboard(user: dict = Depends(student_only)):
    exams = await db.exam_results.find({"user_id": user["id"]}, {"_id": 0, "name": 1, "total_net": 1}).sort("created_at", -1).to_list(6)
    pending = await db.assignments.count_documents({"assignee_ids": user["id"], "completed_ids": {"$ne": user["id"]}})
    today_poms = await db.pomodoros.count_documents({"user_id": user["id"], "day": today_iso()})
    latest = await db.placement_results.find_one({"user_id": user["id"]}, {"_id": 0, "net": 1}, sort=[("completed_at", -1)])
    level = user.get("overall_level", 0)
    metrics = [
        {"label": "Toplam puan", "value": str(user.get("points", 0)), "hint": "Pratik, pomodoro ve ödevlerden", "tone": "amber"},
        {"label": "Genel seviye", "value": LEVEL_NAMES[level], "hint": f"Seviye {level} / 4", "tone": "blue"},
        {"label": "Seviye testi neti", "value": f"{latest['net']:.2f}".replace(".", ",") if latest else "—", "hint": "15 soruluk tespit sınavı", "tone": "green"},
        {"label": "Bugünkü pomodoro", "value": str(today_poms), "hint": f"{pending} bekleyen ödev", "tone": "slate"},
    ]
    return {
        "user": public_user(user), "metrics": metrics, "subject_scores": subject_rows(user),
        "trend": [{"name": e["name"][:14], "net": e["total_net"]} for e in reversed(exams)],
        "recommendations": build_recommendations(user, await latest_exam(user["id"])), "pending_assignments": pending, "today_pomodoros": today_poms,
    }


# ---------- Pomodoro ----------
@router.post("/pomodoro/complete", response_model=PomodoroOut)
async def complete_pomodoro(payload: PomodoroIn, user: dict = Depends(current_user)):
    await db.pomodoros.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "minutes": payload.minutes, "subject": payload.subject, "day": today_iso(), "created_at": now_iso()})
    total = await add_points(user["id"], POINTS["pomodoro"], "pomodoro")
    count = await db.pomodoros.count_documents({"user_id": user["id"], "day": today_iso()})
    streak = await pomodoro_streak(user["id"])
    bonus = 0
    if streak and streak % CAMP_DAYS == 0 and not await db.camp_awards.find_one({"user_id": user["id"], "day": today_iso()}):
        await db.camp_awards.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "day": today_iso(), "streak": streak, "created_at": now_iso()})
        bonus = CAMP_BONUS
        total = await add_points(user["id"], bonus, "camp")
    return {"points_awarded": POINTS["pomodoro"] + bonus, "total_points": total, "today_count": count, "streak": streak, "camp_bonus": bonus}


@router.get("/pomodoro/streak", response_model=PomodoroStreak)
async def get_streak(user: dict = Depends(current_user)):
    return {"streak": await pomodoro_streak(user["id"]), "target": CAMP_DAYS, "bonus": CAMP_BONUS,
            "today_done": bool(await db.pomodoros.find_one({"user_id": user["id"], "day": today_iso()})),
            "camp_awards": await db.camp_awards.count_documents({"user_id": user["id"]})}


# ---------- Profile & leaderboard ----------
async def leaderboard_docs(limit: int) -> list[dict]:
    return await db.users.find({"role": "student"}, {"_id": 0, "id": 1, "name": 1, "points": 1, "overall_level": 1, "grade": 1}).sort("points", -1).to_list(limit)


@router.get("/leaderboard", response_model=list[LeaderEntry])
async def leaderboard(user: dict = Depends(current_user)):
    return [{"id": u["id"], "name": u["name"], "points": u.get("points", 0), "overall_level": u.get("overall_level", 0), "grade": u.get("grade", "")} for u in await leaderboard_docs(10)]


@router.get("/profile", response_model=Profile)
async def get_profile(user: dict = Depends(current_user)):
    uid = user["id"]
    solved = await db.practice_attempts.count_documents({"user_id": uid})
    correct = await db.practice_attempts.count_documents({"user_id": uid, "correct": True})
    poms = await db.pomodoros.find({"user_id": uid}, {"_id": 0, "minutes": 1}).to_list(5000)
    posts = await db.posts.count_documents({"author_id": uid})
    answers = await db.posts.count_documents({"answers.author_id": uid})
    done = await db.assignments.count_documents({"completed_ids": uid})
    exams = await db.exam_results.count_documents({"user_id": uid})
    rank = await db.users.count_documents({"role": "student", "points": {"$gt": user.get("points", 0)}}) + 1
    camps = await db.camp_awards.count_documents({"user_id": uid})
    badges = ["Kamp Ustası"] if camps else []
    if user.get("placement_done"):
        badges.append("Seviyesini keşfetti")
    if len(poms) >= 5:
        badges.append("Odak ustası")
    if correct >= 10:
        badges.append("Soru avcısı")
    if answers >= 3:
        badges.append("Yardımsever arkadaş")
    if done >= 1:
        badges.append("Ödev disiplini")
    stats = {"practice_solved": solved, "practice_correct": correct, "pomodoros": len(poms), "focus_minutes": sum(p["minutes"] for p in poms), "posts": posts, "answers": answers, "assignments_done": done, "exams": exams,
             "pomodoro_streak": await pomodoro_streak(uid), "camp_awards": camps}
    awards = await db.league_awards.find({"user_id": uid}, {"_id": 0, "medal": 1, "week": 1, "scope_label": 1}).sort("week", -1).to_list(50)
    medal_names = {"gold": "Altın", "silver": "Gümüş", "bronze": "Bronz"}
    medals = [f"{medal_names[a['medal']]} madalya · {a['week']} · {a['scope_label']}" for a in awards]
    frame = next((m for m in ("gold", "silver", "bronze") if any(a["medal"] == m for a in awards)), "")
    return {"user": public_user(user), "stats": stats, "badges": badges, "rank": rank, "medals": medals, "frame": frame}


@router.patch("/profile", response_model=PublicUser)
async def update_profile(payload: ProfileUpdate, user: dict = Depends(current_user)):
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if changes:
        await db.users.update_one({"id": user["id"]}, {"$set": changes})
    return public_user({**user, **changes})


# ---------- AI coach (Gemini when GEMINI_API_KEY is set, otherwise MOCK replies) ----------
def mock_reply(message: str) -> str:
    lowered = message.lower()
    if "türev" in lowered:
        return "Türevi bir fonksiyonun anlık değişim hızı gibi düşün. Sabitin türevi 0, xⁿ ifadesinin türevi n·xⁿ⁻¹'dir. Şimdi sen dene: f(x) = 3x² + 5x ise f'(x) ne olur? Cevabını yaz, birlikte kontrol edelim."
    if "ipucu" in lowered:
        return "Önce soruda verilenleri ve isteneni iki ayrı satıra yaz. Sonra hangi kazanımın ölçüldüğünü adlandır. İlk ipucu: işlem sırasını yeniden kontrol et; takılırsan ikinci ipucunu isteyebilirsin."
    if "benzer" in lowered:
        return "Benzer soru: Bir kafede çay 15 TL, simit 10 TL. \"2 çay + 1 simit\" menüsünde %20 indirim var. Menü kaç TL? Önce toplamı bul, sonra indirimi uygula; sonucunu gönder."
    return "Güzel bir soru. Doğrudan cevabı vermek yerine seviyene uygun bir yol çizelim: konuyu küçük bir kurala ayır, verilenleri işaretle ve ilk adımı kendi cümlenle yaz. Hangi ders ve konuda takıldığını söylersen adım adım ilerleyelim."


async def chat_events(payload: ChatRequest, user: dict) -> AsyncIterator[str]:
    session_id = payload.session_id or f"{user['id']}-coach"
    await db.chat_messages.insert_one({"session_id": session_id, "user_id": user["id"], "role": "user", "content": payload.message, "created_at": now_iso()})
    levels = ", ".join(f"{s}: {LEVEL_NAMES[l]}" for s, l in user.get("subject_levels", {}).items()) or "henüz belirlenmedi"
    text = ""
    chat = gemini_chat(session_id, f"Sen AkademiAI'nin Türkçe YKS koçusun. Öğrenci: {user['name']}. Ders seviyeleri: {levels}. Konu anlatırken öğrencinin o dersteki seviyesine göre derinlik ayarla (Başlangıç: temel kavram ve basit örnek, Gelişen: kural + orta örnek, Yetkin/Uzman: ileri yorum ve yeni nesil soru). Türkiye Yüzyılı Maarif Modeli'ne uygun, bağlam temelli örnekler kullan. Sokratik ilerle, cevabı hemen verme, seviyeye uygun anlat, kısa ve cesaretlendirici ol. Yanıtını düz metin olarak yaz: Markdown (**, #) ve LaTeX ($) kullanma; matematiği Unicode ile yaz (x², √, ∘, ≤, π). Maddeleri '•' veya '1.' ile başlat.")
    if chat:
        try:
            from emergentintegrations.llm.chat import StreamDone, TextDelta, UserMessage

            async for event in chat.stream_message(UserMessage(text=payload.message)):
                if isinstance(event, TextDelta):
                    text += event.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': event.content}, ensure_ascii=False)}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception as exc:  # fall back to MOCK replies, but leave a trace for debugging
            import logging
            logging.getLogger(__name__).warning("Gemini chat failed: %s", exc)
            text = ""
    if not text:
        text = mock_reply(payload.message)
        for chunk in text.split(" "):
            yield f"data: {json.dumps({'type': 'delta', 'content': chunk + ' '}, ensure_ascii=False)}\n\n"
    await db.chat_messages.insert_one({"session_id": session_id, "user_id": user["id"], "role": "assistant", "content": text, "created_at": now_iso()})
    yield f"data: {json.dumps({'type': 'done', 'session_id': session_id}, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, user: dict = Depends(current_user)):
    return StreamingResponse(chat_events(payload, user), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

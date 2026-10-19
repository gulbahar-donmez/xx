import json
import os
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from lib.db import db
from models.academy import (
    AdminOverview,
    AssessmentQuestions,
    AssessmentResult,
    AssessmentSubmit,
    ChatRequest,
    ClassroomOverview,
    DashboardData,
    Question,
)

router = APIRouter()

QUESTIONS = [
    Question(
        id="math-functions",
        subject="Matematik",
        topic="Fonksiyonlar",
        difficulty="Orta",
        prompt="f(x) = 2x + 3 ve g(x) = x - 1 olduğuna göre (f ∘ g)(4) kaçtır?",
        options=["7", "9", "11", "13"],
        correct_index=1,
    ),
    Question(
        id="turkish-paragraph",
        subject="Türkçe",
        topic="Paragraf",
        difficulty="Başlangıç",
        prompt="Bir düşüncenin örneklerle desteklenerek daha anlaşılır hâle getirilmesine ne ad verilir?",
        options=["Tanımlama", "Örnekleme", "Benzetme", "Karşılaştırma"],
        correct_index=1,
    ),
    Question(
        id="physics-optics",
        subject="Fizik",
        topic="Optik",
        difficulty="Orta",
        prompt="Düzlem aynada görüntünün aynaya olan uzaklığı için hangisi doğrudur?",
        options=["Cisimden azdır", "Cisimle aynıdır", "Her zaman sıfırdır", "Işık hızına bağlıdır"],
        correct_index=1,
    ),
    Question(
        id="chemistry-moles",
        subject="Kimya",
        topic="Mol Kavramı",
        difficulty="İleri",
        prompt="1 mol ideal gazın standart koşullardaki hacmi yaklaşık kaç litredir?",
        options=["11,2", "18", "22,4", "44,8"],
        correct_index=2,
    ),
    Question(
        id="biology-cell",
        subject="Biyoloji",
        topic="Hücre",
        difficulty="Başlangıç",
        prompt="Protein sentezinde aminoasitleri ribozoma taşıyan RNA çeşidi hangisidir?",
        options=["mRNA", "tRNA", "rRNA", "miRNA"],
        correct_index=1,
    ),
]

SUBJECTS = ["Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji"]


def dashboard_payload() -> DashboardData:
    scores = [
        {"subject": "Matematik", "score": 72, "correct": 18, "wrong": 5, "blank": 2, "target": 85},
        {"subject": "Türkçe", "score": 84, "correct": 22, "wrong": 3, "blank": 0, "target": 90},
        {"subject": "Fizik", "score": 61, "correct": 12, "wrong": 5, "blank": 3, "target": 80},
        {"subject": "Kimya", "score": 76, "correct": 15, "wrong": 3, "blank": 2, "target": 84},
        {"subject": "Biyoloji", "score": 88, "correct": 18, "wrong": 2, "blank": 0, "target": 92},
    ]
    return DashboardData(
        greeting="Bugün hedefinle aranda sadece birkaç doğru var.",
        streak=6,
        weekly_goal=12,
        weekly_progress=8,
        metrics=[
            {"label": "TYT tahmini puan", "value": "418,5", "change": "+12,4", "tone": "amber"},
            {"label": "Toplam net", "value": "78,25", "change": "+4,75", "tone": "green"},
            {"label": "Kazanım oranı", "value": "%76", "change": "+8%", "tone": "blue"},
            {"label": "Çalışma serisi", "value": "6 gün", "change": "En iyi: 11", "tone": "slate"},
        ],
        subject_scores=[*map(lambda item: item, scores)],
        trend=[
            {"name": "12 Şub", "net": 64}, {"name": "19 Şub", "net": 67}, {"name": "26 Şub", "net": 65},
            {"name": "04 Mar", "net": 71}, {"name": "11 Mar", "net": 73}, {"name": "18 Mar", "net": 78},
        ],
        recommendations=[
            {"id": "rec-math", "tag": "Öncelikli eksik", "subject": "Matematik", "title": "Fonksiyonlarda öteleme & bileşke", "detail": "15 dk mikro anlatım + 8 seviye 2 pekiştirme sorusu", "gain": "+2,25 net", "duration": "35 dk", "tone": "amber"},
            {"id": "rec-turkish", "tag": "Sınav stratejisi", "subject": "Türkçe", "title": "Paragrafta hız ve süre yönetimi", "detail": "Süre kısıtlı 20 soruluk tempo testi", "gain": "+3,00 net", "duration": "28 dk", "tone": "blue"},
            {"id": "rec-physics", "tag": "Kazanımı koru", "subject": "Fizik", "title": "Vektörler & bağıl hareket", "detail": "Haftalık 5 soruluk hızlı tarama", "gain": "Koruma", "duration": "12 dk", "tone": "green"},
        ],
        next_session={"title": "Matematik mini kampı", "subtitle": "Fonksiyonlar · Seviye 2", "time": "Bugün · 19:30", "progress": "2 / 8 görev"},
    )


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard() -> DashboardData:
    return dashboard_payload()


@router.get("/assessment/questions", response_model=AssessmentQuestions)
async def get_assessment_questions() -> AssessmentQuestions:
    return AssessmentQuestions(questions=QUESTIONS, total=len(QUESTIONS), rule="4 yanlış 1 doğruyu götürür")


@router.post("/assessment/submit", response_model=AssessmentResult)
async def submit_assessment(payload: AssessmentSubmit) -> AssessmentResult:
    correct = wrong = blank = 0
    subject_stats: dict[str, dict[str, int]] = {subject: {"correct": 0, "wrong": 0, "blank": 0} for subject in SUBJECTS}
    for question in QUESTIONS:
        answer = payload.answers.get(question.id, -1)
        if answer < 0:
            blank += 1
            subject_stats[question.subject]["blank"] += 1
        elif answer == question.correct_index:
            correct += 1
            subject_stats[question.subject]["correct"] += 1
        else:
            wrong += 1
            subject_stats[question.subject]["wrong"] += 1
    net = round(correct - wrong / 4, 2)
    score = round(280 + net * 6.8)
    result = AssessmentResult(
        score=score,
        net=net,
        percentile=f"%{max(2, min(48, round(48 - net * 4.2)))}",
        strengths=[subject for subject, stats in subject_stats.items() if stats["correct"] >= 1][:2] or ["Temel kazanımlar"],
        gaps=[subject for subject, stats in subject_stats.items() if stats["wrong"] >= 1][:2] or ["Süre yönetimi"],
        subjects=[
            {"subject": subject, "score": round((stats["correct"] / 1) * 20), "correct": stats["correct"], "wrong": stats["wrong"], "blank": stats["blank"], "target": 80}
            for subject, stats in subject_stats.items()
        ],
        message="Sonuçların seviyeni iyi gösteriyor. Önce matematikteki boşluğu kapatıp güçlü olduğun Türkçe ritmini koruyacağız.",
    )
    await db.assessment_results.insert_one(result.model_dump())
    return result


@router.get("/classroom/overview", response_model=ClassroomOverview)
async def get_classroom_overview() -> ClassroomOverview:
    return ClassroomOverview(
        active_students=128,
        average_net=68.4,
        pending_reviews=14,
        live_room={"title": "Deneme 04 · Yanlışlar kliniği", "teacher": "Zeynep Öğretmen", "status": "Bugün 20:00 · 18 öğrenci"},
        common_mistakes=[
            {"topic": "Problemler", "count": "42 hata", "note": "İşlem önceliği"},
            {"topic": "Paragraf", "count": "37 hata", "note": "Ana düşünce"},
            {"topic": "Optik", "count": "29 hata", "note": "Ayna görüntüsü"},
        ],
        students=[
            {"name": "Elif Yılmaz", "class": "12-A", "net": "78,25", "status": "İnceleme bekliyor"},
            {"name": "Mert Kaya", "class": "12-A", "net": "64,50", "status": "Ödev atandı"},
            {"name": "Duru Şen", "class": "12-B", "net": "83,75", "status": "İyi gidiyor"},
        ],
    )


@router.get("/admin/overview", response_model=AdminOverview)
async def get_admin_overview() -> AdminOverview:
    return AdminOverview(
        active_users=684,
        weekly_completion="%72",
        question_bank=12480,
        role_breakdown=[{"role": "Öğrenci", "value": "612", "percent": "%89"}, {"role": "Öğretmen", "value": "48", "percent": "%7"}, {"role": "Yönetici", "value": "24", "percent": "%4"}],
        system_notes=["Son 7 günde 2.148 deneme analizi tamamlandı.", "TYT Matematik soru havuzunda 38 yeni kazanım etiketi bekliyor.", "Canlı classroom oturumlarında ortalama katılım %86."],
    )


def mock_reply(message: str) -> str:
    lowered = message.lower()
    if "türev" in lowered:
        return "Türevi bir fonksiyonun anlık değişim hızı gibi düşünebilirsin. Önce sabitlerin türevinin 0, xⁿ ifadesinin türevinin n·xⁿ⁻¹ olduğunu hatırla. İstersen bir sonraki adımda birlikte örnek çözelim; cevabı hemen söylemek yerine sana küçük bir ipucu vereceğim."
    if "ipucu" in lowered or "3. soru" in lowered:
        return "Önce soruda verilenleri ve senden isteneni iki ayrı satıra yaz. Ardından seçenekleri tek tek elemek yerine, hangi kazanımın ölçüldüğünü bulmayı dene. Hazırsan ilk ipucu: işlem sırasındaki bileşke adımını yeniden kontrol et."
    if "benzer" in lowered:
        return "Benzer soru: f(x)=3x−2 ve g(x)=x+4 ise (f∘g)(2) kaçtır? Önce g(2)'yi bul, sonra sonucu f fonksiyonunda yerine yaz. Sonucunu gönder; birlikte kontrol edelim."
    return "Güzel bir soru. Sana doğrudan cevabı vermek yerine seviyene uygun bir yol çizeyim: konuyu küçük bir kurala ayır, verilenleri işaretle ve ilk adımı kendi cümlenle yaz. Hangi derste ve hangi konuda takıldığını söylersen birlikte adım adım ilerleyebiliriz."


async def event_stream(payload: ChatRequest) -> AsyncIterator[str]:
    session_id = payload.session_id or str(uuid.uuid4())
    user_message = {"session_id": session_id, "role": "user", "content": payload.message, "created_at": datetime.now(timezone.utc)}
    await db.chat_messages.insert_one(user_message)
    api_key = os.environ.get("GEMINI_API_KEY")
    response_text = ""
    if api_key:
        try:
            from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message="Sen AkademiAI'nin Türkçe YKS koçusun. Sokratik ilerle, öğrencinin seviyesine göre anlat, cevabı hemen verme, kısa ve cesaretlendirici ol.",
            ).with_model("gemini", "gemini-3-flash-preview")
            async for event in chat.stream_message(UserMessage(text=payload.message)):
                if isinstance(event, TextDelta):
                    response_text += event.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': event.content}, ensure_ascii=False)}\n\n"
                elif isinstance(event, StreamDone):
                    break
        except Exception:
            response_text = mock_reply(payload.message)
    else:
        response_text = mock_reply(payload.message)
        for chunk in response_text.split(" "):
            yield f"data: {json.dumps({'type': 'delta', 'content': chunk + ' '}, ensure_ascii=False)}\n\n"
    await db.chat_messages.insert_one({"session_id": session_id, "role": "assistant", "content": response_text, "created_at": datetime.now(timezone.utc)})
    yield f"data: {json.dumps({'type': 'done', 'session_id': session_id}, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    return StreamingResponse(event_stream(payload), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
"""Level rules shared by the placement test, practice and recommendations."""

from datetime import datetime, timezone

SUBJECTS = ["Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji"]
LEVEL_NAMES = {0: "Belirlenmedi", 1: "Başlangıç", 2: "Gelişen", 3: "Yetkin", 4: "Uzman"}

POINTS = {"placement": 100, "practice": 10, "pomodoro": 25, "assignment": 50, "post": 5, "answer": 15, "exam": 15}


def level_for(score: int) -> int:
    if score >= 90:
        return 4
    if score >= 70:
        return 3
    if score >= 40:
        return 2
    return 1


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "grade": user.get("grade", ""),
        "target": user.get("target", ""),
        "class_name": user.get("class_name", ""),
        "bio": user.get("bio", ""),
        "points": user.get("points", 0),
        "placement_done": user.get("placement_done", False),
        "overall_level": user.get("overall_level", 0),
        "subject_levels": user.get("subject_levels", {}),
        "subject_scores": user.get("subject_scores", {}),
    }


def author(user: dict | None) -> dict:
    if not user:
        return {"id": "", "name": "Silinmiş kullanıcı", "overall_level": 0, "points": 0, "role": "student"}
    return {"id": user["id"], "name": user["name"], "overall_level": user.get("overall_level", 0), "points": user.get("points", 0), "role": user["role"]}

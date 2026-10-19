"""Idempotent seed: demo accounts per role, classmates and a few peer questions.
Run: cd /app/backend && python seed.py"""

import asyncio
import uuid

from lib.auth import hash_password
from lib.db import db, ensure_indexes
from lib.levels import level_for, now_iso

SCORES = {
    "elif@akademi.ai": {"Matematik": 54, "Türkçe": 83, "Fizik": 38, "Kimya": 67, "Biyoloji": 92},
    "mert@akademi.ai": {"Matematik": 72, "Türkçe": 61, "Fizik": 70, "Kimya": 45, "Biyoloji": 58},
    "duru@akademi.ai": {"Matematik": 91, "Türkçe": 88, "Fizik": 84, "Kimya": 79, "Biyoloji": 86},
}
ACCOUNTS = [
    ("Elif Yılmaz", "elif@akademi.ai", "Ogrenci123!", "student", 340, "Boğaziçi Psikoloji"),
    ("Mert Kaya", "mert@akademi.ai", "Ogrenci123!", "student", 265, "ODTÜ Bilgisayar Müh."),
    ("Duru Şen", "duru@akademi.ai", "Ogrenci123!", "student", 480, "Hacettepe Tıp"),
    ("Deniz Arslan", "deniz@akademi.ai", "Ogrenci123!", "student", 0, "İTÜ Mimarlık"),
    ("Zeynep Öğretmen", "zeynep@akademi.ai", "Ogretmen123!", "teacher", 0, ""),
    ("Platform Yöneticisi", "admin@akademi.ai", "Admin123!", "admin", 0, ""),
]


async def main() -> None:
    await ensure_indexes()
    ids = {}
    for name, email, password, role, points, target in ACCOUNTS:
        existing = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
        scores = SCORES.get(email, {})
        levels = {s: level_for(v) for s, v in scores.items()}
        doc = {
            "name": name, "email": email, "role": role, "password_hash": hash_password(password),
            "grade": "12. sınıf" if role == "student" else "", "target": target, "class_name": "12-A" if role == "student" else "",
            "placement_done": bool(scores), "subject_scores": scores, "subject_levels": levels,
            "overall_level": level_for(round(sum(scores.values()) / len(scores))) if scores else 0,
        }
        if existing:
            await db.users.update_one({"email": email}, {"$set": doc})
            ids[email] = existing["id"]
        else:
            uid = str(uuid.uuid4())
            await db.users.insert_one({**doc, "id": uid, "points": points, "bio": "", "created_at": now_iso()})
            ids[email] = uid
    if await db.posts.count_documents({}) == 0:
        await db.posts.insert_many([
            {"id": str(uuid.uuid4()), "author_id": ids["mert@akademi.ai"], "subject": "Kimya", "text": "Mol kavramında kütle ile tanecik sayısı arasındaki geçişi hep karıştırıyorum. Pratik bir yöntemi olan var mı?", "created_at": now_iso(),
             "answers": [{"id": str(uuid.uuid4()), "author_id": ids["duru@akademi.ai"], "text": "Her şeyi önce mole çevir: kütle ÷ mol kütlesi = mol, mol × 6,02·10²³ = tanecik. Ortadaki durak hep mol!", "created_at": now_iso()}]},
            {"id": str(uuid.uuid4()), "author_id": ids["elif@akademi.ai"], "subject": "Fizik", "text": "Düz aynada yaklaşınca görüntü ile aramdaki mesafe neden iki kat azalıyor?", "created_at": now_iso(), "answers": []},
        ])
    print("Seed tamamlandı:", ", ".join(ids))


if __name__ == "__main__":
    asyncio.run(main())

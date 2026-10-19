import uuid

from fastapi import APIRouter, Depends, HTTPException, Response

from lib.auth import clear_session, current_user, hash_password, set_session, verify_password
from lib.db import db
from lib.levels import now_iso, public_user
from models.academy import LoginIn, OkOut, PublicUser, RegisterIn

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=PublicUser)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Bu e-posta ile kayıtlı bir hesap var")
    user = {
        "id": str(uuid.uuid4()), "email": email, "name": payload.name.strip(), "role": "student",
        "password_hash": hash_password(payload.password), "grade": payload.grade, "target": payload.target,
        "class_name": "12-A", "bio": "", "points": 0, "placement_done": False, "overall_level": 0,
        "subject_levels": {}, "subject_scores": {}, "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    set_session(response, user["id"])
    return public_user(user)


@router.post("/login", response_model=PublicUser)
async def login(payload: LoginIn, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    set_session(response, user["id"])
    return public_user(user)


@router.post("/logout", response_model=OkOut)
async def logout(response: Response):
    clear_session(response)
    return OkOut()


@router.get("/me", response_model=PublicUser)
async def me(user: dict = Depends(current_user)):
    return public_user(user)

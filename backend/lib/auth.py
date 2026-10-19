"""Session auth: bcrypt password hashes + a signed JWT in an httpOnly cookie."""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response

from lib.db import db

COOKIE_NAME = "akademi_session"
SESSION_DAYS = 7


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def set_session(response: Response, user_id: str) -> None:
    exp = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    token = jwt.encode({"sub": user_id, "exp": exp}, _secret(), algorithm="HS256")
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=True, samesite="lax", max_age=SESSION_DAYS * 86400, path="/")


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/", secure=True, httponly=True, samesite="lax")


async def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Oturum bulunamadı")
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Oturum süresi doldu")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
    return user


def require_roles(*roles: str):
    async def dependency(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
        return user

    return dependency

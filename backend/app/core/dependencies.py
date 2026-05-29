"""依赖注入工具。

提供数据库会话获取、认证等依赖。
"""
from __future__ import annotations

from typing import Generator

from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import crud, models
from app.core.config import get_settings
from app.core.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """获取数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(lambda: "demo-token"),
    db: Session = Depends(get_db)
) -> models.User:
    """获取当前用户（简化版，演示用）。
    
    注意：生产环境需要完整的 JWT 认证流程。
    """
    # 简化版：创建或获取演示用户
    user = crud.get_user_by_username(db, "demo")
    if not user:
        from app import schemas
        user = crud.create_user(
            db,
            schemas.UserCreate(
                username="demo",
                email="demo@example.com",
                password="demo123456"
            )
        )
    return user

"""数据库 CRUD 操作。

实现用户和事件的增删改查。
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app import models, schemas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码。"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """密码哈希。"""
    return pwd_context.hash(password)


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    """通过 ID 获取用户。"""
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    """通过用户名获取用户。"""
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """通过邮箱获取用户。"""
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """创建用户。"""
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    """验证用户身份。"""
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_event(db: Session, event_id: int, user_id: int) -> Optional[models.Event]:
    """通过 ID 获取事件（仅当前用户的事件）。"""
    return db.query(models.Event).filter(
        models.Event.id == event_id,
        models.Event.user_id == user_id
    ).first()


def get_events(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[models.Event]:
    """获取用户的所有事件。"""
    return db.query(models.Event).filter(
        models.Event.user_id == user_id
    ).offset(skip).limit(limit).all()


def get_events_by_date_range(
    db: Session,
    user_id: int,
    start_date: datetime,
    end_date: datetime
) -> list[models.Event]:
    """获取指定日期范围内的事件。"""
    return db.query(models.Event).filter(
        models.Event.user_id == user_id,
        models.Event.start_time >= start_date,
        models.Event.start_time < end_date
    ).all()


def search_events(db: Session, user_id: int, query: str) -> list[models.Event]:
    """搜索事件（标题或描述）。"""
    from sqlalchemy import or_
    return db.query(models.Event).filter(
        models.Event.user_id == user_id,
        or_(
            models.Event.title.contains(query),
            models.Event.description.contains(query)
        )
    ).all()


def create_event(db: Session, event: schemas.EventCreate, user_id: int) -> models.Event:
    """创建事件。"""
    db_event = models.Event(
        **event.model_dump(),
        user_id=user_id
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


def update_event(
    db: Session,
    event_id: int,
    event_update: schemas.EventUpdate,
    user_id: int
) -> Optional[models.Event]:
    """更新事件。"""
    db_event = get_event(db, event_id, user_id)
    if not db_event:
        return None
    
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_event, field, value)
    
    db.commit()
    db.refresh(db_event)
    return db_event


def delete_event(db: Session, event_id: int, user_id: int) -> bool:
    """删除事件。"""
    db_event = get_event(db, event_id, user_id)
    if not db_event:
        return False
    db.delete(db_event)
    db.commit()
    return True

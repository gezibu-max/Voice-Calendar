"""数据模型定义。

定义用户和事件的 SQLAlchemy ORM 模型。
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, relationship

from app.core.database import Base


class User(Base):
    """用户表模型。"""

    __tablename__ = "users"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    username: Mapped[str] = Column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = Column(String(255), nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    events: Mapped[list["Event"]] = relationship("Event", back_populates="owner")


class Event(Base):
    """事件表模型。"""

    __tablename__ = "events"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    title: Mapped[str] = Column(String(200), nullable=False)
    description: Mapped[Optional[str]] = Column(Text, nullable=True)
    start_time: Mapped[datetime] = Column(DateTime, nullable=False)
    end_time: Mapped[datetime] = Column(DateTime, nullable=False)
    all_day: Mapped[bool] = Column(Boolean, nullable=False, default=False)
    color: Mapped[str] = Column(String(20), default="#2563eb")
    color_id: Mapped[str] = Column(String(20), default="blue")
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    user_id: Mapped[int] = Column(ForeignKey("users.id"), nullable=False)

    owner: Mapped[User] = relationship("User", back_populates="events")

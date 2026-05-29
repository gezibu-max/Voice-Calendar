"""Pydantic 模式定义。

定义 API 请求/响应的数据格式。
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """用户基础信息。"""

    username: str
    email: EmailStr


class UserCreate(UserBase):
    """创建用户的请求体。"""

    password: str


class UserLogin(BaseModel):
    """用户登录的请求体。"""

    username: str
    password: str


class User(UserBase):
    """用户响应体。"""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """登录令牌响应。"""

    access_token: str
    token_type: str


class EventBase(BaseModel):
    """事件基础信息。"""

    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    color: Optional[str] = "#2563eb"
    color_id: Optional[str] = "blue"


class EventCreate(EventBase):
    """创建事件的请求体。"""

    pass


class EventUpdate(BaseModel):
    """更新事件的请求体。"""

    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    color: Optional[str] = None
    color_id: Optional[str] = None


class Event(EventBase):
    """事件响应体。"""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    """健康检查响应。"""

    status: str
    service: str
    env: str
    timestamp: str

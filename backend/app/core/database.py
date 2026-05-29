"""SQLAlchemy 引擎与会话工厂。

PR `feat/backend-bootstrap` 仅初始化 engine / SessionLocal / Base，不创建任何业务表。
具体业务模型与建表将在 `feat/event-model` 等后续 PR 中引入。
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings


def _ensure_sqlite_dir(database_url: str) -> None:
    """SQLite 文件型数据库需要确保父目录存在，否则首次启动会报错。"""
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return
    db_path = Path(database_url[len(prefix):])
    if db_path.parent and not db_path.parent.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)


_settings = get_settings()
_ensure_sqlite_dir(_settings.database_url)

engine = create_engine(
    _settings.database_url,
    connect_args={"check_same_thread": False}
    if _settings.database_url.startswith("sqlite")
    else {},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """所有 ORM 模型的统一基类。"""

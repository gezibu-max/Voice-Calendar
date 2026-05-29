"""应用配置加载。

使用 pydantic-settings 从环境变量 / .env 文件加载配置，所有运行时参数集中此处。
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """运行时配置。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "voice-calendar-backend"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    database_url: str = "sqlite:///./data/voice_calendar.db"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()

"""健康检查路由。

提供给前端 / 运维 / CI 用的最小存活探测接口，返回服务名、环境、版本协议与时间戳。
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/healthz", summary="健康检查")
def healthz() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

"""FastAPI 应用入口。

负责创建 FastAPI 实例、注册 CORS 中间件、挂载各业务路由。
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.events import router as events_router
from app.api.parse import router as parse_router
from app.core.config import get_settings
from app.core.database import Base, engine


# 创建数据库表
Base.metadata.create_all(bind=engine)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Voice Calendar API",
        description="语音日历工具后端服务",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 开发环境允许所有源
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(events_router)
    app.include_router(parse_router)

    @app.get("/", tags=["meta"], summary="服务根接口")
    def root() -> dict:
        return {
            "service": settings.app_name,
            "version": app.version,
            "docs": "/docs",
            "health": "/healthz",
        }

    return app


app = create_app()

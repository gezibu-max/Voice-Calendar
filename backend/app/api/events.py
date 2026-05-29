"""事件管理 API。

提供事件的 CRUD 接口。
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.dependencies import get_current_user, get_db

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[schemas.Event], summary="获取事件列表")
def get_events(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """获取当前用户的事件列表。
    
    可以通过 start_date 和 end_date 过滤指定日期范围内的事件。
    """
    if start_date and end_date:
        return crud.get_events_by_date_range(db, current_user.id, start_date, end_date)
    return crud.get_events(db, current_user.id, skip=skip, limit=limit)


@router.get("/search", response_model=List[schemas.Event], summary="搜索事件")
def search_events(
    q: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """通过标题或描述搜索事件。
    """
    return crud.search_events(db, current_user.id, q)


@router.get("/{event_id}", response_model=schemas.Event, summary="获取单个事件")
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """通过 ID 获取事件。
    """
    event = crud.get_event(db, event_id, current_user.id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return event


@router.post("", response_model=schemas.Event, status_code=status.HTTP_201_CREATED, summary="创建事件")
def create_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """创建新事件。
    """
    return crud.create_event(db, event, current_user.id)


@router.put("/{event_id}", response_model=schemas.Event, summary="更新事件")
def update_event(
    event_id: int,
    event_update: schemas.EventUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """更新事件信息。
    """
    updated_event = crud.update_event(db, event_id, event_update, current_user.id)
    if not updated_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return updated_event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除事件")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """删除事件。
    """
    success = crud.delete_event(db, event_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

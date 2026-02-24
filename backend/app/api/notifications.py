"""
In-app notification API endpoints.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import NotificationRead
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationRead])
async def list_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get notifications for the current user."""
    svc = NotificationService(session)
    return svc.get_user_notifications(current_user.id, limit=limit, unread_only=unread_only)


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get count of unread notifications for the current user."""
    svc = NotificationService(session)
    return {"unread_count": svc.get_unread_count(current_user.id)}


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Mark a single notification as read."""
    svc = NotificationService(session)
    notification = svc.mark_as_read(notification_id, current_user.id)
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return notification


@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Mark all notifications as read for the current user."""
    svc = NotificationService(session)
    count = svc.mark_all_as_read(current_user.id)
    return {"marked_read": count}

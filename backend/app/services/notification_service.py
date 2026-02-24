"""
Service for creating and managing in-app notifications.
"""
from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select, func

from app.models.notification import Notification, NotificationType
from app.models.holiday import Holiday
from app.models.user import User


class NotificationService:
    """Service for in-app notification CRUD."""

    def __init__(self, session: Session):
        self.session = session

    def create_overlap_notification(
        self,
        holiday: Holiday,
        overlapping_holidays: List[Holiday],
        manager: User,
        requester: User,
        business_unit_name: str,
    ) -> Notification:
        """Create an in-app overlap alert for the BU manager."""
        overlapping_names: List[str] = []
        for oh in overlapping_holidays:
            overlap_user = self.session.get(User, oh.user_id)
            if overlap_user:
                overlapping_names.append(overlap_user.display_name)

        names_str = ", ".join(overlapping_names) if overlapping_names else "other colleagues"
        title = f"Leave Overlap: {requester.display_name} in {business_unit_name}"
        message = (
            f"{requester.display_name} requested leave from {holiday.start_date} to "
            f"{holiday.end_date}, which overlaps with: {names_str}."
        )

        notification = Notification(
            recipient_id=manager.id,
            type=NotificationType.OVERLAP_ALERT,
            title=title,
            message=message,
            holiday_id=holiday.id,
        )
        self.session.add(notification)
        self.session.commit()
        self.session.refresh(notification)
        return notification

    def get_user_notifications(
        self,
        user_id: UUID,
        limit: int = 20,
        unread_only: bool = False,
    ) -> List[Notification]:
        """Get notifications for a user, newest first."""
        query = select(Notification).where(Notification.recipient_id == user_id)
        if unread_only:
            query = query.where(Notification.is_read == False)  # noqa: E712
        query = query.order_by(Notification.created_at.desc()).limit(limit)
        return list(self.session.exec(query).all())

    def get_unread_count(self, user_id: UUID) -> int:
        """Get count of unread notifications for a user."""
        result = self.session.exec(
            select(func.count(Notification.id)).where(
                Notification.recipient_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
        ).first()
        return result or 0

    def mark_as_read(
        self,
        notification_id: UUID,
        user_id: UUID,
    ) -> Optional[Notification]:
        """Mark a single notification as read. Returns None if not found or not owner."""
        notification = self.session.get(Notification, notification_id)
        if notification is None or notification.recipient_id != user_id:
            return None
        notification.is_read = True
        self.session.commit()
        self.session.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: UUID) -> int:
        """Mark all unread notifications as read. Returns count updated."""
        notifications = list(self.session.exec(
            select(Notification).where(
                Notification.recipient_id == user_id,
                Notification.is_read == False,  # noqa: E712
            )
        ).all())
        for n in notifications:
            n.is_read = True
        self.session.commit()
        return len(notifications)

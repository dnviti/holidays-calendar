"""
In-app notification model for BU manager overlap alerts.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from .user import User
    from .holiday import Holiday


class NotificationType(str, Enum):
    """Types of in-app notifications."""
    OVERLAP_ALERT = "overlap_alert"


class Notification(SQLModel, table=True):
    """In-app notification record."""
    __tablename__ = "notification"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    recipient_id: UUID = Field(foreign_key="user.id", index=True)
    type: NotificationType = Field(default=NotificationType.OVERLAP_ALERT)
    title: str = Field(max_length=255)
    message: str = Field(max_length=2000)
    holiday_id: Optional[UUID] = Field(default=None, foreign_key="holiday.id", index=True)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    recipient: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="notifications")
    )
    holiday: Optional["Holiday"] = Relationship(
        sa_relationship=relationship("Holiday", back_populates="notifications")
    )


class NotificationRead(SQLModel):
    """Schema for reading a notification."""
    id: UUID
    recipient_id: UUID
    type: NotificationType
    title: str
    message: str
    holiday_id: Optional[UUID]
    is_read: bool
    created_at: datetime

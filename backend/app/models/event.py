"""
Event model for calendar events.
"""
from __future__ import annotations
from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID


class EventType(str, Enum):
    """Type of event."""
    HOLIDAY = "holiday"
    MEETING = "meeting"
    DEADLINE = "deadline"
    CONFERENCE = "conference"
    TRAINING = "training"
    TEAM_BUILDING = "team_building"
    COMPANY_EVENT = "company_event"
    PERSONAL = "personal"
    OTHER = "other"


class EventVisibility(str, Enum):
    """Visibility of the event."""
    PRIVATE = "private"
    PUBLIC = "public"
    BUSINESS_UNIT = "business_unit"


class EventBase(SQLModel):
    """Base event model."""
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    start_date: date
    end_date: date
    start_time: Optional[str] = Field(default=None, max_length=8)  # Format: HH:MM
    end_time: Optional[str] = Field(default=None, max_length=8)    # Format: HH:MM
    event_type: EventType = Field(default=EventType.OTHER)
    visibility: EventVisibility = Field(default=EventVisibility.PRIVATE)
    is_all_day: bool = Field(default=False)
    location: Optional[str] = Field(default=None, max_length=255)
    color: Optional[str] = Field(default=None, max_length=7)  # Hex color code


class Event(EventBase, table=True):
    """Event model."""
    __tablename__ = "event"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    business_unit_id: Optional[UUID] = Field(default=None, foreign_key="businessunit.id")

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships - using string references to avoid circular imports
    user: "User" = Relationship(sa_relationship=relationship("User", back_populates="events", foreign_keys="[Event.user_id]"))
    business_unit: Optional["BusinessUnit"] = Relationship(sa_relationship=relationship("BusinessUnit", back_populates="events"))

    @property
    def duration_days(self) -> int:
        """Calculate the duration in days."""
        return (self.end_date - self.start_date).days + 1


class EventCreate(EventBase):
    """Schema for creating an event."""
    business_unit_id: Optional[UUID] = None


class EventUpdate(SQLModel):
    """Schema for updating an event."""
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    event_type: Optional[EventType] = None
    visibility: Optional[EventVisibility] = None
    is_all_day: Optional[bool] = None
    location: Optional[str] = None
    color: Optional[str] = None


class EventRead(EventBase):
    """Schema for reading an event."""
    id: UUID
    user_id: UUID
    business_unit_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    duration_days: int


class EventReadWithDetails(EventRead):
    """Schema for reading an event with user and BU details."""
    user_name: str
    user_avatar: Optional[str]
    business_unit_name: Optional[str]


class EventCalendarEvent(SQLModel):
    """Schema for calendar view."""
    id: UUID
    title: str
    start: datetime
    end: datetime
    user_id: UUID
    user_name: str
    user_avatar: Optional[str]
    event_type: EventType
    visibility: EventVisibility
    is_all_day: bool
    location: Optional[str]
    color: Optional[str]
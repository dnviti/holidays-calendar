"""
Holiday/Leave request model with overlap detection support.
"""
from __future__ import annotations
from datetime import date, datetime, timezone
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship, Column, JSON
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from .user import User
    from .business_unit import BusinessUnit
    from .notification import Notification


class HolidayStatus(str, Enum):
    """Holiday request status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGE_REQUESTED = "change_requested"
    CANCELLED = "cancelled"


class HolidayType(str, Enum):
    """Type of leave."""
    VACATION = "vacation"
    SICK_LEAVE = "sick_leave"
    PERSONAL = "personal"
    PARENTAL = "parental"
    OTHER = "other"


class HolidayBase(SQLModel):
    """Base holiday model."""
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    start_date: date
    end_date: date
    holiday_type: HolidayType = Field(default=HolidayType.VACATION)
    is_half_day: bool = Field(default=False)
    half_day_period: Optional[str] = Field(default=None, max_length=20)  # "morning" or "afternoon"


class Holiday(HolidayBase, table=True):
    """Holiday request model."""
    __tablename__ = "holiday"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    business_unit_id: UUID = Field(foreign_key="businessunit.id", index=True)
    
    # Status
    status: HolidayStatus = Field(default=HolidayStatus.PENDING)
    
    # Overlap tracking
    has_overlap: bool = Field(default=False)
    overlap_user_ids: List[UUID] = Field(default=[], sa_column=Column(JSON))
    
    # Manager feedback
    manager_notes: Optional[str] = Field(default=None, max_length=1000)
    reviewed_by_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    reviewed_at: Optional[datetime] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="holidays", foreign_keys="[Holiday.user_id]")
    )
    business_unit: "BusinessUnit" = Relationship(
        sa_relationship=relationship("BusinessUnit", back_populates="holidays")
    )
    notifications: List["Notification"] = Relationship(
        sa_relationship=relationship("Notification", back_populates="holiday")
    )

    @property
    def duration_days(self) -> float:
        """Calculate the duration in days."""
        days = (self.end_date - self.start_date).days + 1
        if self.is_half_day:
            return 0.5
        return float(days)
    
    def overlaps_with(self, other: "Holiday") -> bool:
        """Check if this holiday overlaps with another."""
        if self.id == other.id:
            return False
        return (
            self.start_date <= other.end_date and
            self.end_date >= other.start_date
        )


class HolidayCreate(HolidayBase):
    """Schema for creating a holiday request."""
    business_unit_id: UUID


class HolidayUpdate(SQLModel):
    """Schema for updating a holiday request."""
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    holiday_type: Optional[HolidayType] = None
    is_half_day: Optional[bool] = None
    half_day_period: Optional[str] = None


class HolidayStatusUpdate(SQLModel):
    """Schema for updating holiday status (by manager)."""
    status: HolidayStatus
    manager_notes: Optional[str] = None


class HolidayRead(HolidayBase):
    """Schema for reading a holiday request."""
    id: UUID
    user_id: UUID
    business_unit_id: UUID
    status: HolidayStatus
    has_overlap: bool
    overlap_user_ids: List[UUID]
    manager_notes: Optional[str]
    reviewed_by_id: Optional[UUID]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    duration_days: float


class HolidayReadWithDetails(HolidayRead):
    """Schema for reading a holiday with user and BU details."""
    user_name: str
    user_avatar: Optional[str]
    business_unit_name: str
    overlapping_users: List[str] = []


class HolidayCalendarEvent(SQLModel):
    """Schema for calendar view."""
    id: UUID
    title: str
    start: date
    end: date
    user_id: UUID
    user_name: str
    user_avatar: Optional[str]
    status: HolidayStatus
    holiday_type: HolidayType
    has_overlap: bool
    color: Optional[str] = None  # Will be set based on status/type

"""
Business Unit model with customization options.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from .user import User, UserBusinessUnit
    from .holiday import Holiday


class BusinessUnitBase(SQLModel):
    """Base business unit model."""
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=1000)
    
    # Customization - colors
    primary_color: str = Field(default="#3B82F6", max_length=7)  # Blue
    secondary_color: str = Field(default="#1E40AF", max_length=7)  # Dark Blue
    accent_color: str = Field(default="#60A5FA", max_length=7)  # Light Blue
    
    # Customization - branding
    logo_url: Optional[str] = Field(default=None, max_length=500)
    
    is_active: bool = Field(default=True)


class BusinessUnit(BusinessUnitBase, table=True):
    """Business Unit model."""
    __tablename__ = "businessunit"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    manager_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    manager: Optional["User"] = Relationship(
        sa_relationship=relationship("User", back_populates="managed_units")
    )
    user_memberships: List["UserBusinessUnit"] = Relationship(
        sa_relationship=relationship("UserBusinessUnit", back_populates="business_unit", cascade="all, delete-orphan")
    )
    holidays: List["Holiday"] = Relationship(
        sa_relationship=relationship("Holiday", back_populates="business_unit")
    )


class BusinessUnitCreate(BusinessUnitBase):
    """Schema for creating a business unit."""
    manager_id: Optional[UUID] = None


class BusinessUnitUpdate(SQLModel):
    """Schema for updating a business unit."""
    name: Optional[str] = None
    description: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    logo_url: Optional[str] = None
    manager_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class BusinessUnitRead(BusinessUnitBase):
    """Schema for reading a business unit."""
    id: UUID
    manager_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class BusinessUnitReadWithMembers(BusinessUnitRead):
    """Schema for reading a business unit with members."""
    member_count: int = 0
    manager_name: Optional[str] = None

"""
User model with roles and Microsoft 365 integration.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy.orm import relationship

if TYPE_CHECKING:
    from .business_unit import BusinessUnit
    from .holiday import Holiday


class UserRole(str, Enum):
    """User roles for authorization."""
    ADMIN = "admin"
    BU_MANAGER = "bu_manager"
    EMPLOYEE = "employee"





class UserBase(SQLModel):
    """Base user model with common fields."""
    email: str = Field(unique=True, index=True, max_length=255)
    display_name: str = Field(max_length=255)
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    role: UserRole = Field(default=UserRole.EMPLOYEE)
    is_active: bool = Field(default=True)


class User(UserBase, table=True):
    """User model with Microsoft 365 integration."""
    __tablename__ = "user"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    microsoft_id: Optional[str] = Field(default=None, unique=True, index=True, max_length=255)
    hashed_password: Optional[str] = Field(default=None, max_length=255)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(default=None)
    
    # Relationships
    business_unit_memberships: List["UserBusinessUnit"] = Relationship(
        sa_relationship=relationship("UserBusinessUnit", back_populates="user", cascade="all, delete-orphan")
    )
    holidays: List["Holiday"] = Relationship(
        sa_relationship=relationship("Holiday", back_populates="user", foreign_keys="[Holiday.user_id]")
    )
    managed_units: List["BusinessUnit"] = Relationship(
        sa_relationship=relationship("BusinessUnit", back_populates="manager")
    )
    
    def is_admin(self) -> bool:
        """Check if user is an admin."""
        return self.role == UserRole.ADMIN
    
    def is_manager(self) -> bool:
        """Check if user is a BU manager."""
        return self.role == UserRole.BU_MANAGER or self.role == UserRole.ADMIN
    
    def can_manage_business_unit(self, bu_id: UUID) -> bool:
        """Check if user can manage a specific business unit."""
        if self.is_admin():
            return True
        for membership in self.business_unit_memberships:
            if membership.business_unit_id == bu_id and membership.is_manager:
                return True
        return False



class UserBusinessUnit(SQLModel, table=True):
    """User membership in a business unit."""
    __tablename__ = "user_business_unit"
    
    user_id: UUID = Field(foreign_key="user.id", primary_key=True)
    business_unit_id: UUID = Field(foreign_key="businessunit.id", primary_key=True)
    is_manager: bool = Field(default=False)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(
        sa_relationship=relationship("User", back_populates="business_unit_memberships")
    )
    business_unit: "BusinessUnit" = Relationship(
        sa_relationship=relationship("BusinessUnit", back_populates="user_memberships")
    )

class UserCreate(UserBase):
    """Schema for creating a user."""
    password: Optional[str] = None
    microsoft_id: Optional[str] = None
    business_unit_ids: List[UUID] = []


class UserUpdate(SQLModel):
    """Schema for updating a user."""
    email: Optional[str] = None
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    """Schema for reading a user."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]


class UserReadWithBUs(UserRead):
    """Schema for reading a user with business units."""
    business_units: List["BusinessUnitRead"] = []


# Avoid circular import
from .business_unit import BusinessUnitRead
UserReadWithBUs.model_rebuild()
User.model_rebuild()
UserBusinessUnit.model_rebuild()


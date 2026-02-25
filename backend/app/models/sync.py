"""Sync models for Microsoft 365 integration."""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict
from sqlmodel import Field, Relationship, SQLModel


# Request Models

class SyncUserRequest(BaseModel):
    """Request schema for user sync."""
    user_ids: Optional[List[str]] = None  # None = sync all
    dry_run: bool = False
    update_existing: bool = True


class SyncGroupRequest(BaseModel):
    """Request schema for group sync."""
    group_ids: Optional[List[str]] = None  # None = sync all
    dry_run: bool = False
    include_members: bool = True


# Response Models

class SyncError(BaseModel):
    """Error details for a single sync item."""
    id: str
    name: str
    error: str


class SyncDetail(BaseModel):
    """Sync details for a single item."""
    id: str
    name: str
    action: str  # "created", "updated", "skipped", "deactivated"
    reason: Optional[str] = None


class SyncResult(BaseModel):
    """Result of a sync operation."""
    success: bool
    dry_run: bool
    created: int = 0
    updated: int = 0
    skipped: int = 0
    deactivated: int = 0
    errors: List[SyncError] = []
    details: List[SyncDetail] = []


# Microsoft Data Models (for preview)

class MicrosoftUser(BaseModel):
    """Microsoft user data from Graph API."""
    id: str
    email: str
    display_name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    is_enabled: bool


class MicrosoftGroup(BaseModel):
    """Microsoft group data from Graph API."""
    id: str
    name: str
    description: Optional[str] = None
    mail: Optional[str] = None
    member_count: int = 0


# Database Models

class SyncLog(SQLModel, table=True):
    """Audit log for sync operations."""
    __tablename__ = "sync_log"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    sync_type: str = Field(max_length=50)  # "users" or "groups"
    initiated_by_id: UUID = Field(foreign_key="user.id")
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    status: str = Field(max_length=20)  # "running", "completed", "failed"

    # Statistics
    total_items: int = Field(default=0)
    created_count: int = Field(default=0)
    updated_count: int = Field(default=0)
    skipped_count: int = Field(default=0)
    deactivated_count: int = Field(default=0)
    error_count: int = Field(default=0)

    # Details (JSON serialized)
    error_details: Optional[str] = Field(default=None)  # JSON array
    sync_details: Optional[str] = Field(default=None)  # JSON array

    # Relationships
    initiated_by: "User" = Relationship(back_populates="sync_logs")


# Read models for API responses

class SyncLogRead(BaseModel):
    """Sync log read model."""
    id: UUID
    sync_type: str
    initiated_by_id: UUID
    started_at: datetime
    completed_at: Optional[datetime]
    status: str
    total_items: int
    created_count: int
    updated_count: int
    skipped_count: int
    deactivated_count: int
    error_count: int

    model_config = ConfigDict(from_attributes=True)


class SyncStatusResponse(BaseModel):
    """Response for sync status check."""
    is_local_admin: bool
    has_microsoft_auth: bool
    has_microsoft_admin: Optional[bool] = None
    needs_consent: bool
    message: str

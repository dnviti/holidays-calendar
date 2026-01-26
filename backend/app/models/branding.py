"""
Application branding model for admin customization.
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel


class AppBrandingBase(SQLModel):
    """Base branding model."""
    app_name: str = Field(default="Holiday Calendar", max_length=100)
    app_tagline: Optional[str] = Field(default=None, max_length=255)
    
    # Colors - Main theme
    primary_color: str = Field(default="#6366F1", max_length=7)  # Indigo
    secondary_color: str = Field(default="#4F46E5", max_length=7)  # Dark Indigo
    accent_color: str = Field(default="#818CF8", max_length=7)  # Light Indigo
    
    # Colors - Status
    success_color: str = Field(default="#10B981", max_length=7)  # Green
    warning_color: str = Field(default="#F59E0B", max_length=7)  # Amber
    danger_color: str = Field(default="#EF4444", max_length=7)  # Red
    info_color: str = Field(default="#3B82F6", max_length=7)  # Blue
    
    # Colors - Background
    background_color: str = Field(default="#0F172A", max_length=7)  # Slate 900
    surface_color: str = Field(default="#1E293B", max_length=7)  # Slate 800
    card_color: str = Field(default="#334155", max_length=7)  # Slate 700
    
    # Colors - Text
    text_primary_color: str = Field(default="#F8FAFC", max_length=7)  # Slate 50
    text_secondary_color: str = Field(default="#94A3B8", max_length=7)  # Slate 400
    
    # Branding assets
    logo_url: Optional[str] = Field(default=None, max_length=500)
    logo_dark_url: Optional[str] = Field(default=None, max_length=500)
    favicon_url: Optional[str] = Field(default=None, max_length=500)
    
    # Feature flags
    enable_dark_mode: bool = Field(default=True)
    default_dark_mode: bool = Field(default=True)


class AppBranding(AppBrandingBase, table=True):
    """Application branding settings."""
    __tablename__ = "app_branding"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AppBrandingUpdate(SQLModel):
    """Schema for updating app branding."""
    app_name: Optional[str] = None
    app_tagline: Optional[str] = None
    
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    
    success_color: Optional[str] = None
    warning_color: Optional[str] = None
    danger_color: Optional[str] = None
    info_color: Optional[str] = None
    
    background_color: Optional[str] = None
    surface_color: Optional[str] = None
    card_color: Optional[str] = None
    
    text_primary_color: Optional[str] = None
    text_secondary_color: Optional[str] = None
    
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    
    enable_dark_mode: Optional[bool] = None
    default_dark_mode: Optional[bool] = None


class AppBrandingRead(AppBrandingBase):
    """Schema for reading app branding."""
    id: UUID
    created_at: datetime
    updated_at: datetime

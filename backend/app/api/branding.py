"""
Branding management API endpoints.
"""
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
import aiofiles
import os
from pathlib import Path

from app.core.config import settings
from app.core.database import get_session
from app.core.deps import get_current_user, get_admin_user, get_optional_user
from app.models.user import User
from app.models.branding import AppBranding, AppBrandingUpdate, AppBrandingRead


router = APIRouter(prefix="/branding", tags=["Branding"])

# Upload directory for logos
UPLOAD_DIR = Path("uploads/branding")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Upload constraints
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "svg", "ico"}
HEX_COLOR_RE = re.compile(r'^#[0-9a-fA-F]{6}$')


def get_or_create_branding(session: Session) -> AppBranding:
    """Get the branding settings, create default if not exists."""
    branding = session.exec(select(AppBranding)).first()
    if branding is None:
        branding = AppBranding()
        session.add(branding)
        session.commit()
        session.refresh(branding)
    return branding


@router.get("", response_model=AppBrandingRead)
async def get_branding(
    current_user: Optional[User] = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    """Get app branding settings (public endpoint)."""
    return get_or_create_branding(session)


@router.put("", response_model=AppBrandingRead)
async def update_branding(
    update_data: AppBrandingUpdate,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Update app branding settings (admin only)."""
    branding = get_or_create_branding(session)
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(branding, key, value)
    
    branding.updated_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(branding)
    return branding


@router.post("/logo", response_model=dict)
async def upload_logo(
    file: UploadFile = File(...),
    logo_type: str = "main",  # main, dark, favicon
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Upload a logo file (admin only)."""
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate logo type
    valid_types = ["main", "dark", "favicon"]
    if logo_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid logo type. Allowed: {', '.join(valid_types)}"
        )
    
    # Sanitize file extension
    raw_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    extension = raw_ext if raw_ext in ALLOWED_EXTENSIONS else "png"

    filename = f"logo_{logo_type}.{extension}"
    filepath = (UPLOAD_DIR / filename).resolve()
    if not str(filepath).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename"
        )

    # Read file with size limit
    content = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024 * 1024)}MB"
        )

    # Save file
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)
    
    # Update branding with URL
    branding = get_or_create_branding(session)
    url = f"/uploads/branding/{filename}"
    
    if logo_type == "main":
        branding.logo_url = url
    elif logo_type == "dark":
        branding.logo_dark_url = url
    else:  # favicon
        branding.favicon_url = url
    
    branding.updated_at = datetime.now(timezone.utc)
    session.commit()
    
    return {"url": url, "filename": filename}


@router.delete("/logo/{logo_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_logo(
    logo_type: str,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Delete a logo file (admin only)."""
    valid_types = ["main", "dark", "favicon"]
    if logo_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid logo type. Allowed: {', '.join(valid_types)}"
        )
    
    branding = get_or_create_branding(session)
    
    # Get current URL
    url = None
    if logo_type == "main":
        url = branding.logo_url
        branding.logo_url = None
    elif logo_type == "dark":
        url = branding.logo_dark_url
        branding.logo_dark_url = None
    else:
        url = branding.favicon_url
        branding.favicon_url = None
    
    # Delete file if exists
    if url:
        filename = url.split("/")[-1]
        filepath = UPLOAD_DIR / filename
        if filepath.exists():
            os.remove(filepath)
    
    branding.updated_at = datetime.now(timezone.utc)
    session.commit()


@router.get("/css")
async def get_branding_css(
    session: Session = Depends(get_session),
):
    """Get CSS variables for branding (public endpoint)."""
    branding = get_or_create_branding(session)
    
    def safe_color(value: str, default: str = "#000000") -> str:
        return value if HEX_COLOR_RE.match(value) else default

    css = f"""
:root {{
    --primary-color: {safe_color(branding.primary_color)};
    --secondary-color: {safe_color(branding.secondary_color)};
    --accent-color: {safe_color(branding.accent_color)};
    --success-color: {safe_color(branding.success_color)};
    --warning-color: {safe_color(branding.warning_color)};
    --danger-color: {safe_color(branding.danger_color)};
    --info-color: {safe_color(branding.info_color)};
    --background-color: {safe_color(branding.background_color)};
    --surface-color: {safe_color(branding.surface_color)};
    --card-color: {safe_color(branding.card_color)};
    --text-primary-color: {safe_color(branding.text_primary_color)};
    --text-secondary-color: {safe_color(branding.text_secondary_color)};
}}
"""
    
    from fastapi.responses import Response
    return Response(content=css, media_type="text/css")

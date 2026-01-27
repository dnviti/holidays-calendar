"""Microsoft 365 sync API endpoints."""
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.deps import get_microsoft_admin_user
from app.models.sync import (
    MicrosoftGroup,
    MicrosoftUser,
    SyncGroupRequest,
    SyncLog,
    SyncLogRead,
    SyncResult,
    SyncStatusResponse,
    SyncUserRequest,
)
from app.models.user import User
from app.services.auth_service import microsoft_auth_service
from app.services.microsoft_sync_service import MicrosoftSyncService

router = APIRouter(prefix="/sync", tags=["Microsoft Sync"])


@router.get("/status", response_model=SyncStatusResponse)
async def get_sync_status(
    current_user: User = Depends(get_microsoft_admin_user),
    x_ms_token: Optional[str] = Header(None, alias="X-MS-Token"),
):
    """Check if user can perform sync operations.

    Headers:
        X-MS-Token: Optional Microsoft access token for admin verification

    Returns:
        Sync status information
    """
    # User is already verified as local admin with Microsoft auth
    # by the get_microsoft_admin_user dependency

    has_microsoft_admin = None
    needs_consent = True

    # If Microsoft token provided, verify admin privileges
    if x_ms_token:
        try:
            has_microsoft_admin = await microsoft_auth_service.verify_microsoft_admin(
                x_ms_token
            )
            needs_consent = not has_microsoft_admin
        except Exception:
            has_microsoft_admin = False
            needs_consent = True

    return SyncStatusResponse(
        is_local_admin=True,
        has_microsoft_auth=True,
        has_microsoft_admin=has_microsoft_admin,
        needs_consent=needs_consent,
        message="Ready for sync operations" if has_microsoft_admin else
                "Admin consent required for elevated permissions",
    )


@router.get("/consent-url")
async def get_consent_url(
    current_user: User = Depends(get_microsoft_admin_user),
):
    """Get Microsoft admin consent URL.

    Returns:
        Dictionary with consent URL
    """
    try:
        consent_url = microsoft_auth_service.get_admin_consent_url()
        return {"consent_url": consent_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/microsoft/users", response_model=List[MicrosoftUser])
async def list_microsoft_users(
    current_user: User = Depends(get_microsoft_admin_user),
    x_ms_token: str = Header(..., alias="X-MS-Token"),
    session: Session = Depends(get_session),
    search: Optional[str] = Query(None, description="Search filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Preview users from Microsoft 365.

    Headers:
        X-MS-Token: Microsoft access token with User.Read.All scope

    Args:
        search: Optional search query
        skip: Number of items to skip
        limit: Maximum number of items to return

    Returns:
        List of Microsoft users
    """
    # Verify Microsoft admin privileges
    is_admin = await microsoft_auth_service.verify_microsoft_admin(x_ms_token)
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Microsoft 365 admin privileges required",
        )

    try:
        async with MicrosoftSyncService(session, x_ms_token) as sync_service:
            # Build filter query if search provided
            filter_query = None
            if search:
                filter_query = (
                    f"startswith(displayName,'{search}') or "
                    f"startswith(mail,'{search}') or "
                    f"startswith(userPrincipalName,'{search}')"
                )

            users = await sync_service.fetch_all_microsoft_users(filter_query)

            # Apply pagination
            return users[skip : skip + limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")


@router.get("/microsoft/groups", response_model=List[MicrosoftGroup])
async def list_microsoft_groups(
    current_user: User = Depends(get_microsoft_admin_user),
    x_ms_token: str = Header(..., alias="X-MS-Token"),
    session: Session = Depends(get_session),
    search: Optional[str] = Query(None, description="Search filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Preview groups from Microsoft 365.

    Headers:
        X-MS-Token: Microsoft access token with Group.Read.All scope

    Args:
        search: Optional search query
        skip: Number of items to skip
        limit: Maximum number of items to return

    Returns:
        List of Microsoft groups
    """
    # Verify Microsoft admin privileges
    is_admin = await microsoft_auth_service.verify_microsoft_admin(x_ms_token)
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Microsoft 365 admin privileges required",
        )

    try:
        async with MicrosoftSyncService(session, x_ms_token) as sync_service:
            groups = await sync_service.fetch_all_microsoft_groups()

            # Apply search filter if provided
            if search:
                search_lower = search.lower()
                groups = [
                    g for g in groups
                    if search_lower in g.name.lower()
                    or (g.description and search_lower in g.description.lower())
                ]

            # Apply pagination
            return groups[skip : skip + limit]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching groups: {str(e)}")


@router.post("/users", response_model=SyncResult)
async def sync_users(
    request: SyncUserRequest,
    current_user: User = Depends(get_microsoft_admin_user),
    x_ms_token: str = Header(..., alias="X-MS-Token"),
    session: Session = Depends(get_session),
):
    """Sync users from Microsoft 365.

    Headers:
        X-MS-Token: Microsoft access token with User.Read.All scope

    Args:
        request: Sync request with optional user IDs and options

    Returns:
        Sync result with statistics and details
    """
    # Verify Microsoft admin privileges
    is_admin = await microsoft_auth_service.verify_microsoft_admin(x_ms_token)
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Microsoft 365 admin privileges required",
        )

    # Create sync log
    sync_log = SyncLog(
        sync_type="users",
        initiated_by_id=current_user.id,
        status="running",
        total_items=len(request.user_ids) if request.user_ids else 0,
    )
    session.add(sync_log)
    session.commit()

    try:
        async with MicrosoftSyncService(session, x_ms_token) as sync_service:
            result = await sync_service.sync_users(
                user_ids=request.user_ids,
                dry_run=request.dry_run,
            )

            # Update sync log
            sync_log.completed_at = datetime.utcnow()
            sync_log.status = "completed" if result.success else "failed"
            sync_log.total_items = len(result.details)
            sync_log.created_count = result.created
            sync_log.updated_count = result.updated
            sync_log.skipped_count = result.skipped
            sync_log.deactivated_count = result.deactivated
            sync_log.error_count = len(result.errors)

            # Serialize errors and details to JSON
            if result.errors:
                sync_log.error_details = json.dumps(
                    [e.dict() for e in result.errors]
                )
            if result.details:
                sync_log.sync_details = json.dumps(
                    [d.dict() for d in result.details]
                )

            session.add(sync_log)
            session.commit()

            return result

    except Exception as e:
        # Update sync log with failure
        sync_log.completed_at = datetime.utcnow()
        sync_log.status = "failed"
        sync_log.error_details = json.dumps([{"error": str(e)}])
        session.add(sync_log)
        session.commit()

        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/groups", response_model=SyncResult)
async def sync_groups(
    request: SyncGroupRequest,
    current_user: User = Depends(get_microsoft_admin_user),
    x_ms_token: str = Header(..., alias="X-MS-Token"),
    session: Session = Depends(get_session),
):
    """Sync groups from Microsoft 365 as Business Units.

    Headers:
        X-MS-Token: Microsoft access token with Group.Read.All scope

    Args:
        request: Sync request with optional group IDs and options

    Returns:
        Sync result with statistics and details
    """
    # Verify Microsoft admin privileges
    is_admin = await microsoft_auth_service.verify_microsoft_admin(x_ms_token)
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Microsoft 365 admin privileges required",
        )

    # Create sync log
    sync_log = SyncLog(
        sync_type="groups",
        initiated_by_id=current_user.id,
        status="running",
        total_items=len(request.group_ids) if request.group_ids else 0,
    )
    session.add(sync_log)
    session.commit()

    try:
        async with MicrosoftSyncService(session, x_ms_token) as sync_service:
            result = await sync_service.sync_groups(
                group_ids=request.group_ids,
                dry_run=request.dry_run,
                include_members=request.include_members,
            )

            # Update sync log
            sync_log.completed_at = datetime.utcnow()
            sync_log.status = "completed" if result.success else "failed"
            sync_log.total_items = len(result.details)
            sync_log.created_count = result.created
            sync_log.skipped_count = result.skipped
            sync_log.error_count = len(result.errors)

            # Serialize errors and details to JSON
            if result.errors:
                sync_log.error_details = json.dumps(
                    [e.dict() for e in result.errors]
                )
            if result.details:
                sync_log.sync_details = json.dumps(
                    [d.dict() for d in result.details]
                )

            session.add(sync_log)
            session.commit()

            return result

    except Exception as e:
        # Update sync log with failure
        sync_log.completed_at = datetime.utcnow()
        sync_log.status = "failed"
        sync_log.error_details = json.dumps([{"error": str(e)}])
        session.add(sync_log)
        session.commit()

        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/history", response_model=List[SyncLogRead])
async def get_sync_history(
    current_user: User = Depends(get_microsoft_admin_user),
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Get sync operation history.

    Args:
        skip: Number of items to skip
        limit: Maximum number of items to return

    Returns:
        List of sync log entries
    """
    # Get sync logs for this user (or all if admin)
    query = select(SyncLog).order_by(SyncLog.started_at.desc())  # type: ignore

    # Optionally filter by user
    # query = query.where(SyncLog.initiated_by_id == current_user.id)

    query = query.offset(skip).limit(limit)
    logs = session.exec(query).all()

    return [SyncLogRead.from_orm(log) for log in logs]

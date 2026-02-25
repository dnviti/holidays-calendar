"""
Holiday management API endpoints.
"""
from datetime import date
from typing import List, Optional
from uuid import UUID
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

from app.core.database import get_session
from app.core.deps import get_current_user, get_manager_user
from app.models.user import User
from app.models.holiday import (
    Holiday,
    HolidayCreate,
    HolidayUpdate,
    HolidayRead,
    HolidayReadWithDetails,
    HolidayCalendarEvent,
    HolidayStatus,
    HolidayStatusUpdate,
)
from app.models.user import UserBusinessUnit
from app.models.business_unit import BusinessUnit
from app.services.holiday_service import HolidayService
from app.services.user_service import UserService
from app.services.business_unit_service import BusinessUnitService
from app.services.notification_service import NotificationService
from app.services.email_service import send_overlap_alert_email


router = APIRouter(prefix="/holidays", tags=["Holidays"])


def _build_lookup_maps(
    holidays: List[Holiday],
    session: Session,
) -> tuple[dict, dict]:
    """Batch-fetch all users and BUs referenced by holidays (2 queries total)."""
    user_ids = set()
    bu_ids = set()
    for h in holidays:
        user_ids.add(h.user_id)
        bu_ids.add(h.business_unit_id)
        if h.overlap_user_ids:
            for uid in h.overlap_user_ids:
                user_ids.add(UUID(uid) if isinstance(uid, str) else uid)

    users_map: dict = {}
    if user_ids:
        users_map = {
            u.id: u
            for u in session.exec(select(User).where(User.id.in_(list(user_ids)))).all()
        }

    bus_map: dict = {}
    if bu_ids:
        bus_map = {
            b.id: b
            for b in session.exec(select(BusinessUnit).where(BusinessUnit.id.in_(list(bu_ids)))).all()
        }

    return users_map, bus_map


def enrich_holidays_batch(
    holidays: List[Holiday],
    session: Session,
) -> List[HolidayReadWithDetails]:
    """Batch-enrich holidays to avoid N+1 queries."""
    if not holidays:
        return []

    users_map, bus_map = _build_lookup_maps(holidays, session)

    results = []
    for h in holidays:
        user = users_map.get(h.user_id)
        bu = bus_map.get(h.business_unit_id)
        overlapping_users = []
        if h.overlap_user_ids:
            for uid in h.overlap_user_ids:
                uid_key = UUID(uid) if isinstance(uid, str) else uid
                overlap_user = users_map.get(uid_key)
                if overlap_user:
                    overlapping_users.append(overlap_user.display_name)

        results.append(HolidayReadWithDetails(
            **h.model_dump(),
            duration_days=h.duration_days,
            user_name=user.display_name if user else "Unknown",
            user_avatar=user.avatar_url if user else None,
            business_unit_name=bu.name if bu else "Unknown",
            overlapping_users=overlapping_users,
        ))
    return results


def enrich_holiday_details(
    holiday: Holiday,
    session: Session,
) -> HolidayReadWithDetails:
    """Add user and business unit details to a single holiday."""
    return enrich_holidays_batch([holiday], session)[0]


@router.get("", response_model=List[HolidayReadWithDetails])
async def list_holidays(
    business_unit_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    status_filter: Optional[HolidayStatus] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List holidays based on filters."""
    holiday_service = HolidayService(session)
    bu_service = BusinessUnitService(session)
    
    # If filtering by user, must be own holidays or admin
    if user_id and user_id != current_user.id and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other users' holidays directly"
        )
    
    if user_id:
        holidays = holiday_service.get_user_holidays(
            user_id=user_id,
            status=status_filter,
            year=year,
        )
    elif business_unit_id:
        # Check access to business unit
        user_bus = bu_service.get_user_business_units(current_user)
        if not current_user.is_admin() and business_unit_id not in [b.id for b in user_bus]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this business unit"
            )
        
        holidays = holiday_service.get_business_unit_holidays(
            business_unit_id=business_unit_id,
            status=status_filter,
        )
    else:
        # Return own holidays by default
        holidays = holiday_service.get_user_holidays(
            user_id=current_user.id,
            status=status_filter,
            year=year,
        )
    
    return enrich_holidays_batch(holidays, session)


@router.post("", response_model=HolidayReadWithDetails, status_code=status.HTTP_201_CREATED)
async def create_holiday(
    holiday_data: HolidayCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new holiday request."""
    # Validate dates
    if holiday_data.end_date < holiday_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after or equal to start date"
        )

    # Check user is member of the business unit
    bu_service = BusinessUnitService(session)
    user_bus = bu_service.get_user_business_units(current_user)
    if holiday_data.business_unit_id not in [b.id for b in user_bus]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this business unit"
        )

    holiday_service = HolidayService(session)
    holiday = holiday_service.create_holiday(holiday_data, current_user)

    # Notify BU manager when overlapping requests are detected
    if holiday.has_overlap:
        _notify_manager_of_overlap(
            holiday=holiday,
            requester=current_user,
            holiday_service=holiday_service,
            bu_service=bu_service,
            session=session,
            background_tasks=background_tasks,
        )

    return enrich_holiday_details(holiday, session)


def _notify_manager_of_overlap(
    holiday: Holiday,
    requester: User,
    holiday_service: HolidayService,
    bu_service: BusinessUnitService,
    session: Session,
    background_tasks: BackgroundTasks,
) -> None:
    """Find the BU manager and dispatch in-app + email notifications."""
    overlapping = holiday_service.find_overlapping_holidays(
        business_unit_id=holiday.business_unit_id,
        start_date=holiday.start_date,
        end_date=holiday.end_date,
        exclude_user_id=requester.id,
        exclude_holiday_id=holiday.id,
    )

    bu = bu_service.get_business_unit_by_id(holiday.business_unit_id)
    bu_name = bu.name if bu else "Unknown"

    # Resolve BU manager: prefer BusinessUnit.manager_id FK, fall back to membership flag
    manager: Optional[User] = None
    user_service = UserService(session)
    if bu and bu.manager_id:
        manager = user_service.get_user_by_id(bu.manager_id)
    if manager is None:
        mgr_membership = session.exec(
            select(UserBusinessUnit).where(
                UserBusinessUnit.business_unit_id == holiday.business_unit_id,
                UserBusinessUnit.is_manager == True,  # noqa: E712
            )
        ).first()
        if mgr_membership:
            manager = user_service.get_user_by_id(mgr_membership.user_id)

    if manager is None:
        logger.warning(
            "No manager found for BU %s — overlap notification skipped for holiday %s",
            holiday.business_unit_id,
            holiday.id,
        )
        return

    # 1. In-app notification (synchronous DB write)
    NotificationService(session).create_overlap_notification(
        holiday=holiday,
        overlapping_holidays=overlapping,
        manager=manager,
        requester=requester,
        business_unit_name=bu_name,
    )

    # 2. Email notification (async, non-blocking)
    overlapping_names = []
    for oh in overlapping:
        ou = user_service.get_user_by_id(oh.user_id)
        if ou:
            overlapping_names.append(ou.display_name)

    background_tasks.add_task(
        send_overlap_alert_email,
        manager=manager,
        requester=requester,
        holiday=holiday,
        overlapping_names=overlapping_names,
        business_unit_name=bu_name,
    )


@router.get("/pending", response_model=List[HolidayReadWithDetails])
async def get_pending_approvals(
    business_unit_id: Optional[UUID] = None,
    current_user: User = Depends(get_manager_user),
    session: Session = Depends(get_session),
):
    """Get pending holiday requests for approval (managers only)."""
    holiday_service = HolidayService(session)
    holidays = holiday_service.get_pending_approvals(current_user, business_unit_id)
    
    return enrich_holidays_batch(holidays, session)


@router.get("/calendar", response_model=List[HolidayCalendarEvent])
async def get_calendar_events(
    business_unit_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get holidays for calendar view."""
    # Check access
    bu_service = BusinessUnitService(session)
    user_bus = bu_service.get_user_business_units(current_user)
    if not current_user.is_admin() and business_unit_id not in [b.id for b in user_bus]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    holiday_service = HolidayService(session)
    holidays = holiday_service.get_business_unit_holidays(
        business_unit_id=business_unit_id,
        start_date=start_date,
        end_date=end_date,
    )

    if not holidays:
        return []

    # Batch-fetch users and BU
    users_map, bus_map = _build_lookup_maps(holidays, session)
    bu = bus_map.get(business_unit_id)

    events = []
    for h in holidays:
        user = users_map.get(h.user_id)

        # Determine color based on status and business unit
        color = bu.primary_color if bu else "#3B82F6"
        if h.status == HolidayStatus.PENDING:
            color = "#F59E0B"  # Amber for pending approvals
        elif h.status == HolidayStatus.REJECTED:
            color = "#EF4444"  # Red for rejected
        elif h.status == HolidayStatus.CHANGE_REQUESTED:
            color = "#F97316"  # Orange for change requested

        events.append(HolidayCalendarEvent(
            id=h.id,
            title=f"{user.display_name if user else 'Unknown'}: {h.title}",
            start=h.start_date,
            end=h.end_date,
            user_id=h.user_id,
            user_name=user.display_name if user else "Unknown",
            user_avatar=user.avatar_url if user else None,
            status=h.status,
            holiday_type=h.holiday_type,
            has_overlap=h.has_overlap,
            color=color,
        ))

    return events


@router.get("/overlaps")
async def check_overlaps(
    business_unit_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    exclude_holiday_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Check for overlapping holidays."""
    holiday_service = HolidayService(session)
    overlaps = holiday_service.find_overlapping_holidays(
        business_unit_id=business_unit_id,
        start_date=start_date,
        end_date=end_date,
        exclude_user_id=current_user.id,
        exclude_holiday_id=exclude_holiday_id,
    )
    
    # Batch-fetch users for overlaps
    user_ids = {h.user_id for h in overlaps}
    users_map = {}
    if user_ids:
        users_map = {
            u.id: u
            for u in session.exec(select(User).where(User.id.in_(list(user_ids)))).all()
        }

    result = []
    for h in overlaps:
        user = users_map.get(h.user_id)
        result.append({
            "id": h.id,
            "user_id": h.user_id,
            "user_name": user.display_name if user else "Unknown",
            "start_date": h.start_date,
            "end_date": h.end_date,
            "title": h.title,
            "status": h.status.value,
        })

    return {
        "has_overlaps": len(result) > 0,
        "overlapping_holidays": result,
    }


@router.get("/{holiday_id}", response_model=HolidayReadWithDetails)
async def get_holiday(
    holiday_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get holiday by ID."""
    holiday = session.get(Holiday, holiday_id)
    if holiday is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found"
        )
    
    # Check access
    if holiday.user_id != current_user.id:
        bu_service = BusinessUnitService(session)
        user_bus = bu_service.get_user_business_units(current_user)
        if not current_user.is_admin() and holiday.business_unit_id not in [b.id for b in user_bus]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    
    return enrich_holiday_details(holiday, session)


@router.put("/{holiday_id}", response_model=HolidayReadWithDetails)
async def update_holiday(
    holiday_id: UUID,
    update_data: HolidayUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update a holiday request."""
    holiday_service = HolidayService(session)
    holiday = holiday_service.update_holiday(
        holiday_id=holiday_id,
        user=current_user,
        update_data=update_data.model_dump(exclude_unset=True),
    )
    
    if holiday is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found or cannot be updated"
        )
    
    return enrich_holiday_details(holiday, session)


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holiday(
    holiday_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete or cancel a holiday request."""
    holiday_service = HolidayService(session)
    if not holiday_service.delete_holiday(holiday_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found or cannot be deleted"
        )


@router.post("/{holiday_id}/approve", response_model=HolidayReadWithDetails)
async def approve_holiday(
    holiday_id: UUID,
    notes: Optional[str] = None,
    current_user: User = Depends(get_manager_user),
    session: Session = Depends(get_session),
):
    """Approve a holiday request (managers only)."""
    holiday = session.get(Holiday, holiday_id)
    if holiday is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found"
        )
    
    # Check if manager can approve this business unit
    if not current_user.is_admin() and not current_user.can_manage_business_unit(holiday.business_unit_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot approve holidays for this business unit"
        )
    
    holiday_service = HolidayService(session)
    updated = holiday_service.approve_holiday(holiday_id, current_user, notes)
    
    return enrich_holiday_details(updated, session)


@router.post("/{holiday_id}/reject", response_model=HolidayReadWithDetails)
async def reject_holiday(
    holiday_id: UUID,
    notes: Optional[str] = None,
    current_user: User = Depends(get_manager_user),
    session: Session = Depends(get_session),
):
    """Reject a holiday request (managers only)."""
    holiday = session.get(Holiday, holiday_id)
    if holiday is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found"
        )
    
    if not current_user.is_admin() and not current_user.can_manage_business_unit(holiday.business_unit_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reject holidays for this business unit"
        )
    
    holiday_service = HolidayService(session)
    updated = holiday_service.reject_holiday(holiday_id, current_user, notes)
    
    return enrich_holiday_details(updated, session)


@router.post("/{holiday_id}/request-change", response_model=HolidayReadWithDetails)
async def request_change(
    holiday_id: UUID,
    data: HolidayStatusUpdate,
    current_user: User = Depends(get_manager_user),
    session: Session = Depends(get_session),
):
    """Request changes to a holiday (managers only)."""
    holiday = session.get(Holiday, holiday_id)
    if holiday is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holiday not found"
        )
    
    if not current_user.is_admin() and not current_user.can_manage_business_unit(holiday.business_unit_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot request changes for holidays in this business unit"
        )
    
    if not data.manager_notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Notes are required when requesting changes"
        )
    
    holiday_service = HolidayService(session)
    updated = holiday_service.request_change(holiday_id, current_user, data.manager_notes)
    
    return enrich_holiday_details(updated, session)

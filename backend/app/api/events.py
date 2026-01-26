"""
Event management API endpoints.
"""
from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.event import (
    Event,
    EventCreate,
    EventUpdate,
    EventRead,
    EventReadWithDetails,
    EventCalendarEvent,
    EventVisibility,
    EventType
)
from app.services.event_service import EventService
from app.services.user_service import UserService
from app.services.business_unit_service import BusinessUnitService


router = APIRouter(prefix="/events", tags=["Events"])


def enrich_event_details(
    event: Event,
    session: Session,
) -> EventReadWithDetails:
    """Add user and business unit details to event."""
    user_service = UserService(session)
    bu_service = BusinessUnitService(session)

    user = user_service.get_user_by_id(event.user_id)
    bu = bu_service.get_business_unit_by_id(event.business_unit_id) if event.business_unit_id else None

    return EventReadWithDetails(
        **event.model_dump(),
        duration_days=event.duration_days,
        user_name=user.display_name if user else "Unknown",
        user_avatar=user.avatar_url if user else None,
        business_unit_name=bu.name if bu else None,
    )


@router.get("", response_model=List[EventReadWithDetails])
async def list_events(
    business_unit_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List events based on filters."""
    event_service = EventService(session)

    # If filtering by user, must be own events or admin
    if user_id and user_id != current_user.id and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view other users' events directly"
        )

    if user_id:
        events = event_service.get_user_events(
            user_id=user_id,
        )
    elif business_unit_id:
        # Check access to business unit
        bu_service = BusinessUnitService(session)
        user_bus = bu_service.get_user_business_units(current_user)
        if not current_user.is_admin() and business_unit_id not in [b.id for b in user_bus]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this business unit"
            )

        events = event_service.get_business_unit_events(
            business_unit_id=business_unit_id,
        )
    else:
        # Return own events by default
        events = event_service.get_user_events(
            user_id=current_user.id,
        )

    return [enrich_event_details(e, session) for e in events]


@router.post("", response_model=EventReadWithDetails, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new event."""
    # Validate dates
    if event_data.end_date < event_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after or equal to start date"
        )

    # If visibility is business_unit, check user is member of the business unit
    if event_data.visibility == EventVisibility.BUSINESS_UNIT and event_data.business_unit_id:
        bu_service = BusinessUnitService(session)
        user_bus = bu_service.get_user_business_units(current_user)
        if event_data.business_unit_id not in [b.id for b in user_bus]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this business unit"
            )

    event_service = EventService(session)
    
    try:
        event = event_service.create_event(event_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    return enrich_event_details(event, session)


@router.get("/calendar", response_model=List[EventCalendarEvent])
async def get_calendar_events(
    business_unit_id: Optional[UUID] = None,
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get events for calendar view."""
    event_service = EventService(session)
    
    # Get events based on user permissions
    events = event_service.get_events_for_calendar(
        user=current_user,
        business_unit_id=business_unit_id,
        start_date=start_date,
        end_date=end_date,
    )

    user_service = UserService(session)
    bu_service = BusinessUnitService(session)

    calendar_events = []
    for e in events:
        user = user_service.get_user_by_id(e.user_id)
        bu = bu_service.get_business_unit_by_id(e.business_unit_id) if e.business_unit_id else None

        # Create datetime objects for calendar
        start_datetime = e.start_date
        end_datetime = e.end_date

        # If times are provided, create datetime objects
        if e.start_time and e.end_time:
            from datetime import datetime, time
            start_time = datetime.combine(e.start_date, datetime.strptime(e.start_time, "%H:%M").time())
            end_time = datetime.combine(e.end_date, datetime.strptime(e.end_time, "%H:%M").time())
            start_datetime = start_time
            end_datetime = end_time

        # Determine color based on event type and business unit
        color = e.color
        if not color and bu:  # Use business unit color if no specific color is set
            color = bu.primary_color

        calendar_events.append(EventCalendarEvent(
            id=e.id,
            title=e.title,
            start=start_datetime,
            end=end_datetime,
            user_id=e.user_id,
            user_name=user.display_name if user else "Unknown",
            user_avatar=user.avatar_url if user else None,
            event_type=e.event_type,
            visibility=e.visibility,
            is_all_day=e.is_all_day,
            location=e.location,
            color=color,
        ))

    return calendar_events


@router.get("/{event_id}", response_model=EventReadWithDetails)
async def get_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get event by ID."""
    event_service = EventService(session)
    event = event_service.get_event_by_id(event_id)
    
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    # Check access based on visibility
    if event.user_id != current_user.id:
        # Public events are accessible to everyone
        if event.visibility == EventVisibility.PUBLIC:
            pass
        # Business unit events are accessible to members of that business unit
        elif event.visibility == EventVisibility.BUSINESS_UNIT and event.business_unit_id:
            bu_service = BusinessUnitService(session)
            user_bus = bu_service.get_user_business_units(current_user)
            if not current_user.is_admin() and event.business_unit_id not in [b.id for b in user_bus]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        # Private events are only accessible to the owner
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    return enrich_event_details(event, session)


@router.put("/{event_id}", response_model=EventReadWithDetails)
async def update_event(
    event_id: UUID,
    update_data: EventUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update an event."""
    event_service = EventService(session)
    event = event_service.update_event(
        event_id=event_id,
        user=current_user,
        update_data=update_data.model_dump(exclude_unset=True),
    )

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or cannot be updated"
        )

    return enrich_event_details(event, session)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Delete an event."""
    event_service = EventService(session)
    if not event_service.delete_event(event_id, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found or cannot be deleted"
        )


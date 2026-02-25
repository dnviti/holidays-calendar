"""
Event service for managing calendar events.
"""
from datetime import date, datetime, timezone
from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select, and_, or_
from app.models.event import Event, EventCreate, EventUpdate, EventVisibility
from app.models.user import User


class EventService:
    """Service for managing events."""

    def __init__(self, session: Session):
        self.session = session

    def create_event(
        self,
        event_data: EventCreate,
        user: User
    ) -> Event:
        """Create a new event."""
        # Set the user_id to the current user
        event_dict = event_data.model_dump()
        event_dict['user_id'] = user.id

        # If visibility is business_unit, ensure business_unit_id is set
        if event_data.visibility == EventVisibility.BUSINESS_UNIT and not event_data.business_unit_id:
            raise ValueError("Business unit ID is required for business unit visibility events")

        event = Event(**event_dict)
        self.session.add(event)
        self.session.commit()
        self.session.refresh(event)
        return event

    def get_user_events(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Event]:
        """Get events for a specific user."""
        query = select(Event).where(Event.user_id == user_id)

        if start_date:
            query = query.where(Event.end_date >= start_date)

        if end_date:
            query = query.where(Event.start_date <= end_date)

        query = query.order_by(Event.start_date.desc())
        return list(self.session.exec(query).all())

    def get_business_unit_events(
        self,
        business_unit_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Event]:
        """Get events for a business unit."""
        query = select(Event).where(
            and_(
                Event.business_unit_id == business_unit_id,
                Event.visibility == EventVisibility.BUSINESS_UNIT
            )
        )

        if start_date:
            query = query.where(Event.end_date >= start_date)

        if end_date:
            query = query.where(Event.start_date <= end_date)

        query = query.order_by(Event.start_date)
        return list(self.session.exec(query).all())

    def get_public_events(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Event]:
        """Get public events."""
        query = select(Event).where(Event.visibility == EventVisibility.PUBLIC)

        if start_date:
            query = query.where(Event.end_date >= start_date)

        if end_date:
            query = query.where(Event.start_date <= end_date)

        query = query.order_by(Event.start_date)
        return list(self.session.exec(query).all())

    def get_event_by_id(self, event_id: UUID) -> Optional[Event]:
        """Get an event by ID."""
        return self.session.get(Event, event_id)

    def update_event(
        self,
        event_id: UUID,
        user: User,
        update_data: dict,
    ) -> Optional[Event]:
        """Update an event (by owner)."""
        event = self.session.get(Event, event_id)
        if event is None:
            return None

        if event.user_id != user.id and not user.is_admin():
            return None

        for key, value in update_data.items():
            if value is not None:
                setattr(event, key, value)

        event.updated_at = datetime.now(timezone.utc)

        self.session.commit()
        self.session.refresh(event)
        return event

    def delete_event(
        self,
        event_id: UUID,
        user: User,
    ) -> bool:
        """Delete an event."""
        event = self.session.get(Event, event_id)
        if event is None:
            return False

        if event.user_id != user.id and not user.is_admin():
            return False

        self.session.delete(event)
        self.session.commit()

        return True

    def get_events_for_calendar(
        self,
        user: User,
        business_unit_id: Optional[UUID] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Event]:
        """Get events for calendar view based on user permissions."""
        # Base query - include user's private events
        conditions = [Event.user_id == user.id]

        # Add public events
        conditions.append(Event.visibility == EventVisibility.PUBLIC)

        # Add business unit events if user belongs to the business unit
        if business_unit_id:
            from app.services.business_unit_service import BusinessUnitService
            bu_service = BusinessUnitService(self.session)
            user_bus = bu_service.get_user_business_units(user)

            if business_unit_id in [b.id for b in user_bus] or user.is_admin():
                conditions.append(
                    and_(
                        Event.business_unit_id == business_unit_id,
                        Event.visibility == EventVisibility.BUSINESS_UNIT
                    )
                )

        query = select(Event).where(or_(*conditions))

        if start_date:
            query = query.where(Event.end_date >= start_date)

        if end_date:
            query = query.where(Event.start_date <= end_date)

        query = query.order_by(Event.start_date)
        return list(self.session.exec(query).all())
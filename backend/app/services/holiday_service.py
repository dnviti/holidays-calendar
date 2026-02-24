"""
Holiday service with overlap detection.
"""
from datetime import date
from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select, and_, or_

from app.models.holiday import Holiday, HolidayStatus, HolidayCreate
from app.models.user import User, UserBusinessUnit


class HolidayService:
    """Service for managing holidays with overlap detection."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def create_holiday(
        self,
        holiday_data: HolidayCreate,
        user: User
    ) -> Holiday:
        """Create a new holiday request."""
        holiday = Holiday(
            **holiday_data.model_dump(),
            user_id=user.id,
        )
        
        # Check for overlaps
        overlaps = self.find_overlapping_holidays(
            holiday.business_unit_id,
            holiday.start_date,
            holiday.end_date,
            exclude_user_id=user.id
        )
        
        if overlaps:
            holiday.has_overlap = True
            holiday.overlap_user_ids = [str(h.user_id) for h in overlaps]

        self.session.add(holiday)
        self.session.commit()
        self.session.refresh(holiday)
        return holiday
    
    def find_overlapping_holidays(
        self,
        business_unit_id: UUID,
        start_date: date,
        end_date: date,
        exclude_user_id: Optional[UUID] = None,
        exclude_holiday_id: Optional[UUID] = None,
    ) -> List[Holiday]:
        """Find holidays that overlap with the given date range."""
        query = select(Holiday).where(
            and_(
                Holiday.business_unit_id == business_unit_id,
                Holiday.status.in_([HolidayStatus.PENDING, HolidayStatus.APPROVED]),
                Holiday.start_date <= end_date,
                Holiday.end_date >= start_date,
            )
        )
        
        if exclude_user_id:
            query = query.where(Holiday.user_id != exclude_user_id)
        
        if exclude_holiday_id:
            query = query.where(Holiday.id != exclude_holiday_id)
        
        return list(self.session.exec(query).all())
    
    def get_user_holidays(
        self,
        user_id: UUID,
        status: Optional[HolidayStatus] = None,
        year: Optional[int] = None,
    ) -> List[Holiday]:
        """Get holidays for a specific user."""
        query = select(Holiday).where(Holiday.user_id == user_id)
        
        if status:
            query = query.where(Holiday.status == status)
        
        if year:
            query = query.where(
                and_(
                    Holiday.start_date >= date(year, 1, 1),
                    Holiday.start_date <= date(year, 12, 31),
                )
            )
        
        query = query.order_by(Holiday.start_date.desc())
        return list(self.session.exec(query).all())
    
    def get_business_unit_holidays(
        self,
        business_unit_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[HolidayStatus] = None,
    ) -> List[Holiday]:
        """Get holidays for a business unit (calendar view)."""
        query = select(Holiday).where(Holiday.business_unit_id == business_unit_id)
        
        if start_date:
            query = query.where(Holiday.end_date >= start_date)
        
        if end_date:
            query = query.where(Holiday.start_date <= end_date)
        
        if status:
            query = query.where(Holiday.status == status)
        
        query = query.order_by(Holiday.start_date)
        return list(self.session.exec(query).all())
    
    def get_pending_approvals(
        self,
        manager: User,
        business_unit_id: Optional[UUID] = None,
    ) -> List[Holiday]:
        """Get pending holiday requests for manager approval."""
        # Get business units the user manages
        if manager.role.value == "admin":
            query = select(Holiday).where(Holiday.status == HolidayStatus.PENDING)
        else:
            managed_bu_ids = [
                m.business_unit_id 
                for m in manager.business_unit_memberships 
                if m.is_manager
            ]
            query = select(Holiday).where(
                and_(
                    Holiday.status == HolidayStatus.PENDING,
                    Holiday.business_unit_id.in_(managed_bu_ids),
                )
            )
        
        if business_unit_id:
            query = query.where(Holiday.business_unit_id == business_unit_id)
        
        query = query.order_by(Holiday.created_at)
        return list(self.session.exec(query).all())
    
    def approve_holiday(
        self,
        holiday_id: UUID,
        manager: User,
        notes: Optional[str] = None,
    ) -> Optional[Holiday]:
        """Approve a holiday request."""
        holiday = self.session.get(Holiday, holiday_id)
        if holiday is None:
            return None
        
        holiday.status = HolidayStatus.APPROVED
        holiday.reviewed_by_id = manager.id
        holiday.manager_notes = notes
        from datetime import datetime
        holiday.reviewed_at = datetime.utcnow()
        holiday.updated_at = datetime.utcnow()
        
        self.session.commit()
        self.session.refresh(holiday)
        return holiday
    
    def reject_holiday(
        self,
        holiday_id: UUID,
        manager: User,
        notes: Optional[str] = None,
    ) -> Optional[Holiday]:
        """Reject a holiday request."""
        holiday = self.session.get(Holiday, holiday_id)
        if holiday is None:
            return None
        
        holiday.status = HolidayStatus.REJECTED
        holiday.reviewed_by_id = manager.id
        holiday.manager_notes = notes
        from datetime import datetime
        holiday.reviewed_at = datetime.utcnow()
        holiday.updated_at = datetime.utcnow()
        
        self.session.commit()
        self.session.refresh(holiday)
        return holiday
    
    def request_change(
        self,
        holiday_id: UUID,
        manager: User,
        notes: str,
    ) -> Optional[Holiday]:
        """Request changes to a holiday request."""
        holiday = self.session.get(Holiday, holiday_id)
        if holiday is None:
            return None
        
        holiday.status = HolidayStatus.CHANGE_REQUESTED
        holiday.reviewed_by_id = manager.id
        holiday.manager_notes = notes
        from datetime import datetime
        holiday.reviewed_at = datetime.utcnow()
        holiday.updated_at = datetime.utcnow()
        
        self.session.commit()
        self.session.refresh(holiday)
        return holiday
    
    def update_holiday(
        self,
        holiday_id: UUID,
        user: User,
        update_data: dict,
    ) -> Optional[Holiday]:
        """Update a holiday request (by owner)."""
        holiday = self.session.get(Holiday, holiday_id)
        if holiday is None:
            return None
        
        if holiday.user_id != user.id and not user.is_admin():
            return None
        
        # Can only update pending or change_requested holidays
        if holiday.status not in [HolidayStatus.PENDING, HolidayStatus.CHANGE_REQUESTED]:
            return None
        
        for key, value in update_data.items():
            if value is not None:
                setattr(holiday, key, value)
        
        # Reset status to pending after update
        if holiday.status == HolidayStatus.CHANGE_REQUESTED:
            holiday.status = HolidayStatus.PENDING
        
        # Recheck overlaps
        if "start_date" in update_data or "end_date" in update_data:
            overlaps = self.find_overlapping_holidays(
                holiday.business_unit_id,
                holiday.start_date,
                holiday.end_date,
                exclude_user_id=user.id,
                exclude_holiday_id=holiday.id,
            )
            holiday.has_overlap = len(overlaps) > 0
            holiday.overlap_user_ids = [str(h.user_id) for h in overlaps]

        from datetime import datetime
        holiday.updated_at = datetime.utcnow()
        
        self.session.commit()
        self.session.refresh(holiday)
        return holiday
    
    def delete_holiday(
        self,
        holiday_id: UUID,
        user: User,
    ) -> bool:
        """Delete/cancel a holiday request."""
        holiday = self.session.get(Holiday, holiday_id)
        if holiday is None:
            return False
        
        if holiday.user_id != user.id and not user.is_admin():
            return False
        
        # Can only delete pending holidays
        if holiday.status == HolidayStatus.APPROVED:
            # Mark as cancelled instead of deleting
            holiday.status = HolidayStatus.CANCELLED
            from datetime import datetime
            holiday.updated_at = datetime.utcnow()
            self.session.commit()
        else:
            self.session.delete(holiday)
            self.session.commit()
        
        return True

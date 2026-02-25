"""
Business Unit service for managing business units.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select, func

from app.models.business_unit import BusinessUnit, BusinessUnitCreate, BusinessUnitUpdate
from app.models.user import User, UserBusinessUnit


class BusinessUnitService:
    """Service for managing business units."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def create_business_unit(
        self,
        bu_data: BusinessUnitCreate,
    ) -> BusinessUnit:
        """Create a new business unit."""
        bu = BusinessUnit(**bu_data.model_dump())
        self.session.add(bu)
        self.session.commit()
        self.session.refresh(bu)
        return bu
    
    def get_business_unit_by_id(
        self,
        bu_id: UUID,
    ) -> Optional[BusinessUnit]:
        """Get business unit by ID."""
        return self.session.get(BusinessUnit, bu_id)
    
    def get_all_business_units(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> List[BusinessUnit]:
        """Get all business units."""
        query = select(BusinessUnit)
        
        if is_active is not None:
            query = query.where(BusinessUnit.is_active == is_active)
        
        query = query.offset(skip).limit(limit)
        return list(self.session.exec(query).all())
    
    def get_user_business_units(
        self,
        user: User,
    ) -> List[BusinessUnit]:
        """Get business units the user belongs to."""
        if user.is_admin():
            return self.get_all_business_units(is_active=True)
        
        memberships = self.session.exec(
            select(UserBusinessUnit).where(UserBusinessUnit.user_id == user.id)
        ).all()
        
        bu_ids = [m.business_unit_id for m in memberships]
        if not bu_ids:
            return []
        
        return list(self.session.exec(
            select(BusinessUnit).where(BusinessUnit.id.in_(bu_ids))
        ).all())
    
    def update_business_unit(
        self,
        bu_id: UUID,
        update_data: BusinessUnitUpdate,
    ) -> Optional[BusinessUnit]:
        """Update business unit information."""
        bu = self.session.get(BusinessUnit, bu_id)
        if bu is None:
            return None
        
        for key, value in update_data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(bu, key, value)
        
        bu.updated_at = datetime.now(timezone.utc)
        self.session.commit()
        self.session.refresh(bu)
        return bu
    
    def delete_business_unit(self, bu_id: UUID) -> bool:
        """Delete a business unit (soft delete by deactivating)."""
        bu = self.session.get(BusinessUnit, bu_id)
        if bu is None:
            return False
        
        bu.is_active = False
        bu.updated_at = datetime.now(timezone.utc)
        self.session.commit()
        return True
    
    def get_member_count(self, bu_id: UUID) -> int:
        """Get the number of members in a business unit."""
        result = self.session.exec(
            select(func.count(UserBusinessUnit.user_id)).where(
                UserBusinessUnit.business_unit_id == bu_id
            )
        ).first()
        return result or 0
    
    def set_manager(
        self,
        bu_id: UUID,
        manager_id: UUID,
    ) -> Optional[BusinessUnit]:
        """Set the manager for a business unit."""
        bu = self.session.get(BusinessUnit, bu_id)
        if bu is None:
            return None
        
        manager = self.session.get(User, manager_id)
        if manager is None:
            return None
        
        bu.manager_id = manager_id
        bu.updated_at = datetime.now(timezone.utc)
        
        # Ensure manager is a member and has manager flag
        from app.services.user_service import UserService
        user_service = UserService(self.session)
        user_service.add_user_to_business_unit(manager_id, bu_id, is_manager=True)
        
        # Update manager role if not admin
        if manager.role.value == "employee":
            manager.role = "bu_manager"
        
        self.session.commit()
        self.session.refresh(bu)
        return bu

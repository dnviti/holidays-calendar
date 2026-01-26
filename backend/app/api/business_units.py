"""
Business Unit management API endpoints.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.deps import get_current_user, get_admin_user, get_manager_user
from app.models.user import User, UserRead
from app.models.business_unit import (
    BusinessUnit,
    BusinessUnitCreate,
    BusinessUnitUpdate,
    BusinessUnitRead,
    BusinessUnitReadWithMembers,
)
from app.services.business_unit_service import BusinessUnitService
from app.services.user_service import UserService


router = APIRouter(prefix="/business-units", tags=["Business Units"])


@router.get("", response_model=List[BusinessUnitRead])
async def list_business_units(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List business units the user has access to."""
    bu_service = BusinessUnitService(session)
    
    if current_user.is_admin():
        return bu_service.get_all_business_units(skip=skip, limit=limit, is_active=is_active)
    
    return bu_service.get_user_business_units(current_user)


@router.post("", response_model=BusinessUnitRead, status_code=status.HTTP_201_CREATED)
async def create_business_unit(
    bu_data: BusinessUnitCreate,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Create a new business unit (admin only)."""
    bu_service = BusinessUnitService(session)
    return bu_service.create_business_unit(bu_data)


@router.get("/{bu_id}", response_model=BusinessUnitReadWithMembers)
async def get_business_unit(
    bu_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get business unit by ID."""
    bu_service = BusinessUnitService(session)
    bu = bu_service.get_business_unit_by_id(bu_id)
    
    if bu is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business unit not found"
        )
    
    # Check access (member or admin)
    user_bus = bu_service.get_user_business_units(current_user)
    if not current_user.is_admin() and bu_id not in [b.id for b in user_bus]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this business unit"
        )
    
    # Add member count and manager name
    member_count = bu_service.get_member_count(bu_id)
    manager_name = None
    if bu.manager_id:
        user_service = UserService(session)
        manager = user_service.get_user_by_id(bu.manager_id)
        if manager:
            manager_name = manager.display_name
    
    return BusinessUnitReadWithMembers(
        **bu.model_dump(),
        member_count=member_count,
        manager_name=manager_name,
    )


@router.put("/{bu_id}", response_model=BusinessUnitRead)
async def update_business_unit(
    bu_id: UUID,
    update_data: BusinessUnitUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update business unit. Managers can update name and colors."""
    bu_service = BusinessUnitService(session)
    bu = bu_service.get_business_unit_by_id(bu_id)
    
    if bu is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business unit not found"
        )
    
    # Check permissions
    can_edit = current_user.is_admin() or current_user.can_manage_business_unit(bu_id)
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Non-admins can only update specific fields
    if not current_user.is_admin():
        allowed_fields = {"name", "description", "primary_color", "secondary_color", "accent_color", "logo_url"}
        update_dict = update_data.model_dump(exclude_unset=True)
        for key in list(update_dict.keys()):
            if key not in allowed_fields:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Cannot update field: {key}"
                )
    
    result = bu_service.update_business_unit(bu_id, update_data)
    return result


@router.delete("/{bu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business_unit(
    bu_id: UUID,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Delete (deactivate) a business unit (admin only)."""
    bu_service = BusinessUnitService(session)
    if not bu_service.delete_business_unit(bu_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business unit not found"
        )


@router.get("/{bu_id}/members", response_model=List[UserRead])
async def get_business_unit_members(
    bu_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get members of a business unit."""
    bu_service = BusinessUnitService(session)
    bu = bu_service.get_business_unit_by_id(bu_id)
    
    if bu is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business unit not found"
        )
    
    # Check access
    user_bus = bu_service.get_user_business_units(current_user)
    if not current_user.is_admin() and bu_id not in [b.id for b in user_bus]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    user_service = UserService(session)
    return user_service.get_users_in_business_unit(bu_id)


@router.post("/{bu_id}/manager/{manager_id}", response_model=BusinessUnitRead)
async def set_business_unit_manager(
    bu_id: UUID,
    manager_id: UUID,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Set the manager for a business unit (admin only)."""
    bu_service = BusinessUnitService(session)
    result = bu_service.set_manager(bu_id, manager_id)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business unit or user not found"
        )
    return result

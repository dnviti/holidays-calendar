"""
User management API endpoints.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.deps import get_current_user, get_admin_user
from app.models.user import User, UserCreate, UserUpdate, UserRead, UserReadWithBUs, UserRole
from app.services.user_service import UserService


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserReadWithBUs])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    role: Optional[UserRole] = None,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """List all users with their business units (admin only)."""
    user_service = UserService(session)
    users = user_service.get_all_users_with_business_units(
        skip=skip,
        limit=limit,
        is_active=is_active,
        role=role,
    )

    # Convert to UserReadWithBUs format
    result = []
    for user in users:
        user_dict = {
            **UserRead.model_validate(user).model_dump(),
            "business_units": [
                {
                    "id": membership.business_unit.id,
                    "name": membership.business_unit.name,
                    "description": membership.business_unit.description,
                    "primary_color": membership.business_unit.primary_color,
                    "secondary_color": membership.business_unit.secondary_color,
                    "accent_color": membership.business_unit.accent_color,
                    "logo_url": membership.business_unit.logo_url,
                    "is_active": membership.business_unit.is_active,
                    "manager_id": membership.business_unit.manager_id,
                    "created_at": membership.business_unit.created_at,
                    "updated_at": membership.business_unit.updated_at,
                }
                for membership in user.business_unit_memberships
            ]
        }
        result.append(user_dict)

    return result


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Create a new user (admin only)."""
    user_service = UserService(session)
    
    # Check if email already exists
    existing = user_service.get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return user_service.create_user(user_data)


@router.get("/{user_id}", response_model=UserReadWithBUs)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get user by ID with business units."""
    # Users can view their own profile, admins can view anyone
    if current_user.id != user_id and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    user_service = UserService(session)
    user = user_service.get_user_by_id_with_business_units(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Convert to UserReadWithBUs format
    user_dict = {
        **UserRead.model_validate(user).model_dump(),
        "business_units": [
            {
                "id": membership.business_unit.id,
                "name": membership.business_unit.name,
                "description": membership.business_unit.description,
                "primary_color": membership.business_unit.primary_color,
                "secondary_color": membership.business_unit.secondary_color,
                "accent_color": membership.business_unit.accent_color,
                "logo_url": membership.business_unit.logo_url,
                "is_active": membership.business_unit.is_active,
                "manager_id": membership.business_unit.manager_id,
                "created_at": membership.business_unit.created_at,
                "updated_at": membership.business_unit.updated_at,
            }
            for membership in user.business_unit_memberships
        ]
    }

    return user_dict


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: UUID,
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update user information."""
    # Users can update their own profile, admins can update anyone
    # Only admins can change roles
    if current_user.id != user_id and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if update_data.role is not None and not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can change user roles"
        )
    
    user_service = UserService(session)
    user = user_service.update_user(user_id, update_data)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Delete (deactivate) a user (admin only)."""
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    user_service = UserService(session)
    if not user_service.delete_user(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


@router.post("/{user_id}/business-units/{bu_id}")
async def add_user_to_business_unit(
    user_id: UUID,
    bu_id: UUID,
    is_manager: bool = False,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Add user to a business unit (admin only)."""
    user_service = UserService(session)

    # Verify user exists
    user = user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify business unit exists
    from app.models.business_unit import BusinessUnit
    business_unit = session.get(BusinessUnit, bu_id)
    if not business_unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business unit not found"
        )

    membership = user_service.add_user_to_business_unit(user_id, bu_id, is_manager)
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to add user to business unit"
        )

    return {"message": "User added to business unit successfully", "user_id": str(user_id), "business_unit_id": str(bu_id)}


@router.delete("/{user_id}/business-units/{bu_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_business_unit(
    user_id: UUID,
    bu_id: UUID,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_session),
):
    """Remove user from a business unit (admin only)."""
    user_service = UserService(session)
    if not user_service.remove_user_from_business_unit(user_id, bu_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this business unit"
        )

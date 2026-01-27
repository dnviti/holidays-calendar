"""
User service for user management operations.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from sqlmodel import Session, select

from app.models.user import User, UserCreate, UserUpdate, UserRole, UserBusinessUnit
from app.models.business_unit import BusinessUnit
from app.core.security import get_password_hash
from sqlalchemy.orm import selectinload


class UserService:
    """Service for managing users."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user."""
        user = User(
            email=user_data.email,
            display_name=user_data.display_name,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            avatar_url=user_data.avatar_url,
            role=user_data.role,
            microsoft_id=user_data.microsoft_id,
        )
        
        if user_data.password:
            user.hashed_password = get_password_hash(user_data.password)
        
        self.session.add(user)
        self.session.commit()
        
        # Add to business units if specified
        for bu_id in user_data.business_unit_ids:
            self.add_user_to_business_unit(user.id, bu_id)
        
        self.session.refresh(user)
        return user
    
    def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        return self.session.get(User, user_id)

    def get_user_by_id_with_business_units(self, user_id: UUID) -> Optional[User]:
        """Get user by ID with business units loaded."""
        user = self.session.exec(
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.business_unit_memberships).selectinload(UserBusinessUnit.business_unit)
            )
        ).first()
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        return self.session.exec(
            select(User).where(User.email == email)
        ).first()
    
    def get_user_by_microsoft_id(self, microsoft_id: str) -> Optional[User]:
        """Get user by Microsoft ID."""
        return self.session.exec(
            select(User).where(User.microsoft_id == microsoft_id)
        ).first()
    
    def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        role: Optional[UserRole] = None,
    ) -> List[User]:
        """Get all users with optional filtering."""
        query = select(User)

        if is_active is not None:
            query = query.where(User.is_active == is_active)

        if role:
            query = query.where(User.role == role)

        query = query.offset(skip).limit(limit)
        return list(self.session.exec(query).all())

    def get_all_users_with_business_units(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        role: Optional[UserRole] = None,
    ) -> List[User]:
        """Get all users with their business units loaded."""
        query = select(User).options(
            selectinload(User.business_unit_memberships).selectinload(UserBusinessUnit.business_unit)
        )

        if is_active is not None:
            query = query.where(User.is_active == is_active)

        if role:
            query = query.where(User.role == role)

        query = query.offset(skip).limit(limit)
        return list(self.session.exec(query).all())
    
    def update_user(
        self,
        user_id: UUID,
        update_data: UserUpdate,
    ) -> Optional[User]:
        """Update user information."""
        user = self.session.get(User, user_id)
        if user is None:
            return None
        
        for key, value in update_data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        self.session.commit()
        self.session.refresh(user)
        return user
    
    def delete_user(self, user_id: UUID) -> bool:
        """Delete a user (soft delete by deactivating)."""
        user = self.session.get(User, user_id)
        if user is None:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.session.commit()
        return True
    
    def add_user_to_business_unit(
        self,
        user_id: UUID,
        business_unit_id: UUID,
        is_manager: bool = False,
    ) -> Optional[UserBusinessUnit]:
        """Add user to a business unit."""
        # Validate that user exists
        user = self.session.get(User, user_id)
        if not user:
            return None

        # Validate that business unit exists
        business_unit = self.session.get(BusinessUnit, business_unit_id)
        if not business_unit:
            return None

        # Check if already a member
        existing = self.session.exec(
            select(UserBusinessUnit).where(
                UserBusinessUnit.user_id == user_id,
                UserBusinessUnit.business_unit_id == business_unit_id,
            )
        ).first()

        if existing:
            existing.is_manager = is_manager
            self.session.add(existing)
            self.session.flush()
            self.session.commit()
            self.session.refresh(existing)
            return existing

        membership = UserBusinessUnit(
            user_id=user_id,
            business_unit_id=business_unit_id,
            is_manager=is_manager,
        )
        self.session.add(membership)
        self.session.flush()
        self.session.commit()
        self.session.refresh(membership)
        return membership
    
    def remove_user_from_business_unit(
        self,
        user_id: UUID,
        business_unit_id: UUID,
    ) -> bool:
        """Remove user from a business unit."""
        membership = self.session.exec(
            select(UserBusinessUnit).where(
                UserBusinessUnit.user_id == user_id,
                UserBusinessUnit.business_unit_id == business_unit_id,
            )
        ).first()
        
        if membership is None:
            return False
        
        self.session.delete(membership)
        self.session.commit()
        return True
    
    def get_users_in_business_unit(
        self,
        business_unit_id: UUID,
    ) -> List[User]:
        """Get all users in a business unit."""
        memberships = self.session.exec(
            select(UserBusinessUnit).where(
                UserBusinessUnit.business_unit_id == business_unit_id
            )
        ).all()
        
        user_ids = [m.user_id for m in memberships]
        if not user_ids:
            return []
        
        users = self.session.exec(
            select(User).where(User.id.in_(user_ids))
        ).all()
        return list(users)
    
    def update_last_login(self, user_id: UUID) -> None:
        """Update user's last login timestamp."""
        user = self.session.get(User, user_id)
        if user:
            user.last_login = datetime.utcnow()
            self.session.commit()
    
    def get_or_create_from_microsoft(
        self,
        microsoft_id: str,
        email: str,
        display_name: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
    ) -> User:
        """Get existing user or create new one from Microsoft login."""
        user = self.get_user_by_microsoft_id(microsoft_id)
        
        if user:
            # Update info from Microsoft
            user.email = email
            user.display_name = display_name
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            user.last_login = datetime.utcnow()
            self.session.commit()
            self.session.refresh(user)
            return user
        
        # Check if user exists by email
        user = self.get_user_by_email(email)
        if user:
            # Link Microsoft account
            user.microsoft_id = microsoft_id
            user.last_login = datetime.utcnow()
            self.session.commit()
            self.session.refresh(user)
            return user
        
        # Create new user
        user_data = UserCreate(
            email=email,
            display_name=display_name,
            first_name=first_name,
            last_name=last_name,
            microsoft_id=microsoft_id,
            role=UserRole.EMPLOYEE,
        )
        return self.create_user(user_data)

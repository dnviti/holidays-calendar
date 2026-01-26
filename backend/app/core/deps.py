"""
Authentication dependencies for FastAPI.
"""
from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import decode_token
from app.models.user import User, UserRole


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """Get the current authenticated user."""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = session.get(User, UUID(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    return current_user


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


async def get_manager_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require manager or admin role."""
    if current_user.role not in [UserRole.ADMIN, UserRole.BU_MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager privileges required",
        )
    return current_user


def require_business_unit_access(business_unit_id: UUID):
    """Factory for requiring access to a specific business unit."""
    async def dependency(
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session)
    ) -> User:
        if current_user.is_admin():
            return current_user
        
        # Check if user is member of the business unit
        from app.models.user import UserBusinessUnit
        membership = session.exec(
            select(UserBusinessUnit).where(
                UserBusinessUnit.user_id == current_user.id,
                UserBusinessUnit.business_unit_id == business_unit_id
            )
        ).first()
        
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this business unit denied",
            )
        
        return current_user
    
    return dependency


def require_business_unit_manager(business_unit_id: UUID):
    """Factory for requiring manager access to a specific business unit."""
    async def dependency(
        current_user: User = Depends(get_current_user),
        session: Session = Depends(get_session)
    ) -> User:
        if current_user.is_admin():
            return current_user
        
        if not current_user.can_manage_business_unit(business_unit_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Manager access to this business unit required",
            )
        
        return current_user
    
    return dependency


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None."""
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        if payload is None:
            return None
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        user = session.get(User, UUID(user_id))
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None

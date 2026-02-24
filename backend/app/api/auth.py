"""
Authentication API endpoints.
"""
from datetime import datetime
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
from app.core.database import get_session
from app.core.security import create_access_token, verify_password
from app.core.deps import get_current_user
from app.models.user import User, UserRead
from app.services.auth_service import microsoft_auth_service
from app.services.user_service import UserService


router = APIRouter(prefix="/auth", tags=["Authentication"])

# Store for OAuth state tokens (in production, use Redis or similar)
oauth_states: dict[str, datetime] = {}


@router.get("/login")
async def login_microsoft():
    """Redirect to Microsoft login page."""
    if microsoft_auth_service.msal_app is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Microsoft authentication not configured"
        )
    
    # Generate state token
    state = secrets.token_urlsafe(32)
    oauth_states[state] = datetime.now(timezone.utc)
    
    # Clean old states (older than 10 minutes)
    current_time = datetime.now(timezone.utc)
    expired_states = [
        s for s, t in oauth_states.items()
        if (current_time - t).total_seconds() > 600
    ]
    for s in expired_states:
        del oauth_states[s]
    
    auth_url = microsoft_auth_service.get_auth_url(state=state)
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def auth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Handle Microsoft OAuth2 callback."""
    if error:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error={error}"
        )
    
    if not code or not state:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=missing_params"
        )
    
    # Verify state
    if state not in oauth_states:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=invalid_state"
        )
    del oauth_states[state]
    
    # Exchange code for token
    token_result = await microsoft_auth_service.get_token_from_code(code)
    if token_result is None:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=token_error"
        )
    
    # Get user info from Microsoft Graph
    access_token = token_result.get("access_token")
    user_info = await microsoft_auth_service.get_user_info(access_token)
    if user_info is None:
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=user_info_error"
        )
    
    # Create or update user
    user_service = UserService(session)
    user = user_service.get_or_create_from_microsoft(
        microsoft_id=user_info.get("id"),
        email=user_info.get("mail") or user_info.get("userPrincipalName", ""),
        display_name=user_info.get("displayName", ""),
        first_name=user_info.get("givenName"),
        last_name=user_info.get("surname"),
    )
    
    # Create JWT token
    jwt_token = create_access_token(data={"sub": str(user.id)})
    
    # Redirect to frontend with token
    return RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback?token={jwt_token}"
    )


@router.get("/me", response_model=UserRead)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current authenticated user information."""
    return current_user


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)."""
    return {"message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user),
):
    """Refresh access token."""
    new_token = create_access_token(data={"sub": str(current_user.id)})
    return {"access_token": new_token, "token_type": "bearer"}

@router.post("/login-local")
async def login_local(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    """Handle local email/password login."""
    try:
        user_service = UserService(session)
        print(f"Attempting login for: {form_data.username}")
        user = user_service.get_user_by_email(form_data.username)
        
        if not user:
            print("User not found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not user.hashed_password:
            print("User has no password")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password (no pass)",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        is_valid = verify_password(form_data.password, user.hashed_password)
        if not is_valid:
            print(f"Invalid password. Received: '{form_data.password}' (len={len(form_data.password)})")
            print(f"Stored hash: '{user.hashed_password}'")
            try:
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                print(f"Verify check: {pwd_context.verify(form_data.password, user.hashed_password)}")
            except Exception as e:
                print(f"Debug verify failed: {e}")
                
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
            
        user_service.update_last_login(user.id)
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

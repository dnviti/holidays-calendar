"""
Authentication API endpoints.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlmodel import Session

from fastapi.security import OAuth2PasswordRequestForm
from app.core.config import settings
from app.core.database import get_session
from app.core.security import create_access_token, verify_password
from app.core.deps import get_current_user
from app.models.user import User, UserRead
from app.services.auth_service import microsoft_auth_service
from app.services.user_service import UserService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

OAUTH_STATE_EXPIRY_MINUTES = 10


def _create_oauth_state() -> str:
    """Create a signed JWT state token for OAuth2 CSRF protection."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=OAUTH_STATE_EXPIRY_MINUTES)
    return jwt.encode(
        {"purpose": "oauth_state", "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _verify_oauth_state(state: str) -> bool:
    """Verify a signed JWT state token."""
    try:
        payload = jwt.decode(state, settings.secret_key, algorithms=[settings.algorithm])
        return payload.get("purpose") == "oauth_state"
    except JWTError:
        return False


@router.get("/login")
async def login_microsoft():
    """Redirect to Microsoft login page."""
    if microsoft_auth_service.msal_app is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Microsoft authentication not configured"
        )

    state = _create_oauth_state()
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
    
    # Verify state (signed JWT — stateless, works with multiple workers)
    if not _verify_oauth_state(state):
        return RedirectResponse(
            url=f"{settings.frontend_url}/login?error=invalid_state"
        )
    
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
        user = user_service.get_user_by_email(form_data.username)

        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(form_data.password, user.hashed_password):
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
    except Exception:
        logger.exception("Unexpected error during login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login"
        )

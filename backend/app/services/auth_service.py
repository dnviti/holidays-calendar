"""
Microsoft Azure AD authentication service.
"""
from typing import Optional
from uuid import UUID
import httpx
from msal import ConfidentialClientApplication

from app.core.config import settings
from app.models.user import User, UserCreate


class MicrosoftAuthService:
    """Service for Microsoft Azure AD authentication."""
    
    SCOPES = ["User.Read", "openid", "profile", "email"]
    GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"
    
    def __init__(self):
        """Initialize MSAL client."""
        if not all([
            settings.azure_client_id,
            settings.azure_client_secret,
            settings.azure_tenant_id
        ]):
            self.msal_app = None
            return
            
        self.msal_app = ConfidentialClientApplication(
            settings.azure_client_id,
            authority=settings.azure_authority,
            client_credential=settings.azure_client_secret,
        )
    
    def get_auth_url(self, state: Optional[str] = None) -> str:
        """Get Microsoft login URL."""
        if self.msal_app is None:
            raise ValueError("Microsoft authentication not configured")
        
        auth_url = self.msal_app.get_authorization_request_url(
            scopes=self.SCOPES,
            redirect_uri=settings.azure_redirect_uri,
            state=state,
        )
        return auth_url
    
    async def get_token_from_code(self, code: str) -> Optional[dict]:
        """Exchange authorization code for access token."""
        if self.msal_app is None:
            return None
        
        result = self.msal_app.acquire_token_by_authorization_code(
            code,
            scopes=self.SCOPES,
            redirect_uri=settings.azure_redirect_uri,
        )
        
        if "access_token" in result:
            return result
        return None
    
    async def get_user_info(self, access_token: str) -> Optional[dict]:
        """Get user information from Microsoft Graph API."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.GRAPH_API_ENDPOINT}/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if response.status_code == 200:
                return response.json()
            return None
    
    async def get_user_photo(self, access_token: str) -> Optional[bytes]:
        """Get user profile photo from Microsoft Graph API."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.GRAPH_API_ENDPOINT}/me/photo/$value",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if response.status_code == 200:
                return response.content
            return None
    
    def extract_user_data(self, user_info: dict) -> UserCreate:
        """Extract user data from Microsoft Graph response."""
        return UserCreate(
            email=user_info.get("mail") or user_info.get("userPrincipalName", ""),
            display_name=user_info.get("displayName", ""),
            first_name=user_info.get("givenName"),
            last_name=user_info.get("surname"),
            microsoft_id=user_info.get("id"),
        )


# Singleton instance
microsoft_auth_service = MicrosoftAuthService()

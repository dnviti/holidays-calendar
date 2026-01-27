"""Microsoft Graph API client with pagination and rate limiting."""
import asyncio
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx


class RateLimiter:
    """Rate limiter for API requests."""

    def __init__(self, max_requests: int = 100, time_window: int = 60):
        """Initialize rate limiter.

        Args:
            max_requests: Maximum number of requests allowed in time window
            time_window: Time window in seconds
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests: List[float] = []

    async def wait_if_needed(self):
        """Wait if rate limit would be exceeded."""
        now = time.time()

        # Remove requests outside the time window
        self.requests = [r for r in self.requests if now - r < self.time_window]

        # Check if we need to wait
        if len(self.requests) >= self.max_requests:
            wait_time = self.time_window - (now - self.requests[0])
            if wait_time > 0:
                await asyncio.sleep(wait_time)
                self.requests = []

        self.requests.append(now)


class MicrosoftGraphClient:
    """Client for Microsoft Graph API operations."""

    BASE_URL = "https://graph.microsoft.com/v1.0"

    def __init__(self, access_token: str):
        """Initialize Graph API client.

        Args:
            access_token: Microsoft access token with appropriate scopes
        """
        self.access_token = access_token
        self.client = httpx.AsyncClient(timeout=30.0)
        self.rate_limiter = RateLimiter(max_requests=100, time_window=60)

    async def get_paginated(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> List[Dict[str, Any]]:
        """Fetch all pages from a paginated endpoint.

        Args:
            endpoint: API endpoint (e.g., "/users")
            params: Query parameters
            max_retries: Maximum number of retries on failure

        Returns:
            List of all items from all pages

        Raises:
            httpx.HTTPStatusError: On API errors
        """
        results = []
        url = f"{self.BASE_URL}{endpoint}"

        # Add query parameters to initial URL
        if params:
            url = f"{url}?{urlencode(params)}"

        while url:
            await self.rate_limiter.wait_if_needed()

            # Retry logic with exponential backoff
            for attempt in range(max_retries):
                try:
                    response = await self.client.get(
                        url,
                        headers={"Authorization": f"Bearer {self.access_token}"},
                    )

                    # Handle rate limiting
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", 60))
                        await asyncio.sleep(retry_after)
                        continue

                    response.raise_for_status()
                    data = response.json()

                    # Add items from this page
                    results.extend(data.get("value", []))

                    # Get next page URL
                    url = data.get("@odata.nextLink")
                    break  # Success, exit retry loop

                except httpx.HTTPStatusError as e:
                    if e.response.status_code in [500, 502, 503, 504]:
                        # Server errors - retry with backoff
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                    raise  # Re-raise for other errors or final attempt

                except httpx.TimeoutException:
                    # Timeout - retry with backoff
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    raise

        return results

    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Single GET request to Graph API.

        Args:
            endpoint: API endpoint (e.g., "/me")
            params: Query parameters
            max_retries: Maximum number of retries on failure

        Returns:
            Response JSON data

        Raises:
            httpx.HTTPStatusError: On API errors
        """
        url = f"{self.BASE_URL}{endpoint}"
        if params:
            url = f"{url}?{urlencode(params)}"

        await self.rate_limiter.wait_if_needed()

        # Retry logic with exponential backoff
        for attempt in range(max_retries):
            try:
                response = await self.client.get(
                    url,
                    headers={"Authorization": f"Bearer {self.access_token}"},
                )

                # Handle rate limiting
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    await asyncio.sleep(retry_after)
                    continue

                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                if e.response.status_code in [500, 502, 503, 504]:
                    # Server errors - retry with backoff
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                raise  # Re-raise for other errors or final attempt

            except httpx.TimeoutException:
                # Timeout - retry with backoff
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

        # Should not reach here, but satisfy type checker
        raise httpx.TimeoutException("Max retries exceeded")

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

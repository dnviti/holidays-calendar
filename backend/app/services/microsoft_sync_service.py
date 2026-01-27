"""Microsoft 365 sync service for users and groups."""
from typing import Dict, List, Optional, Set
from uuid import UUID

from sqlmodel import Session, select

from app.models.business_unit import BusinessUnit
from app.models.sync import (
    MicrosoftGroup,
    MicrosoftUser,
    SyncDetail,
    SyncError,
    SyncResult,
)
from app.models.user import User, UserBusinessUnit, UserRole
from app.services.microsoft_graph_client import MicrosoftGraphClient


class MicrosoftSyncService:
    """Service for syncing users and groups from Microsoft 365."""

    def __init__(self, session: Session, access_token: str):
        """Initialize sync service.

        Args:
            session: Database session
            access_token: Microsoft access token with elevated permissions
        """
        self.session = session
        self.access_token = access_token
        self.graph_client = MicrosoftGraphClient(access_token)

    async def fetch_all_microsoft_users(
        self, filter_query: Optional[str] = None
    ) -> List[MicrosoftUser]:
        """Fetch all users from Microsoft 365.

        Args:
            filter_query: Optional OData filter query

        Returns:
            List of Microsoft users
        """
        params = {
            "$select": "id,mail,userPrincipalName,displayName,givenName,surname,jobTitle,department,accountEnabled",
            "$top": 999,
        }

        if filter_query:
            params["$filter"] = filter_query

        users_data = await self.graph_client.get_paginated("/users", params)

        microsoft_users = []
        for user_data in users_data:
            microsoft_users.append(
                MicrosoftUser(
                    id=user_data.get("id", ""),
                    email=user_data.get("mail") or user_data.get("userPrincipalName", ""),
                    display_name=user_data.get("displayName", ""),
                    first_name=user_data.get("givenName"),
                    last_name=user_data.get("surname"),
                    job_title=user_data.get("jobTitle"),
                    department=user_data.get("department"),
                    is_enabled=user_data.get("accountEnabled", True),
                )
            )

        return microsoft_users

    async def fetch_all_microsoft_groups(self) -> List[MicrosoftGroup]:
        """Fetch all groups from Microsoft 365.

        Returns:
            List of Microsoft groups
        """
        params = {
            "$select": "id,displayName,description,mail",
            "$top": 999,
        }

        groups_data = await self.graph_client.get_paginated("/groups", params)

        microsoft_groups = []
        for group_data in groups_data:
            group_id = group_data.get("id", "")

            # Fetch member count
            try:
                members_response = await self.graph_client.get(
                    f"/groups/{group_id}/members",
                    params={"$count": "true", "$top": 1},
                )
                member_count = members_response.get("@odata.count", 0)
            except Exception:
                member_count = 0

            microsoft_groups.append(
                MicrosoftGroup(
                    id=group_id,
                    name=group_data.get("displayName", ""),
                    description=group_data.get("description"),
                    mail=group_data.get("mail"),
                    member_count=member_count,
                )
            )

        return microsoft_groups

    async def sync_users(
        self,
        user_ids: Optional[List[str]] = None,
        dry_run: bool = False,
    ) -> SyncResult:
        """Sync users from Microsoft 365.

        Args:
            user_ids: Optional list of user IDs to sync (None = sync all)
            dry_run: If True, don't commit changes to database

        Returns:
            Sync result with statistics and details
        """
        result = SyncResult(success=True, dry_run=dry_run)

        try:
            # Fetch Microsoft users
            filter_query = None
            if user_ids:
                # Build filter for specific users
                id_filters = " or ".join([f"id eq '{uid}'" for uid in user_ids])
                filter_query = f"({id_filters})"

            microsoft_users = await self.fetch_all_microsoft_users(filter_query)

            # Track Microsoft user IDs for deactivation check
            microsoft_user_ids: Set[str] = {user.id for user in microsoft_users}

            # Sync each user
            for ms_user in microsoft_users:
                try:
                    detail = await self._sync_single_user(ms_user, dry_run)
                    result.details.append(detail)

                    if detail.action == "created":
                        result.created += 1
                    elif detail.action == "updated":
                        result.updated += 1
                    elif detail.action == "skipped":
                        result.skipped += 1

                except Exception as e:
                    result.errors.append(
                        SyncError(
                            id=ms_user.id,
                            name=ms_user.display_name,
                            error=str(e),
                        )
                    )

            # Deactivate users removed from Microsoft 365
            deactivated = await self._deactivate_removed_users(
                microsoft_user_ids, dry_run
            )
            result.deactivated = len(deactivated)
            result.details.extend(deactivated)

            # Rollback if dry run
            if dry_run:
                self.session.rollback()
            else:
                self.session.commit()

        except Exception as e:
            result.success = False
            result.errors.append(
                SyncError(id="", name="General Error", error=str(e))
            )
            self.session.rollback()

        return result

    async def sync_groups(
        self,
        group_ids: Optional[List[str]] = None,
        dry_run: bool = False,
        include_members: bool = True,
    ) -> SyncResult:
        """Sync groups from Microsoft 365 as Business Units.

        Args:
            group_ids: Optional list of group IDs to sync (None = sync all)
            dry_run: If True, don't commit changes to database
            include_members: If True, sync group members as well

        Returns:
            Sync result with statistics and details
        """
        result = SyncResult(success=True, dry_run=dry_run)

        try:
            # Fetch Microsoft groups
            microsoft_groups = await self.fetch_all_microsoft_groups()

            # Filter if specific group IDs requested
            if group_ids:
                microsoft_groups = [g for g in microsoft_groups if g.id in group_ids]

            # Sync each group
            for ms_group in microsoft_groups:
                try:
                    detail = await self._sync_single_group(
                        ms_group, include_members, dry_run
                    )
                    result.details.append(detail)

                    if detail.action == "created":
                        result.created += 1
                    elif detail.action == "skipped":
                        result.skipped += 1

                except Exception as e:
                    result.errors.append(
                        SyncError(
                            id=ms_group.id,
                            name=ms_group.name,
                            error=str(e),
                        )
                    )

            # Rollback if dry run
            if dry_run:
                self.session.rollback()
            else:
                self.session.commit()

        except Exception as e:
            result.success = False
            result.errors.append(
                SyncError(id="", name="General Error", error=str(e))
            )
            self.session.rollback()

        return result

    async def _sync_single_user(
        self, ms_user: MicrosoftUser, dry_run: bool
    ) -> SyncDetail:
        """Sync a single user.

        Args:
            ms_user: Microsoft user data
            dry_run: If True, don't commit changes

        Returns:
            Sync detail for this user

        Raises:
            Exception: On sync errors (conflicts, validation errors)
        """
        # Check if user exists by Microsoft ID
        existing_user = self.session.exec(
            select(User).where(User.microsoft_id == ms_user.id)
        ).first()

        if existing_user:
            # Update existing user
            existing_user.email = ms_user.email
            existing_user.display_name = ms_user.display_name
            existing_user.first_name = ms_user.first_name
            existing_user.last_name = ms_user.last_name
            existing_user.is_active = ms_user.is_enabled

            self.session.add(existing_user)

            return SyncDetail(
                id=ms_user.id,
                name=ms_user.display_name,
                action="updated",
                reason="User updated from Microsoft 365",
            )

        # Check for email conflict (same email, different Microsoft ID)
        email_conflict = self.session.exec(
            select(User).where(User.email == ms_user.email)
        ).first()

        if email_conflict:
            raise Exception(
                f"Email conflict: User with email {ms_user.email} already exists with different Microsoft ID"
            )

        # Create new user
        new_user = User(
            email=ms_user.email,
            display_name=ms_user.display_name,
            first_name=ms_user.first_name,
            last_name=ms_user.last_name,
            microsoft_id=ms_user.id,
            role=UserRole.EMPLOYEE,
            is_active=ms_user.is_enabled,
        )

        self.session.add(new_user)

        return SyncDetail(
            id=ms_user.id,
            name=ms_user.display_name,
            action="created",
            reason="New user created from Microsoft 365",
        )

    async def _sync_single_group(
        self, ms_group: MicrosoftGroup, include_members: bool, dry_run: bool
    ) -> SyncDetail:
        """Sync a single group as a Business Unit.

        Args:
            ms_group: Microsoft group data
            include_members: If True, sync group members
            dry_run: If True, don't commit changes

        Returns:
            Sync detail for this group
        """
        # Check if Business Unit with this name exists
        existing_bu = self.session.exec(
            select(BusinessUnit).where(BusinessUnit.name == ms_group.name)
        ).first()

        if existing_bu:
            return SyncDetail(
                id=ms_group.id,
                name=ms_group.name,
                action="skipped",
                reason=f"Business Unit with name '{ms_group.name}' already exists",
            )

        # Check if Business Unit with this Microsoft Group ID exists
        existing_bu_by_ms_id = self.session.exec(
            select(BusinessUnit).where(BusinessUnit.microsoft_group_id == ms_group.id)
        ).first()

        if existing_bu_by_ms_id:
            return SyncDetail(
                id=ms_group.id,
                name=ms_group.name,
                action="skipped",
                reason="Business Unit already synced from this Microsoft group",
            )

        # Create new Business Unit
        new_bu = BusinessUnit(
            name=ms_group.name,
            description=ms_group.description,
            microsoft_group_id=ms_group.id,
        )

        self.session.add(new_bu)
        self.session.flush()  # Get the ID

        # Sync group members if requested
        members_synced = 0
        if include_members:
            members_synced = await self._sync_group_members(ms_group.id, new_bu.id)

        return SyncDetail(
            id=ms_group.id,
            name=ms_group.name,
            action="created",
            reason=f"Business Unit created with {members_synced} members",
        )

    async def _sync_group_members(
        self, microsoft_group_id: str, business_unit_id: UUID
    ) -> int:
        """Sync members of a Microsoft group to a Business Unit.

        Args:
            microsoft_group_id: Microsoft group ID
            business_unit_id: Business Unit ID

        Returns:
            Number of members synced
        """
        try:
            # Fetch group members from Microsoft
            members_data = await self.graph_client.get_paginated(
                f"/groups/{microsoft_group_id}/members",
                params={"$select": "id,mail,userPrincipalName,displayName,givenName,surname"},
            )

            members_added = 0

            for member_data in members_data:
                member_ms_id = member_data.get("id")
                if not member_ms_id:
                    continue

                # Find user by Microsoft ID
                user = self.session.exec(
                    select(User).where(User.microsoft_id == member_ms_id)
                ).first()

                # If user doesn't exist, create them
                if not user:
                    user = User(
                        email=member_data.get("mail")
                        or member_data.get("userPrincipalName", ""),
                        display_name=member_data.get("displayName", ""),
                        first_name=member_data.get("givenName"),
                        last_name=member_data.get("surname"),
                        microsoft_id=member_ms_id,
                        role=UserRole.EMPLOYEE,
                        is_active=True,
                    )
                    self.session.add(user)
                    self.session.flush()  # Get the user ID

                # Check if membership already exists
                existing_membership = self.session.exec(
                    select(UserBusinessUnit).where(
                        UserBusinessUnit.user_id == user.id,
                        UserBusinessUnit.business_unit_id == business_unit_id,
                    )
                ).first()

                if not existing_membership:
                    # Add user to Business Unit
                    membership = UserBusinessUnit(
                        user_id=user.id,
                        business_unit_id=business_unit_id,
                        is_manager=False,
                    )
                    self.session.add(membership)
                    members_added += 1

            return members_added

        except Exception as e:
            # Log error but don't fail the entire group sync
            print(f"Error syncing members for group {microsoft_group_id}: {e}")
            return 0

    async def _deactivate_removed_users(
        self, microsoft_user_ids: Set[str], dry_run: bool
    ) -> List[SyncDetail]:
        """Deactivate users that were removed from Microsoft 365.

        Args:
            microsoft_user_ids: Set of Microsoft user IDs that exist in M365
            dry_run: If True, don't commit changes

        Returns:
            List of sync details for deactivated users
        """
        deactivated = []

        # Find all active users with Microsoft IDs
        active_ms_users = self.session.exec(
            select(User).where(
                User.microsoft_id.isnot(None),  # type: ignore
                User.is_active == True,  # noqa: E712
            )
        ).all()

        for user in active_ms_users:
            # If user's Microsoft ID is not in the current Microsoft user list
            if user.microsoft_id and user.microsoft_id not in microsoft_user_ids:
                user.is_active = False
                self.session.add(user)

                deactivated.append(
                    SyncDetail(
                        id=user.microsoft_id,
                        name=user.display_name,
                        action="deactivated",
                        reason="User no longer exists in Microsoft 365",
                    )
                )

        return deactivated

    async def close(self):
        """Close the Graph API client."""
        await self.graph_client.close()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

"""Initial migration

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create user table
    op.create_table(
        'user',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('display_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('first_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('last_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column('avatar_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('role', sa.Enum('ADMIN', 'BU_MANAGER', 'EMPLOYEE', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('microsoft_id', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=True)
    op.create_index(op.f('ix_user_microsoft_id'), 'user', ['microsoft_id'], unique=True)

    # Create businessunit table
    op.create_table(
        'businessunit',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('primary_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('secondary_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('accent_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('logo_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('manager_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['manager_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_businessunit_name'), 'businessunit', ['name'], unique=False)

    # Create user_business_unit table
    op.create_table(
        'user_business_unit',
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('business_unit_id', sa.Uuid(), nullable=False),
        sa.Column('is_manager', sa.Boolean(), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['business_unit_id'], ['businessunit.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('user_id', 'business_unit_id'),
    )

    # Create holiday table
    op.create_table(
        'holiday',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('holiday_type', sa.Enum('VACATION', 'SICK_LEAVE', 'PERSONAL', 'PARENTAL', 'OTHER', name='holidaytype'), nullable=False),
        sa.Column('is_half_day', sa.Boolean(), nullable=False),
        sa.Column('half_day_period', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('business_unit_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CHANGE_REQUESTED', 'CANCELLED', name='holidaystatus'), nullable=False),
        sa.Column('has_overlap', sa.Boolean(), nullable=False),
        sa.Column('overlap_user_ids', sa.JSON(), nullable=True),
        sa.Column('manager_notes', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
        sa.Column('reviewed_by_id', sa.Uuid(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['business_unit_id'], ['businessunit.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_holiday_user_id'), 'holiday', ['user_id'], unique=False)
    op.create_index(op.f('ix_holiday_business_unit_id'), 'holiday', ['business_unit_id'], unique=False)

    # Create app_branding table
    op.create_table(
        'app_branding',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('app_name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('app_tagline', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('primary_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('secondary_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('accent_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('success_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('warning_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('danger_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('info_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('background_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('surface_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('card_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('text_primary_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('text_secondary_color', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=False),
        sa.Column('logo_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('logo_dark_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('favicon_url', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('enable_dark_mode', sa.Boolean(), nullable=False),
        sa.Column('default_dark_mode', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('app_branding')
    op.drop_index(op.f('ix_holiday_business_unit_id'), table_name='holiday')
    op.drop_index(op.f('ix_holiday_user_id'), table_name='holiday')
    op.drop_table('holiday')
    op.drop_table('user_business_unit')
    op.drop_index(op.f('ix_businessunit_name'), table_name='businessunit')
    op.drop_table('businessunit')
    op.drop_index(op.f('ix_user_microsoft_id'), table_name='user')
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_table('user')

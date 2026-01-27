"""Add Microsoft sync features

Revision ID: 002_add_sync_features
Revises: 001_initial
Create Date: 2026-01-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '002_add_sync_features'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add microsoft_group_id to businessunit table
    op.add_column(
        'businessunit',
        sa.Column('microsoft_group_id', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True)
    )
    op.create_index(
        op.f('ix_businessunit_microsoft_group_id'),
        'businessunit',
        ['microsoft_group_id'],
        unique=True
    )

    # Create sync_log table
    op.create_table(
        'sync_log',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('sync_type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('initiated_by_id', sa.Uuid(), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('total_items', sa.Integer(), nullable=False),
        sa.Column('created_count', sa.Integer(), nullable=False),
        sa.Column('updated_count', sa.Integer(), nullable=False),
        sa.Column('skipped_count', sa.Integer(), nullable=False),
        sa.Column('deactivated_count', sa.Integer(), nullable=False),
        sa.Column('error_count', sa.Integer(), nullable=False),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.Column('sync_details', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['initiated_by_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    # Drop sync_log table
    op.drop_table('sync_log')

    # Remove microsoft_group_id from businessunit table
    op.drop_index(op.f('ix_businessunit_microsoft_group_id'), table_name='businessunit')
    op.drop_column('businessunit', 'microsoft_group_id')

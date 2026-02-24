"""Add notifications table

Revision ID: 003_add_notifications
Revises: 002_add_sync_features
Create Date: 2026-02-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '003_add_notifications'
down_revision: Union[str, None] = '002_add_sync_features'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notification',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('recipient_id', sa.Uuid(), nullable=False),
        sa.Column('type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('message', sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=False),
        sa.Column('holiday_id', sa.Uuid(), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['recipient_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['holiday_id'], ['holiday.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_recipient_id', 'notification', ['recipient_id'])
    op.create_index('ix_notification_holiday_id', 'notification', ['holiday_id'])
    op.create_index('ix_notification_recipient_is_read', 'notification', ['recipient_id', 'is_read'])


def downgrade() -> None:
    op.drop_index('ix_notification_recipient_is_read', table_name='notification')
    op.drop_index('ix_notification_holiday_id', table_name='notification')
    op.drop_index('ix_notification_recipient_id', table_name='notification')
    op.drop_table('notification')

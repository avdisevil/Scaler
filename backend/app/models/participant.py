from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Participant(Base):
    """
    Participant table representing membership in conversations.
    Tracks which users are in which conversations and their roles.
    Also tracks the last read message for unread count calculation.
    """
    __tablename__ = "participants"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Role: 'admin' (can add/remove members, change settings) or 'member'
    role = Column(String(20), default="member", nullable=False)

    # Unread tracking: the last message this user has read in this conversation
    # NULL means no messages read yet
    last_read_message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)

    # Timestamp
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="participants")
    last_read_message = relationship("Message", foreign_keys=[last_read_message_id])

    # Constraints and indexes
    __table_args__ = (
        # A user can only be in a conversation once
        UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_user'),
        Index('idx_participants_conversation_id', 'conversation_id'),
        Index('idx_participants_user_id', 'user_id'),
        Index('idx_participants_role', 'role'),
    )

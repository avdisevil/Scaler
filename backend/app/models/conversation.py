from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Conversation(Base):
    """
    Conversation table representing both direct messages and group chats.
    For direct messages: name is NULL, is_group is FALSE
    For group chats: name is set, is_group is TRUE
    """
    __tablename__ = "conversations"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Conversation metadata
    name = Column(String(100), nullable=True)  # Only set for group chats
    is_group = Column(Boolean, default=False, nullable=False, index=True)
    avatar_url = Column(Text, nullable=True)

    # Group-specific metadata (NULL for direct messages)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    participants = relationship("Participant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

    # Indexes for common queries
    __table_args__ = (
        Index('idx_conversations_is_group', 'is_group'),
        Index('idx_conversations_updated_at', 'updated_at'),
        Index('idx_conversations_created_by', 'created_by'),
    )

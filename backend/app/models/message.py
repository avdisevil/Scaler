from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Message(Base):
    """
    Message table storing all chat messages.
    Supports text messages with optional reply-to and disappearing message features.
    """
    __tablename__ = "messages"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text", nullable=False)  # 'text', 'image', 'video', etc.

    # Reply-to functionality (self-referential)
    reply_to_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)

    # Message status tracking: 'sending', 'sent', 'delivered', 'read'
    status = Column(String(20), default="sending", nullable=False, index=True)

    # Optional features
    reaction = Column(String(50), nullable=True)  # Emoji reaction
    disappears_at = Column(DateTime(timezone=True), nullable=True)  # For disappearing messages

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    reply_to = relationship("Message", remote_side=[id])
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")
    # Participants can reference this as their last read message
    last_read_by = relationship("Participant", foreign_keys="Participant.last_read_message_id", overlaps="last_read_message")

    # Indexes for common queries
    __table_args__ = (
        Index('idx_messages_conversation_created', 'conversation_id', 'created_at'),
        Index('idx_messages_sender_id', 'sender_id'),
        Index('idx_messages_status', 'status'),
        Index('idx_messages_reply_to_id', 'reply_to_id'),
    )

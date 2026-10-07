from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class MessageReceipt(Base):
    """
    MessageReceipt table tracking delivery and read receipts.
    Each row represents a user's acknowledgement of a message.
    """
    __tablename__ = "message_receipts"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Receipt status: 'delivered' or 'read'
    status = Column(String(20), nullable=False)

    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User", back_populates="message_receipts")

    # Constraints and indexes
    __table_args__ = (
        # One receipt per user per message (latest status wins)
        UniqueConstraint('message_id', 'user_id', name='uq_message_user_receipt'),
        Index('idx_message_receipts_message_id', 'message_id'),
        Index('idx_message_receipts_user_id', 'user_id'),
        Index('idx_message_receipts_status', 'status'),
    )

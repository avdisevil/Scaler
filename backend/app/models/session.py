from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Session(Base):
    """
    Session table for managing user sessions.
    Stores JWT refresh tokens and session metadata.
    Note: Access tokens are stateless (JWT), but refresh tokens need persistence.
    """
    __tablename__ = "sessions"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Session identifier (hashed refresh token or session ID)
    session_id = Column(String(255), unique=True, index=True, nullable=False)

    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Session metadata
    device_info = Column(String(255), nullable=True)  # User agent or device identifier
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6

    # Timestamps
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # Indexes for common queries
    __table_args__ = (
        Index('idx_sessions_user_id', 'user_id'),
        Index('idx_sessions_expires_at', 'expires_at'),
    )

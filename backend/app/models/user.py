from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """
    User account table.
    Stores user profile information and authentication credentials.
    Uses OTP-based authentication (no password required).
    """
    __tablename__ = "users"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Identifiers - phone is the primary identifier for OTP-based auth
    phone = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)  # Optional

    # Authentication - password is optional for OTP-based auth
    password_hash = Column(String(255), nullable=True)

    # Profile information
    display_name = Column(String(100), nullable=True)  # Set during profile setup
    avatar_url = Column(Text, nullable=True)

    # Verification and status
    is_verified = Column(Boolean, default=False, nullable=False)  # Phone verified via OTP
    is_online = Column(Boolean, default=False, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    # Registration state
    registration_complete = Column(Boolean, default=False, nullable=False)  # True after profile setup

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    # A user can have many contacts (people they've added to their address book)
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user", cascade="all, delete-orphan")
    # A user can be in many contacts (others can add them)
    contact_of = relationship("Contact", foreign_keys="Contact.contact_user_id", back_populates="contact_user")
    # A user participates in many conversations
    participants = relationship("Participant", back_populates="user", cascade="all, delete-orphan")
    # A user sends many messages
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender", cascade="all, delete-orphan")
    # A user receives many message receipts
    message_receipts = relationship("MessageReceipt", back_populates="user", cascade="all, delete-orphan")

    # Indexes for common queries
    __table_args__ = (
        Index('idx_users_display_name', 'display_name'),
        Index('idx_users_is_online', 'is_online'),
        Index('idx_users_registration_complete', 'registration_complete'),
    )

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Contact(Base):
    """
    Contact table representing a user's address book.
    Each row represents one user's contact relationship with another user.
    """
    __tablename__ = "contacts"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys - both user_id and contact_user_id reference users table
    # user_id: the owner of this contact entry
    # contact_user_id: the person being added as a contact
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Optional nickname for the contact (overrides contact's display_name for this user)
    display_name = Column(String(100), nullable=True)

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_user_id], back_populates="contact_of")

    # Constraints and indexes
    __table_args__ = (
        # A user can only have one contact entry for another user
        UniqueConstraint('user_id', 'contact_user_id', name='uq_user_contact'),
        Index('idx_contacts_user_id', 'user_id'),
        Index('idx_contacts_contact_user_id', 'contact_user_id'),
    )

from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.contact import Contact


class ContactRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, contact_data: dict) -> Contact:
        db_contact = Contact(user_id=user_id, **contact_data)
        self.db.add(db_contact)
        self.db.commit()
        self.db.refresh(db_contact)
        return db_contact

    def get_by_id(self, contact_id: int) -> Optional[Contact]:
        return self.db.query(Contact).filter(Contact.id == contact_id).first()

    def get_by_user_and_contact(self, user_id: int, contact_user_id: int) -> Optional[Contact]:
        return self.db.query(Contact).filter(
            Contact.user_id == user_id,
            Contact.contact_user_id == contact_user_id
        ).first()

    def get_user_contacts(self, user_id: int) -> List[Contact]:
        return self.db.query(Contact).filter(Contact.user_id == user_id).all()

    def search_user_contacts(self, user_id: int, query: str) -> List[Contact]:
        from app.models.user import User
        return self.db.query(Contact).join(Contact.contact_user).filter(
            Contact.user_id == user_id,
            (
                Contact.display_name.ilike(f"%{query}%") |
                User.display_name.ilike(f"%{query}%") |
                User.phone.ilike(f"%{query}%")
            )
        ).all()

    def delete(self, contact_id: int) -> bool:
        db_contact = self.get_by_id(contact_id)
        if db_contact:
            self.db.delete(db_contact)
            self.db.commit()
            return True
        return False

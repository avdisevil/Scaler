from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from app.repositories.user_repository import UserRepository
from app.repositories.contact_repository import ContactRepository
from app.services.auth_service import AuthService


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.contact_repo = ContactRepository(db)
        self.auth_service = AuthService(db)

    def create_user(self, email: str, phone: str, password: str, display_name: str) -> dict:
        password_hash = self.auth_service.hash_password(password)
        user = self.user_repo.create({
            "email": email,
            "phone": phone,
            "password_hash": password_hash,
            "display_name": display_name
        })
        return {
            "id": user.id,
            "email": user.email,
            "phone": user.phone,
            "display_name": user.display_name
        }

    def get_user(self, user_id: int) -> Optional[dict]:
        user = self.user_repo.get_by_id(user_id)
        if user:
            return {
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "is_verified": user.is_verified,
                "is_online": user.is_online,
                "registration_complete": user.registration_complete,
                "last_seen_at": user.last_seen_at,
                "created_at": user.created_at
            }
        return None

    def update_user(self, user_id: int, update_data: dict) -> Optional[dict]:
        user = self.user_repo.update(user_id, update_data)
        if user:
            return self.get_user(user_id)
        return None

    def search_users(self, query: str, current_user_id: int) -> List[dict]:
        users = self.user_repo.search(query, current_user_id)
        return [
            {
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "is_online": user.is_online,
                "is_verified": user.is_verified,
                "registration_complete": user.registration_complete,
                "last_seen_at": user.last_seen_at,
                "created_at": user.created_at
            }
            for user in users
        ]

    def add_contact(self, user_id: int, contact_user_id: int, display_name: Optional[str] = None) -> dict:
        if user_id == contact_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot add yourself as a contact"
            )

        target_user = self.user_repo.get_by_id(contact_user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        existing = self.contact_repo.get_by_user_and_contact(user_id, contact_user_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contact already exists"
            )

        contact = self.contact_repo.create(user_id, {
            "contact_user_id": contact_user_id,
            "display_name": display_name
        })

        return {
            "id": contact.id,
            "user_id": contact.user_id,
            "contact_user_id": contact.contact_user_id,
            "display_name": contact.display_name,
            "created_at": contact.created_at,
            "contact_user": {
                "id": target_user.id,
                "email": target_user.email,
                "phone": target_user.phone,
                "display_name": target_user.display_name,
                "avatar_url": target_user.avatar_url,
                "is_verified": target_user.is_verified,
                "is_online": target_user.is_online,
                "registration_complete": target_user.registration_complete,
                "last_seen_at": target_user.last_seen_at,
                "created_at": target_user.created_at
            }
        }

    def get_contacts(self, user_id: int, query: Optional[str] = None) -> List[dict]:
        if query:
            contacts = self.contact_repo.search_user_contacts(user_id, query)
        else:
            contacts = self.contact_repo.get_user_contacts(user_id)

        return [
            {
                "id": contact.id,
                "user_id": contact.user_id,
                "contact_user_id": contact.contact_user_id,
                "display_name": contact.display_name,
                "created_at": contact.created_at,
                "contact_user": {
                    "id": contact.contact_user.id,
                    "email": contact.contact_user.email,
                    "phone": contact.contact_user.phone,
                    "display_name": contact.contact_user.display_name,
                    "avatar_url": contact.contact_user.avatar_url,
                    "is_verified": contact.contact_user.is_verified,
                    "is_online": contact.contact_user.is_online,
                    "registration_complete": contact.contact_user.registration_complete,
                    "last_seen_at": contact.contact_user.last_seen_at,
                    "created_at": contact.contact_user.created_at
                } if contact.contact_user else None
            }
            for contact in contacts
        ]

    def set_online_status(self, user_id: int, is_online: bool) -> Optional[dict]:
        user = self.user_repo.set_online_status(user_id, is_online)
        if user:
            return self.get_user(user_id)
        return None

    def update_last_seen(self, user_id: int) -> Optional[dict]:
        user = self.user_repo.update_last_seen(user_id)
        if user:
            return self.get_user(user_id)
        return None

from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_data: dict) -> User:
        db_user = User(**user_data)
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_phone(self, phone: str) -> Optional[User]:
        return self.db.query(User).filter(User.phone == phone).first()

    def update(self, user_id: int, user_data: dict) -> Optional[User]:
        db_user = self.get_by_id(user_id)
        if db_user:
            for key, value in user_data.items():
                setattr(db_user, key, value)
            self.db.commit()
            self.db.refresh(db_user)
        return db_user

    def search(self, query: str, current_user_id: int) -> List[User]:
        return self.db.query(User).filter(
            User.id != current_user_id,
            (User.display_name.ilike(f"%{query}%") | User.phone.ilike(f"%{query}%"))
        ).all()

    def set_online_status(self, user_id: int, is_online: bool) -> Optional[User]:
        db_user = self.get_by_id(user_id)
        if db_user:
            db_user.is_online = is_online
            self.db.commit()
            self.db.refresh(db_user)
        return db_user

    def update_last_seen(self, user_id: int) -> Optional[User]:
        db_user = self.get_by_id(user_id)
        if db_user:
            db_user.last_seen_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(db_user)
        return db_user

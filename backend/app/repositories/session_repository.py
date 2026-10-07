from sqlalchemy.orm import Session as DbSession
from typing import Optional, List
from app.models.session import Session as SessionModel
from datetime import datetime


class SessionRepository:
    def __init__(self, db: DbSession):
        self.db = db

    def create(self, session_data: dict) -> SessionModel:
        db_session = SessionModel(**session_data)
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def get_by_id(self, session_id: int) -> Optional[SessionModel]:
        return self.db.query(SessionModel).filter(SessionModel.id == session_id).first()

    def get_by_session_id(self, session_id: str) -> Optional[SessionModel]:
        return self.db.query(SessionModel).filter(SessionModel.session_id == session_id).first()

    def get_user_sessions(self, user_id: int) -> List[SessionModel]:
        return self.db.query(SessionModel).filter(SessionModel.user_id == user_id).all()

    def update_last_used(self, session_id: str) -> Optional[SessionModel]:
        db_session = self.get_by_session_id(session_id)
        if db_session:
            db_session.last_used_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(db_session)
        return db_session

    def delete(self, session_id: str) -> bool:
        db_session = self.get_by_session_id(session_id)
        if db_session:
            self.db.delete(db_session)
            self.db.commit()
            return True
        return False

    def delete_expired(self) -> int:
        """
        Delete all expired sessions.
        Returns the number of sessions deleted.
        """
        expired_sessions = self.db.query(SessionModel).filter(
            SessionModel.expires_at < datetime.utcnow()
        ).all()

        count = len(expired_sessions)
        for session in expired_sessions:
            self.db.delete(session)

        self.db.commit()
        return count

    def delete_user_sessions(self, user_id: int) -> int:
        """
        Delete all sessions for a user (e.g., on logout all devices).
        Returns the number of sessions deleted.
        """
        sessions = self.db.query(SessionModel).filter(SessionModel.user_id == user_id).all()
        count = len(sessions)

        for session in sessions:
            self.db.delete(session)

        self.db.commit()
        return count

from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.conversation import Conversation
from app.models.participant import Participant


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, conversation_data: dict) -> Conversation:
        db_conversation = Conversation(**conversation_data)
        self.db.add(db_conversation)
        self.db.commit()
        self.db.refresh(db_conversation)
        return db_conversation

    def get_by_id(self, conversation_id: int) -> Optional[Conversation]:
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def get_user_conversations(self, user_id: int) -> List[Conversation]:
        return self.db.query(Conversation).join(Participant).filter(
            Participant.user_id == user_id
        ).all()

    def update(self, conversation_id: int, conversation_data: dict) -> Optional[Conversation]:
        db_conversation = self.get_by_id(conversation_id)
        if db_conversation:
            for key, value in conversation_data.items():
                setattr(db_conversation, key, value)
            self.db.commit()
            self.db.refresh(db_conversation)
        return db_conversation

    def delete(self, conversation_id: int) -> bool:
        db_conversation = self.get_by_id(conversation_id)
        if db_conversation:
            self.db.delete(db_conversation)
            self.db.commit()
            return True
        return False

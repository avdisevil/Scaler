from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.message import Message
from app.models.message_receipt import MessageReceipt


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, message_data: dict) -> Message:
        db_message = Message(**message_data)
        self.db.add(db_message)
        self.db.commit()
        self.db.refresh(db_message)
        return db_message

    def get_by_id(self, message_id: int) -> Optional[Message]:
        return self.db.query(Message).filter(Message.id == message_id).first()

    def get_conversation_messages(
        self,
        conversation_id: int,
        limit: int = 50,
        offset: int = 0,
        before_id: Optional[int] = None
    ) -> List[Message]:
        query = self.db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc())

        if before_id:
            query = query.filter(Message.id < before_id)

        return query.limit(limit).offset(offset).all()

    def update_status(self, message_id: int, status: str) -> Optional[Message]:
        db_message = self.get_by_id(message_id)
        if db_message:
            db_message.status = status
            self.db.commit()
            self.db.refresh(db_message)
        return db_message

    def add_receipt(self, message_id: int, user_id: int, status: str) -> MessageReceipt:
        db_receipt = self.db.query(MessageReceipt).filter(
            MessageReceipt.message_id == message_id,
            MessageReceipt.user_id == user_id
        ).first()
        if db_receipt:
            db_receipt.status = status
        else:
            db_receipt = MessageReceipt(
                message_id=message_id,
                user_id=user_id,
                status=status
            )
            self.db.add(db_receipt)
        self.db.commit()
        self.db.refresh(db_receipt)
        return db_receipt

    def update_reaction(self, message_id: int, reaction: Optional[str]) -> Optional[Message]:
        db_message = self.get_by_id(message_id)
        if db_message:
            db_message.reaction = reaction
            self.db.commit()
            self.db.refresh(db_message)
        return db_message

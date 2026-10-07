from sqlalchemy.orm import Session
from typing import Optional, List
from app.repositories.message_repository import MessageRepository
from app.repositories.user_repository import UserRepository
from app.models.message import Message


class MessageService:
    def __init__(self, db: Session):
        self.db = db
        self.message_repo = MessageRepository(db)
        self.user_repo = UserRepository(db)

    def create_message(
        self,
        conversation_id: int,
        sender_id: int,
        content: str,
        message_type: str = "text",
        reply_to_id: Optional[int] = None
    ) -> dict:
        message = self.message_repo.create({
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "content": content,
            "message_type": message_type,
            "reply_to_id": reply_to_id,
            "status": "sending"
        })

        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "sender_id": message.sender_id,
            "content": message.content,
            "message_type": message.message_type,
            "reply_to_id": message.reply_to_id,
            "status": message.status,
            "reaction": message.reaction,
            "disappears_at": message.disappears_at,
            "created_at": message.created_at,
            "updated_at": message.updated_at
        }

    def get_message(self, message_id: int) -> Optional[dict]:
        message = self.message_repo.get_by_id(message_id)
        if message:
            return {
                "id": message.id,
                "conversation_id": message.conversation_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "message_type": message.message_type,
                "reply_to_id": message.reply_to_id,
                "status": message.status,
                "reaction": message.reaction,
                "disappears_at": message.disappears_at,
                "created_at": message.created_at,
                "updated_at": message.updated_at
            }
        return None

    def get_conversation_messages(
        self,
        conversation_id: int,
        limit: int = 50,
        offset: int = 0,
        before_id: Optional[int] = None
    ) -> List[dict]:
        messages = self.message_repo.get_conversation_messages(
            conversation_id, limit, offset, before_id
        )
        return [
            {
                "id": msg.id,
                "conversation_id": msg.conversation_id,
                "sender_id": msg.sender_id,
                "content": msg.content,
                "message_type": msg.message_type,
                "reply_to_id": msg.reply_to_id,
                "status": msg.status,
                "reaction": msg.reaction,
                "disappears_at": msg.disappears_at,
                "created_at": msg.created_at,
                "updated_at": msg.updated_at
            }
            for msg in messages
        ]

    def update_message_status(self, message_id: int, status: str) -> Optional[dict]:
        message = self.message_repo.update_status(message_id, status)
        if message:
            return self.get_message(message_id)
        return None

    def add_message_receipt(self, message_id: int, user_id: int, status: str) -> dict:
        receipt = self.message_repo.add_receipt(message_id, user_id, status)
        return {
            "id": receipt.id,
            "message_id": receipt.message_id,
            "user_id": receipt.user_id,
            "status": receipt.status,
            "timestamp": receipt.timestamp
        }

    def update_message_reaction(self, message_id: int, reaction: Optional[str]) -> Optional[dict]:
        message = self.message_repo.update_reaction(message_id, reaction)
        if message:
            return self.get_message(message_id)
        return None

    def mark_messages_as_delivered(self, conversation_id: int, user_id: int) -> List[int]:
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.status == "sent"
        ).all()

        updated_ids = []
        for message in messages:
            self.message_repo.update_status(message.id, "delivered")
            self.message_repo.add_receipt(message.id, user_id, "delivered")
            updated_ids.append(message.id)

        return updated_ids

    def mark_messages_as_read(self, conversation_id: int, user_id: int) -> List[int]:
        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.status.in_(["sent", "delivered"])
        ).all()

        updated_ids = []
        for message in messages:
            self.message_repo.update_status(message.id, "read")
            self.message_repo.add_receipt(message.id, user_id, "read")
            updated_ids.append(message.id)

        return updated_ids

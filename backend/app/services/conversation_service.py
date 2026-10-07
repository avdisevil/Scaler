from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_, and_
from typing import Optional, List
from datetime import datetime
from app.repositories.conversation_repository import ConversationRepository
from app.models.conversation import Conversation
from app.models.participant import Participant
from app.models.message import Message
from app.models.user import User
from app.database import Base


class ConversationService:
    def __init__(self, db: Session):
        self.db = db
        self.conversation_repo = ConversationRepository(db)

    def is_participant(self, conversation_id: int, user_id: int) -> bool:
        """Check if user is a member of the conversation."""
        return self.db.query(Participant).filter(
            Participant.conversation_id == conversation_id,
            Participant.user_id == user_id
        ).first() is not None

    def create_conversation(
        self,
        name: Optional[str],
        is_group: bool,
        participant_ids: List[int],
        created_by: Optional[int] = None
    ) -> dict:
        # Validate all participant IDs exist
        from app.models import User
        for user_id in set(participant_ids):
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User with id {user_id} does not exist")

        conversation = self.conversation_repo.create({
            "name": name,
            "is_group": is_group,
            "created_by": created_by
        })

        for user_id in set(participant_ids):
            # Creator is admin, others are members
            role = "admin" if is_group and user_id == created_by else "member"
            participant = Participant(
                conversation_id=conversation.id,
                user_id=user_id,
                role=role
            )
            self.db.add(participant)

        self.db.commit()
        self.db.refresh(conversation)

        return self.get_conversation(conversation.id, current_user_id=created_by)

    def get_conversation(self, conversation_id: int, current_user_id: Optional[int] = None) -> Optional[dict]:
        conversation = self.conversation_repo.get_by_id(conversation_id)
        if not conversation:
            return None

        name = conversation.name
        avatar_url = conversation.avatar_url
        is_online = False
        last_seen_at = None

        if not conversation.is_group and current_user_id:
            other_p = self.db.query(Participant).filter(
                Participant.conversation_id == conversation.id,
                Participant.user_id != current_user_id
            ).first()
            if other_p and other_p.user:
                name = other_p.user.display_name or other_p.user.phone
                avatar_url = other_p.user.avatar_url
                is_online = bool(other_p.user.is_online)
                last_seen_at = other_p.user.last_seen_at

        latest_msg = self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc(), Message.id.desc()).first()

        unread_count = 0
        if current_user_id:
            unread_count = self.get_unread_count(conversation.id, current_user_id)

        latest_time = latest_msg.created_at if latest_msg else (conversation.updated_at or conversation.created_at)

        return {
            "id": conversation.id,
            "name": name,
            "is_group": conversation.is_group,
            "avatar_url": avatar_url,
            "created_by": conversation.created_by,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "latest_message_time": latest_time,
            "last_message": latest_msg.content if latest_msg else None,
            "is_online": is_online,
            "last_seen_at": last_seen_at,
            "unread_count": unread_count
        }

    def get_conversation_by_id(self, conversation_id: int):
        return self.db.query(Conversation).filter(Conversation.id == conversation_id).first()

    def get_user_conversations(self, user_id: int, query: Optional[str] = None) -> List[dict]:
        """
        Get user's conversations with unread count and latest message time.
        """
        return self.get_user_conversations_with_unread(user_id, query)

    def update_conversation(self, conversation_id: int, update_data: dict) -> Optional[dict]:
        conversation = self.conversation_repo.update(conversation_id, update_data)
        if conversation:
            return self.get_conversation(conversation_id)
        return None

    def add_participant(self, conversation_id: int, user_id: int, role: str = "member") -> dict:
        participant = Participant(
            conversation_id=conversation_id,
            user_id=user_id,
            role=role
        )
        self.db.add(participant)
        self.db.commit()
        self.db.refresh(participant)

        user_obj = self.db.query(User).filter(User.id == user_id).first()

        return {
            "id": participant.id,
            "conversation_id": participant.conversation_id,
            "user_id": participant.user_id,
            "role": participant.role,
            "joined_at": participant.joined_at,
            "user": user_obj
        }

    def remove_participant(self, conversation_id: int, user_id: int) -> bool:
        participant = self.db.query(Participant).filter(
            Participant.conversation_id == conversation_id,
            Participant.user_id == user_id
        ).first()

        if participant:
            self.db.delete(participant)
            self.db.commit()
            return True
        return False

    def get_participant(self, conversation_id: int, user_id: int) -> Optional[dict]:
        participant = self.db.query(Participant).options(
            joinedload(Participant.user)
        ).filter(
            Participant.conversation_id == conversation_id,
            Participant.user_id == user_id
        ).first()

        if participant:
            return {
                "id": participant.id,
                "conversation_id": participant.conversation_id,
                "user_id": participant.user_id,
                "role": participant.role,
                "joined_at": participant.joined_at,
                "user": participant.user
            }
        return None

    def get_participants(self, conversation_id: int) -> List[dict]:
        participants = self.db.query(Participant).options(
            joinedload(Participant.user)
        ).filter(
            Participant.conversation_id == conversation_id
        ).all()

        return [
            {
                "id": p.id,
                "conversation_id": p.conversation_id,
                "user_id": p.user_id,
                "role": p.role,
                "joined_at": p.joined_at,
                "user": p.user
            }
            for p in participants
        ]

    def update_participant_role(self, conversation_id: int, user_id: int, role: str) -> Optional[dict]:
        participant = self.db.query(Participant).filter(
            Participant.conversation_id == conversation_id,
            Participant.user_id == user_id
        ).first()

        if participant:
            participant.role = role
            self.db.commit()
            self.db.refresh(participant)

            user_obj = self.db.query(User).filter(User.id == user_id).first()

            return {
                "id": participant.id,
                "conversation_id": participant.conversation_id,
                "user_id": participant.user_id,
                "role": participant.role,
                "joined_at": participant.joined_at,
                "user": user_obj
            }
        return None

    def get_unread_count(self, conversation_id: int, user_id: int) -> int:
        """
        Get the number of unread messages for a user in a conversation.
        Unread messages are those created after the user's last_read_message_id.
        """
        participant = self.db.query(Participant).filter(
            Participant.conversation_id == conversation_id,
            Participant.user_id == user_id
        ).first()

        if not participant:
            return 0

        query = self.db.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id
        )
        if participant.last_read_message_id:
            query = query.filter(Message.id > participant.last_read_message_id)
        return query.count()

    def update_last_read_message(self, conversation_id: int, user_id: int, message_id: int) -> bool:
        """
        Update the last read message for a user in a conversation.
        """
        participant = self.db.query(Participant).filter(
            Participant.conversation_id == conversation_id,
            Participant.user_id == user_id
        ).first()

        if participant:
            participant.last_read_message_id = message_id
            self.db.commit()
            return True
        return False

    def find_direct_conversation(self, user_id_1: int, user_id_2: int) -> Optional[dict]:
        """
        Find a direct (non-group) conversation between two users.
        Returns None if no such conversation exists.
        """
        conversation = self.db.query(Conversation).filter(
            Conversation.is_group == False,
            Conversation.id.in_(
                self.db.query(Participant.conversation_id).filter(
                    Participant.user_id == user_id_1
                )
            ),
            Conversation.id.in_(
                self.db.query(Participant.conversation_id).filter(
                    Participant.user_id == user_id_2
                )
            )
        ).first()

        if conversation:
            return self.get_conversation(conversation.id, current_user_id=user_id_1)
        return None

    def get_user_conversations_with_unread(self, user_id: int, query: Optional[str] = None) -> List[dict]:
        """
        Get user's conversations with unread count, ordered by latest message.
        Properly resolves direct chat recipient details and includes zero-message conversations.
        """
        user_participants = self.db.query(Participant).filter(
            Participant.user_id == user_id
        ).all()

        if not user_participants:
            return []

        conv_ids = [p.conversation_id for p in user_participants]
        user_part_map = {p.conversation_id: p for p in user_participants}

        conversations = self.db.query(Conversation).filter(
            Conversation.id.in_(conv_ids)
        ).options(
            joinedload(Conversation.participants).joinedload(Participant.user)
        ).all()

        # Get latest message per conversation
        latest_msg_ids = self.db.query(
            Message.conversation_id,
            func.max(Message.id).label("max_id")
        ).filter(
            Message.conversation_id.in_(conv_ids)
        ).group_by(Message.conversation_id).all()

        latest_msg_map = {}
        if latest_msg_ids:
            msg_ids = [m[1] for m in latest_msg_ids if m[1] is not None]
            if msg_ids:
                msgs = self.db.query(Message).filter(Message.id.in_(msg_ids)).all()
                latest_msg_map = {m.conversation_id: m for m in msgs}

        # Calculate unread counts
        unread_counts = {}
        for conv_id, part in user_part_map.items():
            query_unread = self.db.query(func.count(Message.id)).filter(
                Message.conversation_id == conv_id,
                Message.sender_id != user_id
            )
            if part.last_read_message_id:
                query_unread = query_unread.filter(Message.id > part.last_read_message_id)
            unread_counts[conv_id] = query_unread.scalar() or 0

        clean_query = query.strip().lower() if query else None

        results = []
        for conv in conversations:
            name = conv.name
            avatar_url = conv.avatar_url
            is_online = False
            last_seen_at = None
            other_user = None

            if not conv.is_group:
                for p in conv.participants:
                    if p.user_id != user_id and p.user:
                        other_user = p.user
                        name = p.user.display_name or p.user.phone
                        avatar_url = p.user.avatar_url
                        is_online = bool(p.user.is_online)
                        last_seen_at = p.user.last_seen_at
                        break
                if not name:
                    name = "Direct Message"

            latest_msg = latest_msg_map.get(conv.id)
            latest_time = latest_msg.created_at if latest_msg else (conv.updated_at or conv.created_at)
            last_message_content = latest_msg.content if latest_msg else None

            # Filter if query is provided
            if clean_query:
                matches_name = name and clean_query in name.lower()
                matches_msg = last_message_content and clean_query in last_message_content.lower()
                matches_phone = other_user and other_user.phone and clean_query in other_user.phone.lower()
                matches_email = other_user and other_user.email and clean_query in other_user.email.lower()

                if not (matches_name or matches_msg or matches_phone or matches_email):
                    continue

            results.append({
                "id": conv.id,
                "name": name,
                "is_group": conv.is_group,
                "avatar_url": avatar_url,
                "created_by": conv.created_by,
                "created_at": conv.created_at,
                "updated_at": conv.updated_at,
                "latest_message_time": latest_time,
                "last_message": last_message_content,
                "is_online": is_online,
                "last_seen_at": last_seen_at,
                "unread_count": unread_counts.get(conv.id, 0)
            })

        # Sort descending by latest_message_time
        results.sort(key=lambda x: x["latest_message_time"] or datetime.min, reverse=True)
        return results

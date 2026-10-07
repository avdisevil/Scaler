from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import User, Contact, Participant, Message
from app.repositories.user_repository import UserRepository
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("Seeding database...")

        user_repo = UserRepository(db)
        conversation_service = ConversationService(db)
        message_service = MessageService(db)

        if user_repo.get_by_phone("+1234567890"):
            print("Database is already seeded with sample users.")
            return

        now = datetime.utcnow()
        users_data = [
            {
                "email": "alice@example.com",
                "phone": "+1234567890",
                "password_hash": None,
                "display_name": "Alice Johnson",
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Alice",
                "is_verified": True,
                "registration_complete": True,
                "last_seen_at": now - timedelta(minutes=2),
            },
            {
                "email": "bob@example.com",
                "phone": "+1234567891",
                "password_hash": None,
                "display_name": "Bob Smith",
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Bob",
                "is_verified": True,
                "registration_complete": True,
                "last_seen_at": now - timedelta(minutes=18),
            },
            {
                "email": "charlie@example.com",
                "phone": "+1234567892",
                "password_hash": None,
                "display_name": "Charlie Brown",
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Charlie",
                "is_verified": True,
                "registration_complete": True,
                "last_seen_at": now - timedelta(hours=3),
            },
            {
                "email": "diana@example.com",
                "phone": "+1234567893",
                "password_hash": None,
                "display_name": "Diana Prince",
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Diana",
                "is_verified": True,
                "registration_complete": True,
                "last_seen_at": now - timedelta(days=1),
            },
            {
                "email": "eve@example.com",
                "phone": "+1234567894",
                "password_hash": None,
                "display_name": "Eve Williams",
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Eve",
                "is_verified": True,
                "registration_complete": True,
                "last_seen_at": now - timedelta(days=2),
            },
        ]

        created_users = []
        for user_data in users_data:
            user = user_repo.create(user_data)
            created_users.append({
                "id": user.id,
                "email": user.email,
                "phone": user.phone,
                "display_name": user.display_name
            })
            print(f"Created user: {user.display_name}")

        contact1 = Contact(user_id=created_users[0]["id"], contact_user_id=created_users[1]["id"], display_name="Bob")
        contact2 = Contact(user_id=created_users[0]["id"], contact_user_id=created_users[2]["id"], display_name="Charlie")
        contact3 = Contact(user_id=created_users[1]["id"], contact_user_id=created_users[0]["id"], display_name="Alice")
        contact4 = Contact(user_id=created_users[1]["id"], contact_user_id=created_users[3]["id"], display_name="Diana")
        db.add_all([contact1, contact2, contact3, contact4])
        db.commit()
        print("Created contacts")

        conv1 = conversation_service.create_conversation(
            name=None,
            is_group=False,
            participant_ids=[created_users[0]["id"], created_users[1]["id"]],
            created_by=created_users[0]["id"]
        )
        print("Created conversation: Alice <-> Bob")

        conv2 = conversation_service.create_conversation(
            name=None,
            is_group=False,
            participant_ids=[created_users[0]["id"], created_users[2]["id"]],
            created_by=created_users[0]["id"]
        )
        print("Created conversation: Alice <-> Charlie")

        group_conv = conversation_service.create_conversation(
            name="Project Team",
            is_group=True,
            participant_ids=[created_users[0]["id"], created_users[1]["id"], created_users[2]["id"], created_users[3]["id"]],
            created_by=created_users[0]["id"]
        )
        print("Created group conversation: Project Team")

        def create_timed_message(conversation_id, sender_id, content, created_at, status="read"):
            msg = message_service.create_message(
                conversation_id=conversation_id,
                sender_id=sender_id,
                content=content
            )
            db_msg = db.query(Message).filter(Message.id == msg["id"]).first()
            if db_msg:
                db_msg.status = status
                db_msg.created_at = created_at
                db_msg.updated_at = created_at
                db.commit()
            return msg["id"]

        conv1_ids = [
            create_timed_message(conv1["id"], created_users[0]["id"], "Hey Bob, how are you?", now - timedelta(hours=5)),
            create_timed_message(conv1["id"], created_users[1]["id"], "I'm doing great! Just finished the project.", now - timedelta(hours=4, minutes=50)),
            create_timed_message(conv1["id"], created_users[0]["id"], "That's awesome! Can you share the details?", now - timedelta(hours=4, minutes=40)),
            create_timed_message(conv1["id"], created_users[1]["id"], "Sure, I'll send you the files tomorrow.", now - timedelta(hours=4, minutes=30)),
            create_timed_message(conv1["id"], created_users[1]["id"], "Also ping me if you need a walkthrough.", now - timedelta(minutes=12), status="delivered"),
        ]
        print(f"Created {len(conv1_ids)} messages for Alice <-> Bob")

        conv2_ids = [
            create_timed_message(conv2["id"], created_users[0]["id"], "Charlie, are you coming to the meeting?", now - timedelta(days=1, hours=2)),
            create_timed_message(conv2["id"], created_users[2]["id"], "Yes, I'll be there at 3 PM.", now - timedelta(days=1, hours=1, minutes=50)),
            create_timed_message(conv2["id"], created_users[0]["id"], "Great, see you then!", now - timedelta(days=1, hours=1, minutes=40)),
        ]
        print(f"Created {len(conv2_ids)} messages for Alice <-> Charlie")

        group_ids = [
            create_timed_message(group_conv["id"], created_users[0]["id"], "Hi everyone! Welcome to the project team.", now - timedelta(hours=8)),
            create_timed_message(group_conv["id"], created_users[1]["id"], "Thanks Alice! Excited to work with you all.", now - timedelta(hours=7, minutes=50)),
            create_timed_message(group_conv["id"], created_users[2]["id"], "Looking forward to it!", now - timedelta(hours=7, minutes=40)),
            create_timed_message(group_conv["id"], created_users[3]["id"], "Same here! Let's do great work together.", now - timedelta(hours=7, minutes=30)),
            create_timed_message(group_conv["id"], created_users[0]["id"], "I'll share the project brief in a bit.", now - timedelta(hours=6)),
            create_timed_message(group_conv["id"], created_users[1]["id"], "Perfect, that would be helpful.", now - timedelta(minutes=25), status="sent"),
        ]
        print(f"Created {len(group_ids)} messages for Project Team")

        def set_last_read(conversation_id, user_id, message_id):
            participant = db.query(Participant).filter(
                Participant.conversation_id == conversation_id,
                Participant.user_id == user_id
            ).first()
            if participant:
                participant.last_read_message_id = message_id

        # Alice has read older Bob messages but not Bob's latest ping
        set_last_read(conv1["id"], created_users[0]["id"], conv1_ids[-2])
        set_last_read(conv1["id"], created_users[1]["id"], conv1_ids[-1])
        set_last_read(conv2["id"], created_users[0]["id"], conv2_ids[-1])
        set_last_read(conv2["id"], created_users[2]["id"], conv2_ids[-1])
        set_last_read(group_conv["id"], created_users[0]["id"], group_ids[-2])
        set_last_read(group_conv["id"], created_users[1]["id"], group_ids[-1])
        set_last_read(group_conv["id"], created_users[2]["id"], group_ids[-2])
        db.commit()
        print("Updated participant read status")

        print("\nDatabase seeded successfully!")
        print("\nSample users (OTP is always 123456):")
        for user in created_users:
            print(f"  - {user['display_name']} ({user['phone']})")
        print("\nSample conversations:")
        print(f"  - Alice <-> Bob (ID: {conv1['id']})")
        print(f"  - Alice <-> Charlie (ID: {conv2['id']})")
        print(f"  - Project Team (ID: {group_conv['id']})")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

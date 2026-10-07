import pytest
from sqlalchemy.orm import Session
from app.models import User, Message, Participant
from app.services.auth_service import AuthService
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from tests.conftest import client, TestingSessionLocal


def create_authenticated_user(phone: str, display_name: str, email: str = None) -> tuple[dict, str]:
    """Helper to register and authenticate a user."""
    db = TestingSessionLocal()
    auth_service = AuthService(db)
    user = User(
        phone=phone,
        display_name=display_name,
        email=email,
        is_verified=True,
        registration_complete=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth_service.create_access_token({"user_id": user.id})
    user_data = {
        "id": user.id,
        "phone": user.phone,
        "display_name": user.display_name
    }
    db.close()
    return user_data, token


def test_message_persistence_and_retrieval():
    """Test that messages are persisted and can be retrieved."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Create conversation
    conv_resp = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = conv_resp.json()["id"]

    # Send message
    msg_resp = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "Hello Bob!", "message_type": "text"},
        headers=headers1
    )
    assert msg_resp.status_code == 200
    msg_data = msg_resp.json()
    assert msg_data["content"] == "Hello Bob!"
    assert msg_data["sender_id"] == u1["id"]
    assert msg_data["status"] == "sent"

    # Retrieve messages
    get_resp = client.get(f"/api/conversations/{conv_id}/messages", headers=headers1)
    assert get_resp.status_code == 200
    messages = get_resp.json()
    assert len(messages) == 1
    assert messages[0]["content"] == "Hello Bob!"


def test_empty_message_validation():
    """Test that empty messages are rejected."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Create conversation
    conv_resp = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = conv_resp.json()["id"]

    # Try empty message
    empty_resp = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "", "message_type": "text"},
        headers=headers1
    )
    assert empty_resp.status_code == 400
    assert "cannot be empty" in empty_resp.json()["detail"]

    # Try whitespace-only message
    ws_resp = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "   ", "message_type": "text"},
        headers=headers1
    )
    assert ws_resp.status_code == 400


def test_unauthorized_message_access():
    """Test that non-participants cannot access messages."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")
    u3, token3 = create_authenticated_user("+1333333333", "Eve")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers3 = {"Authorization": f"Bearer {token3}"}

    # Alice creates conversation with Bob
    conv_resp = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = conv_resp.json()["id"]

    # Eve tries to get messages -> 403
    eve_resp = client.get(f"/api/conversations/{conv_id}/messages", headers=headers3)
    assert eve_resp.status_code == 403
    assert "not a participant" in eve_resp.json()["detail"]

    # Eve tries to send message -> 403
    eve_send = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "Hello!", "message_type": "text"},
        headers=headers3
    )
    assert eve_send.status_code == 403


def test_group_membership_validation():
    """Test group membership and admin controls."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")
    u3, token3 = create_authenticated_user("+1333333333", "Charlie")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    headers3 = {"Authorization": f"Bearer {token3}"}

    # Alice creates group with Bob
    group_resp = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "Project Team", "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = group_resp.json()["id"]

    # Verify Alice is admin
    parts_resp = client.get(f"/api/conversations/{conv_id}/participants", headers=headers1)
    assert parts_resp.status_code == 200
    participants = parts_resp.json()
    alice_part = next(p for p in participants if p["user_id"] == u1["id"])
    assert alice_part["role"] == "admin"

    # Bob (member) tries to add Charlie -> 403
    bob_add = client.post(
        f"/api/conversations/{conv_id}/participants",
        json={"user_id": u3["id"]},
        headers=headers2
    )
    assert bob_add.status_code == 403
    assert "Only admins" in bob_add.json()["detail"]

    # Alice (admin) adds Charlie -> 200
    alice_add = client.post(
        f"/api/conversations/{conv_id}/participants",
        json={"user_id": u3["id"]},
        headers=headers1
    )
    assert alice_add.status_code == 200

    # Bob tries to remove Charlie -> 403
    bob_remove = client.delete(f"/api/conversations/{conv_id}/participants/{u3['id']}", headers=headers2)
    assert bob_remove.status_code == 403

    # Alice removes Charlie -> 200
    alice_remove = client.delete(f"/api/conversations/{conv_id}/participants/{u3['id']}", headers=headers1)
    assert alice_remove.status_code == 200


def test_prevent_removing_last_admin():
    """Test that the last admin cannot be removed from a group."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Alice creates group with Bob
    group_resp = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "Project Team", "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = group_resp.json()["id"]

    # Alice tries to remove herself (last admin) -> 400
    remove_self = client.delete(f"/api/conversations/{conv_id}/participants/{u1['id']}", headers=headers1)
    assert remove_self.status_code == 400
    assert "Cannot remove the last admin" in remove_self.json()["detail"]


def test_group_messaging_to_all_members():
    """Test that group messages are accessible to all members."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")
    u3, token3 = create_authenticated_user("+1333333333", "Charlie")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    headers3 = {"Authorization": f"Bearer {token3}"}

    # Alice creates group with Bob and Charlie
    group_resp = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "Project Team", "participant_ids": [u2["id"], u3["id"]]},
        headers=headers1
    )
    conv_id = group_resp.json()["id"]

    # Alice sends message
    msg_resp = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "Team meeting at 3pm", "message_type": "text"},
        headers=headers1
    )
    assert msg_resp.status_code == 200

    # Bob can retrieve messages
    bob_msgs = client.get(f"/api/conversations/{conv_id}/messages", headers=headers2)
    assert bob_msgs.status_code == 200
    assert len(bob_msgs.json()) == 1

    # Charlie can retrieve messages
    charlie_msgs = client.get(f"/api/conversations/{conv_id}/messages", headers=headers3)
    assert charlie_msgs.status_code == 200
    assert len(charlie_msgs.json()) == 1


def test_duplicate_group_member_prevention():
    """Test that adding a duplicate group member is prevented."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Alice creates group with Bob
    group_resp = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "Project Team", "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = group_resp.json()["id"]

    # Try to add Bob again -> should fail (duplicate)
    dup_add = client.post(
        f"/api/conversations/{conv_id}/participants",
        json={"user_id": u2["id"]},
        headers=headers1
    )
    # Should return 400 with duplicate error message
    assert dup_add.status_code == 400
    assert "already a participant" in dup_add.json()["detail"]


def test_invalid_conversation_id():
    """Test accessing nonexistent conversation."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Try to get nonexistent conversation
    get_resp = client.get("/api/conversations/99999", headers=headers1)
    assert get_resp.status_code == 404

    # Try to send message to nonexistent conversation
    msg_resp = client.post(
        "/api/conversations/99999/messages",
        json={"content": "Hello", "message_type": "text"},
        headers=headers1
    )
    assert msg_resp.status_code == 403  # Not a participant (conversation doesn't exist)


def test_invalid_user_id_in_operations():
    """Test operations with invalid user IDs."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Try to add nonexistent user as contact
    add_resp = client.post(
        "/api/users/contacts",
        json={"contact_user_id": 99999},
        headers=headers1
    )
    assert add_resp.status_code == 404  # User not found

    # Try to create conversation with nonexistent user
    conv_resp = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [99999]},
        headers=headers1
    )
    # Should return 404 now that we validate user existence
    assert conv_resp.status_code == 404  # User not found


def test_non_admin_cannot_change_roles():
    """Test that non-admin members cannot promote themselves."""
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}

    group_resp = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "Project Team", "participant_ids": [u2["id"]]},
        headers=headers1
    )
    conv_id = group_resp.json()["id"]

    bob_promote = client.put(
        f"/api/conversations/{conv_id}/participants/{u2['id']}/role",
        json={"role": "admin"},
        headers=headers2
    )
    assert bob_promote.status_code == 403

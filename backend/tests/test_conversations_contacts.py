import pytest
from sqlalchemy.orm import Session
from app.models import User
from app.services.auth_service import AuthService
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


def test_user_search():
    u1, token1 = create_authenticated_user("+1111111111", "Alice Smith", "alice@example.com")
    u2, _ = create_authenticated_user("+1222222222", "Bob Jones", "bob@example.com")
    u3, _ = create_authenticated_user("+1333333333", "Charlie Brown", "charlie@example.com")

    headers = {"Authorization": f"Bearer {token1}"}
    response = client.get("/api/users/search?q=Bob", headers=headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["display_name"] == "Bob Jones"

    # Ensure search does not return the querying user himself
    response_self = client.get("/api/users/search?q=Alice", headers=headers)
    assert response_self.status_code == 200
    assert len(response_self.json()) == 0


def test_add_contact_and_duplicates():
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers = {"Authorization": f"Bearer {token1}"}

    # Cannot add self
    resp_self = client.post("/api/users/contacts", json={"contact_user_id": u1["id"]}, headers=headers)
    assert resp_self.status_code == 400
    assert "Cannot add yourself" in resp_self.json()["detail"]

    # Add Bob as contact
    resp_add = client.post(
        "/api/users/contacts",
        json={"contact_user_id": u2["id"], "display_name": "Bobby"},
        headers=headers
    )
    assert resp_add.status_code == 200
    contact_data = resp_add.json()
    assert contact_data["contact_user_id"] == u2["id"]
    assert contact_data["display_name"] == "Bobby"
    assert contact_data["contact_user"]["phone"] == "+1222222222"

    # Adding duplicate contact should fail
    resp_dup = client.post(
        "/api/users/contacts",
        json={"contact_user_id": u2["id"]},
        headers=headers
    )
    assert resp_dup.status_code == 400
    assert "Contact already exists" in resp_dup.json()["detail"]


def test_get_and_delete_contact():
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")
    u3, token3 = create_authenticated_user("+1333333333", "Charlie")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers3 = {"Authorization": f"Bearer {token3}"}

    # Add Bob as contact for Alice
    add_resp = client.post(
        "/api/users/contacts",
        json={"contact_user_id": u2["id"], "display_name": "My Friend Bob"},
        headers=headers1
    )
    assert add_resp.status_code == 200
    contact_id = add_resp.json()["id"]

    # List contacts
    list_resp = client.get("/api/users/contacts", headers=headers1)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # Search contacts
    search_resp = client.get("/api/users/contacts?q=Friend", headers=headers1)
    assert search_resp.status_code == 200
    assert len(search_resp.json()) == 1

    search_nomatch = client.get("/api/users/contacts?q=David", headers=headers1)
    assert len(search_nomatch.json()) == 0

    # Charlie tries to delete Alice's contact -> 404
    del_unauth = client.delete(f"/api/users/contacts/{contact_id}", headers=headers3)
    assert del_unauth.status_code == 404

    # Alice deletes her own contact -> 200
    del_ok = client.delete(f"/api/users/contacts/{contact_id}", headers=headers1)
    assert del_ok.status_code == 200

    # Contact is gone
    list_after = client.get("/api/users/contacts", headers=headers1)
    assert len(list_after.json()) == 0


def test_create_direct_conversation_and_deduplication():
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Cannot create direct conversation with self
    resp_self = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [u1["id"]]},
        headers=headers1
    )
    assert resp_self.status_code == 400

    # Create direct conversation between Alice and Bob
    resp_create = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [u2["id"]]},
        headers=headers1
    )
    assert resp_create.status_code == 200
    conv1 = resp_create.json()
    assert conv1["is_group"] is False
    assert conv1["name"] == "Bob"
    conv_id = conv1["id"]

    # Trying to create another direct conversation with Bob must return existing conv_id
    resp_dup = client.post(
        "/api/conversations",
        json={"is_group": False, "participant_ids": [u2["id"]]},
        headers=headers1
    )
    assert resp_dup.status_code == 200
    assert resp_dup.json()["id"] == conv_id


def test_conversation_list_and_search():
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")
    u3, token3 = create_authenticated_user("+1333333333", "Charlie")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Alice creates conversation with Bob
    client.post("/api/conversations", json={"is_group": False, "participant_ids": [u2["id"]]}, headers=headers1)

    # Alice creates conversation with Charlie
    client.post("/api/conversations", json={"is_group": False, "participant_ids": [u3["id"]]}, headers=headers1)

    # List conversations - both 0-message conversations should appear!
    list_resp = client.get("/api/conversations", headers=headers1)
    assert list_resp.status_code == 200
    convs = list_resp.json()
    assert len(convs) == 2

    # Query search
    search_bob = client.get("/api/conversations?q=Bob", headers=headers1)
    assert search_bob.status_code == 200
    assert len(search_bob.json()) == 1
    assert search_bob.json()[0]["name"] == "Bob"


def test_conversation_authorization():
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")
    u3, token3 = create_authenticated_user("+1333333333", "Eve")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers3 = {"Authorization": f"Bearer {token3}"}

    # Alice creates conversation with Bob
    create_resp = client.post("/api/conversations", json={"is_group": False, "participant_ids": [u2["id"]]}, headers=headers1)
    conv_id = create_resp.json()["id"]

    # Eve (u3) tries to get the conversation -> 403 Forbidden
    eve_resp = client.get(f"/api/conversations/{conv_id}", headers=headers3)
    assert eve_resp.status_code == 403
    assert "not a participant" in eve_resp.json()["detail"]


def test_create_group_conversation():
    u1, token1 = create_authenticated_user("+1111111111", "Alice")
    u2, token2 = create_authenticated_user("+1222222222", "Bob")

    headers1 = {"Authorization": f"Bearer {token1}"}

    # Group without name fails
    bad_group = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "", "participant_ids": [u2["id"]]},
        headers=headers1
    )
    assert bad_group.status_code == 400

    # Valid group
    ok_group = client.post(
        "/api/conversations",
        json={"is_group": True, "name": "Secret Project", "participant_ids": [u2["id"]]},
        headers=headers1
    )
    assert ok_group.status_code == 200
    data = ok_group.json()
    assert data["is_group"] is True
    assert data["name"] == "Secret Project"

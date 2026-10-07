from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from app.database import get_db
from app.schemas.conversation import ConversationCreate, ConversationResponse, ConversationUpdate
from app.schemas.participant import ParticipantCreate, ParticipantResponse, ParticipantRoleUpdate
from app.services.conversation_service import ConversationService
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=List[ConversationResponse])
def get_conversations(
    q: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)
    conversations = conversation_service.get_user_conversations(current_user["user_id"], query=q)
    return conversations


@router.post("", response_model=ConversationResponse)
def create_conversation(
    conversation_data: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    # Ensure current user is included in participants
    if current_user["user_id"] not in conversation_data.participant_ids:
        conversation_data.participant_ids.append(current_user["user_id"])

    # If it is a direct conversation (not a group)
    if not conversation_data.is_group:
        other_ids = [pid for pid in conversation_data.participant_ids if pid != current_user["user_id"]]
        if not other_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create a direct conversation with yourself"
            )
        other_user_id = other_ids[0]

        # Check if direct conversation already exists
        existing = conversation_service.find_direct_conversation(current_user["user_id"], other_user_id)
        if existing:
            return existing

        # Create new direct conversation
        try:
            conversation = conversation_service.create_conversation(
                name=None,
                is_group=False,
                participant_ids=[current_user["user_id"], other_user_id],
                created_by=current_user["user_id"]
            )
            return conversation
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )

    # Group conversation creation
    if not conversation_data.name or not conversation_data.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group conversation must have a name"
        )

    try:
        conversation = conversation_service.create_conversation(
            name=conversation_data.name.strip(),
            is_group=True,
            participant_ids=conversation_data.participant_ids,
            created_by=current_user["user_id"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    return conversation


@router.get("/{id}", response_model=ConversationResponse)
def get_conversation(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)
    existing = conversation_service.get_conversation_by_id(id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    return conversation_service.get_conversation(id, current_user_id=current_user["user_id"])


@router.put("/{id}", response_model=ConversationResponse)
def update_conversation(
    id: int,
    update_data: ConversationUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    conversation_obj = conversation_service.get_conversation_by_id(id)
    if conversation_obj and conversation_obj.is_group:
        participant = conversation_service.get_participant(id, current_user["user_id"])
        if not participant or participant.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update group conversations"
            )

    update_dict = update_data.model_dump(exclude_unset=True)
    conversation = conversation_service.update_conversation(id, update_dict)

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


@router.delete("/{id}")
def delete_conversation(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    success = conversation_service.conversation_repo.delete(id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return {"success": True}


@router.get("/{id}/participants", response_model=List[ParticipantResponse])
def get_participants(
    id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    participants = conversation_service.get_participants(id)
    return participants


@router.post("/{id}/participants", response_model=ParticipantResponse)
def add_participant(
    id: int,
    participant_data: ParticipantCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    # Check if user is a participant
    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    # Check if user is admin (for group chats)
    conversation = conversation_service.get_conversation_by_id(id)
    if conversation and conversation.is_group:
        participant = conversation_service.get_participant(id, current_user["user_id"])
        if not participant or participant.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can add members to group conversations"
            )

    try:
        new_participant = conversation_service.add_participant(
            id,
            participant_data.user_id,
            "member"
        )
        return new_participant
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a participant in this conversation"
        )


@router.delete("/{id}/participants/{user_id}")
def remove_participant(
    id: int,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    # Check if user is a participant
    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    # Check if user is admin (for group chats)
    conversation = conversation_service.get_conversation_by_id(id)
    if conversation and conversation.is_group:
        participant = conversation_service.get_participant(id, current_user["user_id"])
        if not participant or participant.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can remove members from group conversations"
            )

    # Prevent removing the last admin
    target_participant = conversation_service.get_participant(id, user_id)
    if target_participant and target_participant.get("role") == "admin":
        admin_count = len([p for p in conversation_service.get_participants(id) if p.get("role") == "admin"])
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin from the group"
            )

    success = conversation_service.remove_participant(id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )

    return {"success": True}


@router.put("/{id}/participants/{user_id}/role", response_model=ParticipantResponse)
def update_participant_role(
    id: int,
    user_id: int,
    role_data: ParticipantRoleUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    conversation = conversation_service.get_conversation_by_id(id)
    if conversation and conversation.is_group:
        actor = conversation_service.get_participant(id, current_user["user_id"])
        if not actor or actor.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can update participant roles"
            )

    participant = conversation_service.update_participant_role(id, user_id, role_data.role)

    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )

    return participant

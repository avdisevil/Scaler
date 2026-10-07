from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.message import MessageCreate, MessageResponse, MessageStatusUpdate
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["messages"])


@router.get("/{id}/messages", response_model=List[MessageResponse])
def get_messages(
    id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    before_id: int = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    # Verify conversation membership
    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    message_service = MessageService(db)
    messages = message_service.get_conversation_messages(id, limit, offset, before_id)
    return messages


@router.post("/{id}/messages", response_model=MessageResponse)
def create_message(
    id: int,
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversation_service = ConversationService(db)

    # Verify conversation membership
    if not conversation_service.is_participant(id, current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    # Validate content
    if not message_data.content or not message_data.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty"
        )

    message_service = MessageService(db)
    message = message_service.create_message(
        conversation_id=id,
        sender_id=current_user["user_id"],
        content=message_data.content.strip(),
        message_type=message_data.message_type,
        reply_to_id=message_data.reply_to_id
    )

    # Update status to sent after persistence
    message_service.update_message_status(message["id"], "sent")

    return message_service.get_message(message["id"])


@router.put("/messages/{message_id}/status", response_model=MessageResponse)
def update_message_status(
    message_id: int,
    status_data: MessageStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message_service = MessageService(db)
    existing = message_service.get_message(message_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    conversation_service = ConversationService(db)
    if not conversation_service.is_participant(existing["conversation_id"], current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    message = message_service.update_message_status(message_id, status_data.status)
    return message


@router.post("/messages/{message_id}/receipt")
def create_message_receipt(
    message_id: int,
    status_data: MessageStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message_service = MessageService(db)
    existing = message_service.get_message(message_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    conversation_service = ConversationService(db)
    if not conversation_service.is_participant(existing["conversation_id"], current_user["user_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this conversation"
        )

    receipt = message_service.add_message_receipt(
        message_id,
        current_user["user_id"],
        status_data.status
    )
    return receipt

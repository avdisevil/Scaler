from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    reply_to_id: Optional[int] = None


class MessageStatusUpdate(BaseModel):
    status: str


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    message_type: str
    reply_to_id: Optional[int] = None
    status: str
    reaction: Optional[str] = None
    disappears_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

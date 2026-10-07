from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ConversationCreate(BaseModel):
    name: Optional[str] = None
    is_group: bool = False
    participant_ids: List[int]


class ConversationUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class ConversationResponse(BaseModel):
    id: int
    name: Optional[str] = None
    is_group: bool
    avatar_url: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    latest_message_time: Optional[datetime] = None
    unread_count: int = 0
    last_message: Optional[str] = None
    is_online: Optional[bool] = None
    last_seen_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse


class ParticipantCreate(BaseModel):
    user_id: int


class ParticipantRoleUpdate(BaseModel):
    role: str


class ParticipantResponse(BaseModel):
    id: int
    conversation_id: int
    user_id: int
    role: str
    joined_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

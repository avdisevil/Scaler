from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.user import UserResponse


class ContactCreate(BaseModel):
    contact_user_id: int
    display_name: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    user_id: int
    contact_user_id: int
    display_name: Optional[str] = None
    created_at: datetime
    contact_user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

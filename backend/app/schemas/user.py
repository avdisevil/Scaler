from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: Optional[str] = None
    phone: str
    display_name: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    phone: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool
    is_online: bool
    registration_complete: bool = False
    last_seen_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

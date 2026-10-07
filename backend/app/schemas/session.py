from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SessionCreate(BaseModel):
    session_id: str
    user_id: int
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    expires_at: datetime


class SessionResponse(BaseModel):
    id: int
    session_id: str
    user_id: int
    device_info: Optional[str] = None
    ip_address: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    last_used_at: datetime

    class Config:
        from_attributes = True

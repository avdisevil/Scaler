from pydantic import BaseModel
from typing import Optional


class OTPRequest(BaseModel):
    """
    Request to initiate OTP for login or registration.
    Used for both new users (registration) and existing users (login).
    """
    phone: str


class OTPVerifyRequest(BaseModel):
    """
    Request to verify OTP code.
    """
    phone: str
    otp_code: str


class ProfileSetupRequest(BaseModel):
    """
    Request to complete profile setup after OTP verification.
    """
    user_id: int
    display_name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """
    Request to refresh access token.
    """
    refresh_token: str


class TokenResponse(BaseModel):
    """
    Response with authentication tokens and user info.
    """
    access_token: str
    refresh_token: str
    user_id: int
    requires_profile_setup: bool = False

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import OTPRequest, OTPVerifyRequest, ProfileSetupRequest, RefreshTokenRequest, TokenResponse
from app.services.auth_service import AuthService
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-otp")
def request_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """
    Request OTP for login or registration.
    Returns whether user exists and if profile setup is required.
    """
    auth_service = AuthService(db)

    # Validate phone format
    if not request.phone or len(request.phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid phone number format"
        )

    result = auth_service.initiate_otp(request.phone)

    # In development, return the OTP for testing
    # In production, this would be sent via SMS
    return {
        "success": True,
        "exists": result["exists"],
        "user_id": result.get("user_id"),
        "phone": result["phone"],
        "requires_profile_setup": result.get("requires_profile_setup", False),
        "otp": "123456"  # Only for development
    }


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Verify OTP code and create authenticated session.
    Returns access token, refresh token, and user info.
    """
    auth_service = AuthService(db)
    result = auth_service.verify_otp_and_create_session(request.phone, request.otp_code)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code"
        )

    return TokenResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user_id=result["user_id"],
        requires_profile_setup=result["requires_profile_setup"]
    )


@router.post("/complete-profile")
def complete_profile(request: ProfileSetupRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Complete user profile setup after OTP verification.
    """
    auth_service = AuthService(db)

    # Validate that the user matches the current authenticated user
    if current_user["user_id"] != request.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update another user's profile"
        )

    # Validate display name
    if not request.display_name or len(request.display_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name must be at least 2 characters"
        )

    result = auth_service.complete_profile_setup(
        request.user_id,
        request.display_name,
        request.email,
        request.avatar_url
    )

    if result and "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "success": True,
        "user": result
    }


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logout user by invalidating all sessions.
    """
    auth_service = AuthService(db)
    auth_service.logout(current_user["user_id"])
    return {"success": True}


@router.post("/refresh")
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.
    """
    auth_service = AuthService(db)

    # Verify refresh token
    payload = auth_service.verify_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = int(payload.get("sub"))

    # Check if session exists and is valid
    from app.repositories.session_repository import SessionRepository
    session_repo = SessionRepository(db)
    sessions = session_repo.get_user_sessions(user_id)

    if not sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )

    # Generate new access token
    access_token = auth_service.create_access_token({"user_id": user_id})

    return {
        "access_token": access_token,
        "user_id": user_id
    }

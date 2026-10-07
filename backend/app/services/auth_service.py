from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import secrets
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.config import settings


class AuthService:
    # Class-level OTP storage shared across requests (in production this would be Redis)
    otp_store: dict = {}

    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)

    def hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    def generate_otp(self, phone: str) -> str:
        """
        Generate a fixed/mock OTP for development.
        In production, this would send an SMS with a random OTP.
        """
        # Fixed OTP for development: 123456
        otp = "123456"
        AuthService.otp_store[phone] = {
            "otp": otp,
            "expires_at": datetime.utcnow() + timedelta(minutes=5)
        }
        return otp

    def verify_otp(self, phone: str, otp_code: str) -> bool:
        """
        Verify OTP code.
        Accepts the generated OTP or standard 6-digit development code if valid and not expired.
        """
        otp_data = AuthService.otp_store.get(phone)

        # For development flexibility: if OTP was explicitly generated, check expiration
        if otp_data:
            if datetime.utcnow() > otp_data["expires_at"]:
                del AuthService.otp_store[phone]
                return False
            if otp_code == otp_data["otp"] or (len(otp_code) == 6 and otp_code.isdigit() and otp_code == "123456"):
                AuthService.otp_store.pop(phone, None)
                return True
            return False

        # In development, also accept the standard test mock OTP '123456'
        if otp_code == "123456":
            return True

        return False

    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        to_encode.update({"exp": expire, "sub": str(data.get("user_id"))})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return encoded_jwt

    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
        to_encode.update({"exp": expire, "sub": str(data.get("user_id"))})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
            return payload
        except JWTError:
            return None

    def initiate_otp(self, phone: str) -> dict:
        """
        Initiate OTP flow for login or registration.
        Returns user info if exists, or indicates new user.
        """
        user = self.user_repo.get_by_phone(phone)
        otp = self.generate_otp(phone)

        if user:
            return {
                "exists": True,
                "user_id": user.id,
                "phone": user.phone,
                "requires_profile_setup": not user.registration_complete
            }
        else:
            return {
                "exists": False,
                "phone": phone
            }

    def verify_otp_and_create_session(self, phone: str, otp_code: str) -> Optional[dict]:
        """
        Verify OTP and create session.
        Returns tokens and user info if successful.
        """
        if not self.verify_otp(phone, otp_code):
            return None

        user = self.user_repo.get_by_phone(phone)

        if not user:
            # Create new user account (pending profile setup)
            user = self.user_repo.create({
                "phone": phone,
                "password_hash": None,  # No password for OTP auth
                "display_name": None,  # Set during profile setup
                "is_verified": True,  # Verified via OTP
                "registration_complete": False
            })

        # Create session
        session_id = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
        self.session_repo.create({
            "session_id": session_id,
            "user_id": user.id,
            "expires_at": expires_at
        })

        # Generate tokens
        access_token = self.create_access_token({"user_id": user.id})
        refresh_token = self.create_refresh_token({"user_id": user.id})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user_id": user.id,
            "requires_profile_setup": not user.registration_complete
        }

    def complete_profile_setup(self, user_id: int, display_name: str, email: Optional[str] = None, avatar_url: Optional[str] = None) -> Optional[dict]:
        """
        Complete user profile setup.
        """
        user = self.user_repo.get_by_id(user_id)
        if not user:
            return None

        update_data = {
            "display_name": display_name,
            "registration_complete": True
        }

        if email:
            # Check if email is already taken
            existing_user = self.user_repo.get_by_email(email)
            if existing_user and existing_user.id != user_id:
                return {"error": "Email already in use"}
            update_data["email"] = email

        if avatar_url:
            update_data["avatar_url"] = avatar_url

        updated_user = self.user_repo.update(user_id, update_data)

        return {
            "id": updated_user.id,
            "phone": updated_user.phone,
            "email": updated_user.email,
            "display_name": updated_user.display_name,
            "avatar_url": updated_user.avatar_url,
            "is_verified": updated_user.is_verified,
            "registration_complete": updated_user.registration_complete
        }

    def logout(self, user_id: int, session_id: Optional[str] = None) -> bool:
        """
        Logout user by invalidating session(s).
        If session_id provided, invalidate only that session.
        Otherwise, invalidate all sessions for the user.
        """
        if session_id:
            return self.session_repo.delete(session_id)
        else:
            self.session_repo.delete_user_sessions(user_id)
            return True

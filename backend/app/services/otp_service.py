from typing import Optional
import random


class OTPService:
    def __init__(self):
        self.otp_store = {}

    def generate_otp(self, phone: str) -> str:
        otp = str(random.randint(100000, 999999))
        self.otp_store[phone] = otp
        return otp

    def verify_otp(self, phone: str, otp_code: str) -> bool:
        stored_otp = self.otp_store.get(phone)
        if stored_otp and stored_otp == otp_code:
            del self.otp_store[phone]
            return True
        return False

    def mock_verify(self, phone: str, otp_code: str) -> bool:
        return len(otp_code) == 6 and otp_code.isdigit()

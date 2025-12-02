import qrcode
from io import BytesIO
from datetime import datetime, timedelta
from jose import jwt
from ..utils.auth import SECRET_KEY, ALGORITHM

class QRGenerator:
    @staticmethod
    def generate_session_token(session_id: int, expires_hours: int = 24) -> str:
        """Generate JWT token for QR code check-in"""
        expiry = datetime.utcnow() + timedelta(hours=expires_hours)
        payload = {
            "session_id": session_id,
            "exp": expiry,
            "type": "qr_checkin"
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        return token
    
    @staticmethod
    def validate_session_token(token: str) -> dict:
        """Validate and decode session token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "qr_checkin":
                return None
            return payload
        except:
            return None
    
    @staticmethod
    def generate_qr_code(session_id: int, base_url: str = "http://localhost:5173") -> bytes:
        """Generate QR code image for session check-in"""
        token = QRGenerator.generate_session_token(session_id)
        url = f"{base_url}/checkin?token={token}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return buffer.getvalue()

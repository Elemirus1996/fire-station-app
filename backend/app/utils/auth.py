from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os
from ..database import get_db
from ..models import AdminUser, PersonnelAdmin, Personnel

# Load from environment variables with defaults
SECRET_KEY = os.getenv("SECRET_KEY", "feuerwehr-secret-key-2025-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current user - supports both AdminUser and PersonnelAdmin"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger Token"
        )
    
    # Check token type
    token_type = payload.get("type", "admin")
    username: str = payload.get("sub")
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger Token"
        )
    
    if token_type == "personnel_admin":
        # Personnel admin login
        personnel_id = payload.get("personnel_id")
        if not personnel_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ungültiger Token"
            )
        
        personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
        if not personnel:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Personal nicht gefunden"
            )
        
        admin = db.query(PersonnelAdmin).filter(
            PersonnelAdmin.personnel_id == personnel_id,
            PersonnelAdmin.is_active == True
        ).first()
        
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Kein Admin-Zugriff"
            )
        
        # Return AdminUser-like object for compatibility
        class PersonnelAdminUser:
            def __init__(self, personnel, admin):
                self.id = admin.id
                self.username = personnel.stammrollennummer
                self.role = admin.role
                self.is_personnel = True
                self.personnel_id = personnel.id
                self.personnel = personnel
        
        return PersonnelAdminUser(personnel, admin)
    
    else:
        # Standard admin login
        user = db.query(AdminUser).filter(AdminUser.username == username).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Benutzer nicht gefunden"
            )
        
        # Add flag for compatibility
        user.is_personnel = False
        return user

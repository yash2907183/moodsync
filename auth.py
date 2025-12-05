"""
Authentication API endpoints
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.models import get_db
from app.models.database import User
from app.models.schemas import Token, TokenData, UserResponse
from app.services.spotify import get_spotify_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create JWT access token.
    
    Args:
        data: Data to encode in token
        expires_delta: Token expiration time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        token: JWT access token
        db: Database session
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.user_id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return user


@router.get("/login")
async def login():
    """
    Initiate Spotify OAuth flow.
    
    Returns:
        Redirect to Spotify authorization URL
    """
    try:
        spotify_service = get_spotify_service()
        auth_manager = spotify_service.get_oauth_manager()
        auth_url = auth_manager.get_authorize_url()
        return {"auth_url": auth_url}
    except Exception as e:
        logger.error(f"Error initiating login: {e}")
        raise HTTPException(status_code=500, detail="Error initiating authentication")


@router.get("/callback")
async def callback(code: str, db: Session = Depends(get_db)):
    """
    Handle Spotify OAuth callback.
    
    Args:
        code: Authorization code from Spotify
        db: Database session
        
    Returns:
        JWT access token and user info
    """
    try:
        spotify_service = get_spotify_service()
        auth_manager = spotify_service.get_oauth_manager()
        
        # Exchange code for access token
        token_info = auth_manager.get_access_token(code)
        access_token = token_info["access_token"]
        
        # Get user profile from Spotify
        profile = spotify_service.get_user_profile(access_token)
        
        # Check if user exists
        user = db.query(User).filter(User.spotify_id == profile["spotify_id"]).first()
        
        if not user:
            # Create new user
            user = User(
                user_id=f"user_{profile['spotify_id']}",
                spotify_id=profile["spotify_id"],
                email=profile.get("email"),
                consent_version="1.0",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user: {user.user_id}")
        else:
            # Update last sync
            user.last_sync = datetime.utcnow()
            db.commit()
            logger.info(f"User logged in: {user.user_id}")
        
        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = create_access_token(
            data={"sub": user.user_id, "spotify_id": user.spotify_id},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": UserResponse.from_orm(user),
            "spotify_access_token": access_token  # For API calls
        }
        
    except Exception as e:
        logger.error(f"Error in OAuth callback: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information
    """
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout current user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message
    """
    logger.info(f"User logged out: {current_user.user_id}")
    return {"message": "Successfully logged out"}


@router.delete("/delete-account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user account and all associated data.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success message
    """
    try:
        # All related data will be deleted via cascade
        db.delete(current_user)
        db.commit()
        logger.info(f"User account deleted: {current_user.user_id}")
        return {"message": "Account successfully deleted"}
    except Exception as e:
        logger.error(f"Error deleting account: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting account")

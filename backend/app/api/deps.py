from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationException
from app.core.security import decode_access_token
from app.models.user import User
from app.repositories.user_repo import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that authenticates request via Bearer JWT."""
    if not auth or not auth.credentials:
        raise AuthenticationException("Authentication required. Please provide a valid Bearer token.")

    payload = decode_access_token(auth.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise AuthenticationException("Invalid token payload: missing subject identifier.")

    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise AuthenticationException("User associated with this token does not exist.")

    if not user.is_active:
        raise AuthenticationException("User account is inactive.")

    return user


async def get_optional_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Dependency for routes that permit both public and authenticated access."""
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_access_token(auth.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user_repo = UserRepository(session)
        return await user_repo.get_by_id(user_id)
    except Exception:
        return None

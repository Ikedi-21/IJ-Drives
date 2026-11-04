from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import StandardResponse
from app.schemas.user import TokenResponse, UserLoginRequest, UserProfileResponse, UserRegisterRequest
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=StandardResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegisterRequest, session: AsyncSession = Depends(get_db)):
    """Registers a new user, provisions their ₦500 bonus wallet, and issues an access token."""
    service = AuthService(session)
    result = await service.register(payload)
    return StandardResponse.ok(result)


@router.post("/login", response_model=StandardResponse[TokenResponse])
async def login(payload: UserLoginRequest, session: AsyncSession = Depends(get_db)):
    """Authenticates user credentials and returns a signed JWT access token."""
    service = AuthService(session)
    result = await service.login(payload)
    return StandardResponse.ok(result)


@router.get("/me", response_model=StandardResponse[UserProfileResponse])
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Returns the authenticated user's profile and live wallet balance."""
    service = AuthService(session)
    result = await service.get_profile(current_user.id)
    return StandardResponse.ok(result)

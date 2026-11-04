import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationException, DuplicateResourceException
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction
from app.repositories.user_repo import UserRepository
from app.schemas.user import TokenResponse, UserLoginRequest, UserProfileResponse, UserRegisterRequest


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)

    async def register(self, payload: UserRegisterRequest) -> TokenResponse:
        email = payload.email.strip().lower()
        if await self.user_repo.email_exists(email):
            raise DuplicateResourceException("User", "email", email)

        # 1. Create User
        user = User(
            email=email,
            full_name=payload.full_name.strip(),
            hashed_password=get_password_hash(payload.password),
            role="rider",
        )
        self.session.add(user)
        await self.session.flush()

        # 2. Initialize Wallet with Welcome Bonus
        welcome_bonus = settings.WELCOME_BONUS_NGN
        wallet = Wallet(
            user_id=user.id,
            balance_ngn=welcome_bonus,
            currency=settings.CURRENCY_CODE,
        )
        self.session.add(wallet)
        await self.session.flush()

        # 3. Create initial Welcome Bonus transaction
        tx = WalletTransaction(
            wallet_id=wallet.id,
            type="credit",
            amount_ngn=welcome_bonus,
            balance_after=welcome_bonus,
            category="welcome_bonus",
            reference=f"TXN-{uuid.uuid4().hex[:10].upper()}",
            description="Welcome Bonus",
        )
        self.session.add(tx)
        await self.session.commit()

        # 4. Issue JWT Token
        token = create_access_token(
            subject=user.id,
            claims={"email": user.email, "role": user.role},
        )

        profile = UserProfileResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            wallet_balance=wallet.balance_ngn,
            created_at=user.created_at,
        )
        return TokenResponse(access_token=token, token_type="bearer", user=profile)

    async def login(self, payload: UserLoginRequest) -> TokenResponse:
        email = payload.email.strip().lower()
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise AuthenticationException("Incorrect email or password.")

        if not user.is_active:
            raise AuthenticationException("User account is inactive. Please contact support.")

        user_with_wallet = await self.user_repo.get_with_wallet(user.id)
        balance = user_with_wallet.wallet.balance_ngn if user_with_wallet and user_with_wallet.wallet else 0.0

        token = create_access_token(
            subject=user.id,
            claims={"email": user.email, "role": user.role},
        )

        profile = UserProfileResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            wallet_balance=balance,
            created_at=user.created_at,
        )
        return TokenResponse(access_token=token, token_type="bearer", user=profile)

    async def get_profile(self, user_id: str) -> UserProfileResponse:
        user = await self.user_repo.get_with_wallet(user_id)
        if not user:
            raise AuthenticationException("User account not found.")

        balance = user.wallet.balance_ngn if user.wallet else 0.0
        return UserProfileResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            wallet_balance=balance,
            created_at=user.created_at,
        )


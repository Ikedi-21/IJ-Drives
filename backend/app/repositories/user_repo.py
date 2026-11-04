from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        normalized_email = email.strip().lower()
        result = await self.session.execute(
            select(User).where(User.email == normalized_email)
        )
        return result.scalars().first()

    async def get_with_wallet(self, user_id: str) -> Optional[User]:
        result = await self.session.execute(
            select(User)
            .options(selectinload(User.wallet))
            .where(User.id == user_id)
        )
        return result.scalars().first()

    async def email_exists(self, email: str) -> bool:
        user = await self.get_by_email(email)
        return user is not None


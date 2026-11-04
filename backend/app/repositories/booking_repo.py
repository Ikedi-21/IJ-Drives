from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.transport import Route
from app.repositories.base import BaseRepository


class BookingRepository(BaseRepository[Booking]):
    def __init__(self, session: AsyncSession):
        super().__init__(Booking, session)

    async def get_by_ref(self, ref: str) -> Optional[Booking]:
        result = await self.session.execute(
            select(Booking)
            .options(
                selectinload(Booking.route).selectinload(Route.provider)
            )
            .where(Booking.ref == ref.strip().upper())
        )
        return result.scalars().first()

    async def list_by_user(self, user_id: str, limit: int = 50) -> List[Booking]:
        result = await self.session.execute(
            select(Booking)
            .options(
                selectinload(Booking.route).selectinload(Route.provider)
            )
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())


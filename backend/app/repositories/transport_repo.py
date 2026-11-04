from typing import List, Optional
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transport import Provider, Route
from app.repositories.base import BaseRepository
from app.schemas.transport import RouteFilterParams


class TransportRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.provider_base = BaseRepository(Provider, session)
        self.route_base = BaseRepository(Route, session)

    async def get_provider_by_id(self, provider_id: str) -> Optional[Provider]:
        return await self.provider_base.get_by_id(provider_id)

    async def list_providers(self, mode: Optional[str] = None) -> List[Provider]:
        query = select(Provider)
        if mode:
            query = query.where(Provider.type == mode.lower())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_route_by_id(self, route_id: str) -> Optional[Route]:
        result = await self.session.execute(
            select(Route)
            .options(selectinload(Route.provider))
            .where(Route.id == route_id)
        )
        return result.scalars().first()

    async def get_route_by_id_for_update(self, route_id: str) -> Optional[Route]:
        query = select(Route).where(Route.id == route_id)
        bind = self.session.bind
        dialect_name = bind.dialect.name if bind else ""
        if dialect_name != "sqlite":
            query = query.with_for_update()

        result = await self.session.execute(query)
        return result.scalars().first()

    async def search_routes(self, filters: RouteFilterParams) -> List[Route]:
        query = select(Route).options(selectinload(Route.provider))

        if filters.mode:
            query = query.where(Route.mode == filters.mode.lower().strip())
        if filters.origin:
            query = query.where(Route.origin.ilike(f"%{filters.origin.strip()}%"))
        if filters.destination:
            query = query.where(Route.destination.ilike(f"%{filters.destination.strip()}%"))
        if filters.max_fare is not None and filters.max_fare > 0:
            query = query.where(Route.fare_ngn <= filters.max_fare)
        if filters.class_filter:
            query = query.where(Route.class_type.ilike(filters.class_filter.strip()))

        # Sorting
        if filters.sort_by == "price_asc":
            query = query.order_by(asc(Route.fare_ngn))
        elif filters.sort_by == "price_desc":
            query = query.order_by(desc(Route.fare_ngn))
        elif filters.sort_by == "duration_asc":
            query = query.order_by(asc(Route.duration_hrs))
        elif filters.sort_by == "duration_desc":
            query = query.order_by(desc(Route.duration_hrs))
        else:
            query = query.order_by(asc(Route.fare_ngn))

        result = await self.session.execute(query)
        return list(result.scalars().all())


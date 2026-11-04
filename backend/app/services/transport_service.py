from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException
from app.models.transport import Provider, Route
from app.repositories.transport_repo import TransportRepository
from app.schemas.transport import CoordsSchema, ProviderResponse, RouteFilterParams, RouteResponse


class TransportService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.transport_repo = TransportRepository(session)

    @staticmethod
    def _map_route(route: Route) -> RouteResponse:
        provider_resp = None
        if route.provider:
            provider_resp = ProviderResponse(
                id=route.provider.id,
                name=route.provider.name,
                type=route.provider.type,
                icon=route.provider.icon,
                rating=route.provider.rating,
                description=route.provider.description,
                founded=route.provider.founded,
            )

        days_list = [d.strip() for d in route.days_csv.split(",") if d.strip()]

        return RouteResponse(
            id=route.id,
            provider_id=route.provider_id,
            mode=route.mode,
            origin=route.origin,
            destination=route.destination,
            origin_coords=CoordsSchema(lat=route.origin_lat, lng=route.origin_lng),
            destination_coords=CoordsSchema(lat=route.dest_lat, lng=route.dest_lng),
            departure=route.departure,
            arrival=route.arrival,
            duration_hrs=route.duration_hrs,
            fare_ngn=route.fare_ngn,
            class_name=route.class_type,
            seats_available=route.available_seats,
            days=days_list,
            provider=provider_resp,
        )

    async def search_routes(self, filters: RouteFilterParams) -> List[RouteResponse]:
        routes = await self.transport_repo.search_routes(filters)
        return [self._map_route(r) for r in routes]

    async def get_route(self, route_id: str) -> RouteResponse:
        route = await self.transport_repo.get_route_by_id(route_id)
        if not route:
            raise EntityNotFoundException("Route", route_id)
        return self._map_route(route)

    async def list_providers(self, mode: Optional[str] = None) -> List[ProviderResponse]:
        providers = await self.transport_repo.list_providers(mode)
        return [
            ProviderResponse(
                id=p.id,
                name=p.name,
                type=p.type,
                icon=p.icon,
                rating=p.rating,
                description=p.description,
                founded=p.founded,
            )
            for p in providers
        ]

    async def get_provider(self, provider_id: str) -> ProviderResponse:
        p = await self.transport_repo.get_provider_by_id(provider_id)
        if not p:
            raise EntityNotFoundException("Provider", provider_id)
        return ProviderResponse(
            id=p.id,
            name=p.name,
            type=p.type,
            icon=p.icon,
            rating=p.rating,
            description=p.description,
            founded=p.founded,
        )


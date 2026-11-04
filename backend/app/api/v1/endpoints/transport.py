from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.common import StandardResponse
from app.schemas.transport import ProviderResponse, RouteFilterParams, RouteResponse
from app.services.transport_service import TransportService

router = APIRouter()


@router.get("/routes", response_model=StandardResponse[List[RouteResponse]])
async def search_routes(
    origin: Optional[str] = Query(None, description="Origin city e.g. Lagos"),
    destination: Optional[str] = Query(None, description="Destination city e.g. Abuja"),
    mode: Optional[str] = Query(None, description="Transport mode: land, rail, sea, air"),
    max_fare: Optional[float] = Query(None, description="Upper price limit in NGN"),
    class_filter: Optional[str] = Query(None, description="Class filter: Standard, Executive, etc."),
    sort_by: Optional[str] = Query(None, description="price_asc, price_desc, duration_asc, duration_desc"),
    session: AsyncSession = Depends(get_db),
):
    """Searches and filters multi-modal transport routes."""
    filters = RouteFilterParams(
        origin=origin,
        destination=destination,
        mode=mode,
        max_fare=max_fare,
        class_filter=class_filter,
        sort_by=sort_by,
    )
    service = TransportService(session)
    routes = await service.search_routes(filters)
    return StandardResponse.ok(routes)


@router.get("/routes/{route_id}", response_model=StandardResponse[RouteResponse])
async def get_route(route_id: str, session: AsyncSession = Depends(get_db)):
    """Retrieves route details with provider metadata."""
    service = TransportService(session)
    route = await service.get_route(route_id)
    return StandardResponse.ok(route)


@router.get("/providers", response_model=StandardResponse[List[ProviderResponse]])
async def list_providers(
    mode: Optional[str] = Query(None, description="Optional filter by transport mode"),
    session: AsyncSession = Depends(get_db),
):
    """Lists certified Nigerian transport operators and providers."""
    service = TransportService(session)
    providers = await service.list_providers(mode)
    return StandardResponse.ok(providers)


@router.get("/providers/{provider_id}", response_model=StandardResponse[ProviderResponse])
async def get_provider(provider_id: str, session: AsyncSession = Depends(get_db)):
    """Retrieves single provider metadata."""
    service = TransportService(session)
    provider = await service.get_provider(provider_id)
    return StandardResponse.ok(provider)

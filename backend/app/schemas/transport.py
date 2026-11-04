from typing import List, Optional
from pydantic import BaseModel, Field


class CoordsSchema(BaseModel):
    lat: float
    lng: float


class ProviderResponse(BaseModel):
    id: str
    name: str
    type: str
    icon: str
    rating: float
    description: Optional[str] = None
    founded: Optional[int] = None

    class Config:
        from_attributes = True


class RouteResponse(BaseModel):
    id: str
    provider_id: str
    mode: str
    origin: str
    destination: str
    origin_coords: CoordsSchema
    destination_coords: CoordsSchema
    departure: str
    arrival: str
    duration_hrs: float
    fare_ngn: float
    class_name: str = Field(alias="class")
    seats_available: int
    days: List[str]
    provider: Optional[ProviderResponse] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class RouteFilterParams(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    mode: Optional[str] = None  # land, sea, air, rail
    max_fare: Optional[float] = None
    class_filter: Optional[str] = None
    sort_by: Optional[str] = None  # price_asc, price_desc, duration_asc, duration_desc


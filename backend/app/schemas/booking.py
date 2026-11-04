from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.transport import ProviderResponse, RouteResponse


class PassengerDetails(BaseModel):
    full_name: str = Field(..., alias="fullName")
    email: EmailStr
    phone: str

    class Config:
        populate_by_name = True


class BookingCreateRequest(BaseModel):
    route_id: str
    passenger: PassengerDetails
    seat: Optional[str] = None
    class_choice: Optional[str] = Field(None, alias="class")
    travel_date: Optional[str] = None

    class Config:
        populate_by_name = True


class BookingResponse(BaseModel):
    id: str
    ref: str
    route_id: str
    mode: str
    passenger: PassengerDetails
    seat: Optional[str] = None
    class_choice: Optional[str] = Field(None, alias="class")
    fare: float
    status: str
    travel_date: str
    date: str
    route: Optional[RouteResponse] = None
    provider: Optional[ProviderResponse] = None

    class Config:
        populate_by_name = True
        from_attributes = True

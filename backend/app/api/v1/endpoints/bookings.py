from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.booking import BookingCreateRequest, BookingResponse
from app.schemas.common import StandardResponse
from app.services.booking_service import BookingService

router = APIRouter()


@router.post("", response_model=StandardResponse[BookingResponse], status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Executes an atomic booking:
    1. Validates seat availability and locks route row.
    2. Validates wallet balance and locks wallet row.
    3. Atomically debits fare, appends transaction ledger entry, and decrements route seat inventory.
    4. Generates unique reference (e.g. IJ-A3F2C1D0) and persists confirmed booking ticket.
    """
    service = BookingService(session)
    booking = await service.create_booking(current_user.id, payload)
    return StandardResponse.ok(booking)


@router.get("/my", response_model=StandardResponse[List[BookingResponse]])
async def list_my_bookings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Retrieves all past and active bookings for the logged-in user."""
    service = BookingService(session)
    bookings = await service.list_user_bookings(current_user.id)
    return StandardResponse.ok(bookings)


@router.get("/{ref}", response_model=StandardResponse[BookingResponse])
async def get_booking_by_reference(
    ref: str,
    session: AsyncSession = Depends(get_db),
):
    """Retrieves a booking receipt by unique booking reference."""
    service = BookingService(session)
    booking = await service.get_booking_by_ref(ref)
    return StandardResponse.ok(booking)


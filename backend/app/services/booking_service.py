import secrets
from datetime import datetime, timezone
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BusinessRuleViolationException,
    EntityNotFoundException,
    InsufficientWalletBalanceException,
    SeatUnavailableException,
)
from app.models.booking import Booking
from app.models.wallet import WalletTransaction
from app.repositories.booking_repo import BookingRepository
from app.repositories.transport_repo import TransportRepository
from app.repositories.wallet_repo import WalletRepository
from app.schemas.booking import BookingCreateRequest, BookingResponse, PassengerDetails
from app.services.transport_service import TransportService


def generate_booking_ref() -> str:
    """Generates unique booking reference e.g. IJ-A3F2C1D0."""
    return f"IJ-{secrets.token_hex(4).upper()}"


class BookingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.booking_repo = BookingRepository(session)
        self.transport_repo = TransportRepository(session)
        self.wallet_repo = WalletRepository(session)

    @staticmethod
    def _map_booking(booking: Booking) -> BookingResponse:
        route_resp = TransportService._map_route(booking.route) if booking.route else None
        provider_resp = route_resp.provider if route_resp else None

        passenger = PassengerDetails(
            fullName=booking.passenger_name,
            email=booking.passenger_email,
            phone=booking.passenger_phone,
        )

        return BookingResponse(
            id=booking.id,
            ref=booking.ref,
            route_id=booking.route_id,
            mode=booking.mode,
            passenger=passenger,
            seat=booking.seat_number,
            class_choice=booking.cabin_class,
            fare=booking.fare_paid_ngn,
            status=booking.status,
            travel_date=booking.travel_date,
            date=booking.created_at.isoformat() if booking.created_at else datetime.now(timezone.utc).isoformat(),
            route=route_resp,
            provider=provider_resp,
        )

    async def create_booking(self, user_id: str, payload: BookingCreateRequest) -> BookingResponse:
        # 1. Fetch & lock Route
        route = await self.transport_repo.get_route_by_id_for_update(payload.route_id)
        if not route:
            raise EntityNotFoundException("Route", payload.route_id)

        if route.available_seats <= 0:
            raise SeatUnavailableException(f"Route {route.id} has no available seats.")

        # Eager load provider name for receipt
        provider = await self.transport_repo.get_provider_by_id(route.provider_id)
        provider_name = provider.name if provider else "Transport Operator"

        # 2. Fetch & lock Wallet
        wallet = await self.wallet_repo.get_by_user_id_for_update(user_id)
        if not wallet:
            raise EntityNotFoundException("Wallet", f"user_id: {user_id}")

        if wallet.is_locked:
            raise BusinessRuleViolationException("Wallet is locked. Cannot process booking.")

        fare = route.fare_ngn
        if wallet.balance_ngn < fare:
            raise InsufficientWalletBalanceException(
                current_balance=wallet.balance_ngn,
                required_amount=fare,
            )

        # 3. Debit Wallet
        wallet.balance_ngn -= fare
        new_balance = wallet.balance_ngn

        description = f"{route.origin} → {route.destination} · {provider_name}"
        ref = generate_booking_ref()

        tx = WalletTransaction(
            wallet_id=wallet.id,
            type="debit",
            amount_ngn=fare,
            balance_after=new_balance,
            category="booking_payment",
            reference=f"PAY-{ref}",
            description=description,
        )
        await self.wallet_repo.add_transaction(tx)

        # 4. Decrement available seats
        route.available_seats -= 1

        # 5. Create Booking record
        travel_date = payload.travel_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
        booking = Booking(
            ref=ref,
            user_id=user_id,
            route_id=route.id,
            mode=route.mode,
            passenger_name=payload.passenger.full_name,
            passenger_email=payload.passenger.email,
            passenger_phone=payload.passenger.phone,
            seat_number=payload.seat,
            cabin_class=payload.class_choice or route.class_type,
            fare_paid_ngn=fare,
            status="confirmed",
            travel_date=travel_date,
        )
        await self.booking_repo.add(booking)

        # 6. Commit atomic transaction
        await self.session.commit()

        # Reload with relationships
        saved_booking = await self.booking_repo.get_by_ref(ref)
        return self._map_booking(saved_booking or booking)

    async def list_user_bookings(self, user_id: str) -> List[BookingResponse]:
        bookings = await self.booking_repo.list_by_user(user_id)
        return [self._map_booking(b) for b in bookings]

    async def get_booking_by_ref(self, ref: str) -> BookingResponse:
        booking = await self.booking_repo.get_by_ref(ref)
        if not booking:
            raise EntityNotFoundException("Booking", ref)
        return self._map_booking(booking)

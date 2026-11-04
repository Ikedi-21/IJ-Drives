from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, get_utc_now

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.transport import Route


class Booking(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Transport booking and ticket model."""
    __tablename__ = "bookings"

    ref: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # e.g. "IJ-A3F2C1D0"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    route_id: Mapped[str] = mapped_column(String(50), ForeignKey("routes.id", ondelete="RESTRICT"), index=True, nullable=False)

    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    passenger_name: Mapped[str] = mapped_column(String(255), nullable=False)
    passenger_email: Mapped[str] = mapped_column(String(255), nullable=False)
    passenger_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    seat_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cabin_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fare_paid_ngn: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="confirmed", index=True, nullable=False)
    travel_date: Mapped[str] = mapped_column(String(50), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="bookings")
    route: Mapped["Route"] = relationship("Route", back_populates="bookings")

    __table_args__ = (
        Index("ix_bookings_user_status", "user_id", "status"),
    )

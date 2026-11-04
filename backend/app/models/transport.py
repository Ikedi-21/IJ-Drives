from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.booking import Booking


class Provider(Base, TimestampMixin):
    """Transport operator/provider model."""
    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. "P001"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # land, sea, air, rail
    icon: Mapped[str] = mapped_column(String(100), default="fa-bus", nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=4.0, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    founded: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    routes: Mapped[List["Route"]] = relationship("Route", back_populates="provider", cascade="all, delete-orphan")


class Route(Base, TimestampMixin):
    """Transport route / journey model."""
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # e.g. "L001"
    provider_id: Mapped[str] = mapped_column(String(50), ForeignKey("providers.id", ondelete="CASCADE"), index=True, nullable=False)
    mode: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # land, sea, air, rail
    origin: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    destination: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lng: Mapped[float] = mapped_column(Float, nullable=False)
    dest_lat: Mapped[float] = mapped_column(Float, nullable=False)
    dest_lng: Mapped[float] = mapped_column(Float, nullable=False)
    departure: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g. "06:00"
    arrival: Mapped[str] = mapped_column(String(20), nullable=False)    # e.g. "15:00"
    duration_hrs: Mapped[float] = mapped_column(Float, nullable=False)
    fare_ngn: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    class_type: Mapped[str] = mapped_column(String(50), default="Standard", nullable=False)
    total_capacity: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    available_seats: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    days_csv: Mapped[str] = mapped_column(String(100), default="Mon,Tue,Wed,Thu,Fri,Sat,Sun", nullable=False)

    provider: Mapped["Provider"] = relationship("Provider", back_populates="routes")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="route")

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin, get_utc_now

if TYPE_CHECKING:
    from app.models.user import User


class Wallet(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User wallet model."""
    __tablename__ = "wallets"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    balance_ngn: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="NGN", nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="wallet")
    transactions: Mapped[List["WalletTransaction"]] = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan", order_by="desc(WalletTransaction.created_at)")


class WalletTransaction(Base, UUIDPrimaryKeyMixin):
    """Financial transaction ledger entry."""
    __tablename__ = "wallet_transactions"

    wallet_id: Mapped[str] = mapped_column(String(36), ForeignKey("wallets.id", ondelete="CASCADE"), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # credit | debit
    amount_ngn: Mapped[float] = mapped_column(Float, nullable=False)
    balance_after: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # welcome_bonus, deposit, booking_payment, refund
    reference: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=get_utc_now, nullable=False)

    wallet: Mapped["Wallet"] = relationship("Wallet", back_populates="transactions")

    __table_args__ = (
        Index("ix_wallet_tx_wallet_created", "wallet_id", "created_at"),
    )

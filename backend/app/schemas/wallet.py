from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.core.config import settings


class DepositRequest(BaseModel):
    amount: float = Field(
        ...,
        ge=settings.MIN_DEPOSIT_NGN,
        le=settings.MAX_DEPOSIT_NGN,
        description=f"Deposit amount between ₦{settings.MIN_DEPOSIT_NGN:,.0f} and ₦{settings.MAX_DEPOSIT_NGN:,.0f}",
    )


class TransactionResponse(BaseModel):
    id: str
    type: str  # credit | debit
    amount: float
    balance: float
    category: str
    reference: str
    description: str
    date: datetime

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    currency: str
    is_locked: bool

    class Config:
        from_attributes = True


class WalletSummaryResponse(BaseModel):
    balance: float
    currency: str
    transactions: List[TransactionResponse]


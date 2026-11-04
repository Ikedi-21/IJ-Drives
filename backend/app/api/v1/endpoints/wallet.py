from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import StandardResponse
from app.schemas.wallet import DepositRequest, WalletSummaryResponse
from app.services.wallet_service import WalletService

router = APIRouter()


@router.get("", response_model=StandardResponse[WalletSummaryResponse])
async def get_wallet_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Retrieves current wallet balance and transaction ledger for the authenticated user."""
    service = WalletService(session)
    summary = await service.get_wallet_summary(current_user.id)
    return StandardResponse.ok(summary)


@router.post("/deposit", response_model=StandardResponse[WalletSummaryResponse])
async def deposit_funds(
    payload: DepositRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Credits funds to the user's wallet with atomic transaction logging."""
    service = WalletService(session)
    updated_summary = await service.deposit(current_user.id, payload)
    return StandardResponse.ok(updated_summary)

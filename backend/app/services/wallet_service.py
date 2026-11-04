import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BusinessRuleViolationException, EntityNotFoundException
from app.models.wallet import WalletTransaction
from app.repositories.wallet_repo import WalletRepository
from app.schemas.wallet import DepositRequest, TransactionResponse, WalletSummaryResponse


class WalletService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.wallet_repo = WalletRepository(session)

    async def deposit(self, user_id: str, payload: DepositRequest) -> WalletSummaryResponse:
        amount = payload.amount
        if amount < settings.MIN_DEPOSIT_NGN:
            raise BusinessRuleViolationException(
                f"Minimum deposit is ₦{settings.MIN_DEPOSIT_NGN:,.2f}."
            )
        if amount > settings.MAX_DEPOSIT_NGN:
            raise BusinessRuleViolationException(
                f"Maximum deposit is ₦{settings.MAX_DEPOSIT_NGN:,.2f}."
            )

        # Atomic lock on the wallet row
        wallet = await self.wallet_repo.get_by_user_id_for_update(user_id)
        if not wallet:
            raise EntityNotFoundException("Wallet", f"user_id: {user_id}")

        if wallet.is_locked:
            raise BusinessRuleViolationException("Wallet is temporarily locked. Please contact support.")

        wallet.balance_ngn += amount
        new_balance = wallet.balance_ngn

        tx = WalletTransaction(
            wallet_id=wallet.id,
            type="credit",
            amount_ngn=amount,
            balance_after=new_balance,
            category="deposit",
            reference=f"DEP-{uuid.uuid4().hex[:10].upper()}",
            description="Wallet Top-up",
        )
        await self.wallet_repo.add_transaction(tx)
        await self.session.commit()

        return await self.get_wallet_summary(user_id)

    async def get_wallet_summary(self, user_id: str) -> WalletSummaryResponse:
        wallet = await self.wallet_repo.get_by_user_id(user_id)
        if not wallet:
            raise EntityNotFoundException("Wallet", f"user_id: {user_id}")

        transactions = await self.wallet_repo.get_transactions(wallet.id)
        tx_responses = [
            TransactionResponse(
                id=tx.id,
                type=tx.type,
                amount=tx.amount_ngn,
                balance=tx.balance_after,
                category=tx.category,
                reference=tx.reference,
                description=tx.description,
                date=tx.created_at,
            )
            for tx in transactions
        ]

        return WalletSummaryResponse(
            balance=wallet.balance_ngn,
            currency=wallet.currency,
            transactions=tx_responses,
        )

    async def get_balance(self, user_id: str) -> float:
        wallet = await self.wallet_repo.get_by_user_id(user_id)
        return wallet.balance_ngn if wallet else 0.0

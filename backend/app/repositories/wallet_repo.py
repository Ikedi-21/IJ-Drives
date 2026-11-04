from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet import Wallet, WalletTransaction
from app.repositories.base import BaseRepository


class WalletRepository(BaseRepository[Wallet]):
    def __init__(self, session: AsyncSession):
        super().__init__(Wallet, session)

    async def get_by_user_id(self, user_id: str) -> Optional[Wallet]:
        result = await self.session.execute(
            select(Wallet)
            .options(selectinload(Wallet.transactions))
            .where(Wallet.user_id == user_id)
        )
        return result.scalars().first()

    async def get_by_user_id_for_update(self, user_id: str) -> Optional[Wallet]:
        """Locks the wallet row for update within an active transaction."""
        query = select(Wallet).where(Wallet.user_id == user_id)
        # SQLite does not support FOR UPDATE syntax; PostgreSQL does
        bind = self.session.bind
        dialect_name = bind.dialect.name if bind else ""
        if dialect_name != "sqlite":
            query = query.with_for_update()

        result = await self.session.execute(query)
        return result.scalars().first()

    async def add_transaction(self, tx: WalletTransaction) -> WalletTransaction:
        self.session.add(tx)
        await self.session.flush()
        return tx

    async def get_transactions(self, wallet_id: str, limit: int = 50) -> List[WalletTransaction]:
        result = await self.session.execute(
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet_id)
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

import asyncio
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.transport import Provider, Route
from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver/api/v1") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def authenticated_user(db_session: AsyncSession):
    """Creates a pre-verified user with a ₦10,000 wallet balance and returns their token."""
    user = User(
        email="testrider@ijdrives.ng",
        full_name="Chidi Mokeme",
        hashed_password=get_password_hash("securepass123"),
        role="rider",
    )
    db_session.add(user)
    await db_session.flush()

    wallet = Wallet(
        user_id=user.id,
        balance_ngn=10000.0,
        currency="NGN",
    )
    db_session.add(wallet)
    await db_session.flush()

    tx = WalletTransaction(
        wallet_id=wallet.id,
        type="credit",
        amount_ngn=10000.0,
        balance_after=10000.0,
        category="welcome_bonus",
        reference="TXN-TEST-INIT",
        description="Test Welcome Bonus",
    )
    db_session.add(tx)
    await db_session.commit()

    token = create_access_token(
        subject=user.id,
        claims={"email": user.email, "role": user.role},
    )
    return {"user": user, "wallet": wallet, "token": token}


@pytest_asyncio.fixture(scope="function")
async def sample_route(db_session: AsyncSession):
    """Seeds a sample test route."""
    provider = Provider(
        id="P_TEST",
        name="Test Transit",
        type="land",
        icon="fa-bus",
        rating=4.8,
        description="Fast and reliable test buses",
        founded=2020,
    )
    db_session.add(provider)
    await db_session.flush()

    route = Route(
        id="L_TEST_01",
        provider_id=provider.id,
        mode="land",
        origin="Lagos",
        destination="Ibadan",
        origin_lat=6.5244,
        origin_lng=3.3792,
        dest_lat=7.3775,
        dest_lng=3.9470,
        departure="07:00",
        arrival="09:30",
        duration_hrs=2.5,
        fare_ngn=3500.0,
        class_type="Standard",
        total_capacity=10,
        available_seats=10,
        days_csv="Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    )
    db_session.add(route)
    await db_session.commit()
    return route


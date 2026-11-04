import asyncio
import json
import logging
from pathlib import Path
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, init_db
from app.core.security import get_password_hash
from app.models.transport import Provider, Route
from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ijdrives_seeder")


def find_data_dir() -> Path:
    """Finds the data directory containing providers.json and route JSONs."""
    current = Path(__file__).resolve().parent
    candidates = [
        current.parent.parent.parent / "data",  # /backend/app/data_seeds -> /data
        current.parent.parent / "data",
        Path.cwd() / "data",
        Path.cwd() / "Final project" / "ijdrives_fixed" / "data",
    ]
    for candidate in candidates:
        if candidate.exists() and (candidate / "providers.json").exists():
            return candidate
    raise FileNotFoundError("Could not find the JSON data directory containing providers.json")


def load_json(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists():
        logger.warning(f"Seed file not found: {file_path}")
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def seed_providers(session: AsyncSession, data_dir: Path) -> None:
    result = await session.execute(select(Provider).limit(1))
    if result.scalars().first():
        logger.info("Providers table already contains records. Skipping seed.")
        return

    providers_data = load_json(data_dir / "providers.json")
    for item in providers_data:
        provider = Provider(
            id=item["id"],
            name=item["name"],
            type=item.get("type", "land"),
            icon=item.get("icon", "fa-bus"),
            rating=float(item.get("rating", 4.0)),
            description=item.get("description", ""),
            founded=item.get("founded"),
        )
        session.add(provider)
    await session.commit()
    logger.info(f"Seeded {len(providers_data)} transport providers.")


async def seed_routes(session: AsyncSession, data_dir: Path) -> None:
    result = await session.execute(select(Route).limit(1))
    if result.scalars().first():
        logger.info("Routes table already contains records. Skipping seed.")
        return

    mode_files = [
        ("land", "land.json"),
        ("rail", "rail.json"),
        ("sea", "sea.json"),
        ("air", "air.json"),
    ]

    total_routes = 0
    for mode, filename in mode_files:
        route_list = load_json(data_dir / filename)
        for item in route_list:
            origin_coords = item.get("origin_coords", {})
            dest_coords = item.get("destination_coords", {})
            days_list = item.get("days", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])

            route = Route(
                id=item["id"],
                provider_id=item["provider_id"],
                mode=mode,
                origin=item["origin"],
                destination=item["destination"],
                origin_lat=float(origin_coords.get("lat", 0.0)),
                origin_lng=float(origin_coords.get("lng", 0.0)),
                dest_lat=float(dest_coords.get("lat", 0.0)),
                dest_lng=float(dest_coords.get("lng", 0.0)),
                departure=item.get("departure", "08:00"),
                arrival=item.get("arrival", "12:00"),
                duration_hrs=float(item.get("duration_hrs", 1.0)),
                fare_ngn=float(item.get("fare_ngn", 5000.0)),
                class_type=item.get("class", "Standard"),
                total_capacity=int(item.get("seats_available", 30)),
                available_seats=int(item.get("seats_available", 30)),
                days_csv=",".join(days_list) if isinstance(days_list, list) else str(days_list),
            )
            session.add(route)
            total_routes += 1

    await session.commit()
    logger.info(f"Seeded {total_routes} routes across land, rail, sea, and air.")


async def seed_demo_user(session: AsyncSession) -> None:
    demo_email = "demo@ijdrives.ng"
    result = await session.execute(select(User).where(User.email == demo_email))
    if result.scalars().first():
        logger.info("Demo user already exists.")
        return

    user = User(
        email=demo_email,
        full_name="Ifeoma Okafor",
        hashed_password=get_password_hash("password123"),
        role="rider",
    )
    session.add(user)
    await session.flush()

    # Pre-seed demo wallet with welcome bonus
    wallet = Wallet(
        user_id=user.id,
        balance_ngn=15000.0,
        currency="NGN",
    )
    session.add(wallet)
    await session.flush()

    tx = WalletTransaction(
        wallet_id=wallet.id,
        type="credit",
        amount_ngn=15000.0,
        balance_after=15000.0,
        category="welcome_bonus",
        reference="TXN-DEMO-INIT",
        description="Demo Account Activation Credit",
    )
    session.add(tx)
    await session.commit()
    logger.info(f"Created demo user: {demo_email} (password: password123) with ₦15,000.00 wallet balance.")


async def run_seed() -> None:
    logger.info("Initializing database tables...")
    await init_db()
    data_dir = find_data_dir()
    logger.info(f"Found transport data at: {data_dir}")

    async with AsyncSessionLocal() as session:
        await seed_providers(session, data_dir)
        await seed_routes(session, data_dir)
        await seed_demo_user(session)

    logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    asyncio.run(run_seed())

